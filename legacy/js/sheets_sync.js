/* ===========================
   📊 SINCRONIZAÇÃO COM GOOGLE SHEETS
   =========================== */

// Detectar URL do backend automaticamente
// Em desenvolvimento: localhost:5000
// Em produção: usar variável de ambiente ou URL configurada
function getBackendUrl() {
    // Se estiver rodando em produção, use a URL do backend hospedado
    // Você pode configurar isso como variável de ambiente ou constante
    const PROD_BACKEND_URL = window.BACKEND_URL || ''; // Configure no HTML: <script>window.BACKEND_URL = 'https://seu-backend.onrender.com';</script>
    
    // Se não estiver em localhost, assume produção
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return PROD_BACKEND_URL || 'https://futibas.onrender.com';
    }
    
    // Desenvolvimento local
    return 'http://localhost:5000';
}

const BACKEND_BASE_URL = getBackendUrl();
const FIRESTORE_SDK = "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const SHEETS_SYNC_URL = `${BACKEND_BASE_URL}/sync`;
const SHEETS_SYNC_ALL_URL = `${BACKEND_BASE_URL}/sync/all`;
const SHEETS_SYNC_TRAINING_URL = `${BACKEND_BASE_URL}/sync/training`;

// Flag para habilitar/desabilitar sincronização
let sheetsSyncEnabled = true;

/** Aviso visual no ecrã (Sheets / Firestore) */
function ensureSyncToastStyles() {
    if (typeof document === "undefined" || document.getElementById("tutem-sync-toast-styles")) return;
    var s = document.createElement("style");
    s.id = "tutem-sync-toast-styles";
    s.textContent =
        ".tutem-sync-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);z-index:99999;max-width:min(92vw,440px);padding:14px 20px;border-radius:14px;font-weight:600;font-size:clamp(0.95rem,2vw,1.05rem);text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.45);border:2px solid #feec02;background:#0a0a0a;color:#feec02;transition:transform .28s ease,opacity .28s ease;opacity:0;pointer-events:none;line-height:1.35;}" +
        ".tutem-sync-toast--show{transform:translateX(-50%) translateY(0);opacity:1;}" +
        ".tutem-sync-toast--error{border-color:#f87171;color:#fecaca;}" +
        ".tutem-sync-toast--info{border-color:#94a3b8;color:#e2e8f0;}";
    document.head.appendChild(s);
}

function showSyncToast(text, kind) {
    if (typeof document === "undefined" || !document.body) return;
    ensureSyncToastStyles();
    kind = kind || "success";
    var el = document.createElement("div");
    el.className = "tutem-sync-toast tutem-sync-toast--" + kind;
    el.setAttribute("role", "status");
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
        el.classList.add("tutem-sync-toast--show");
    });
    setTimeout(function () {
        el.classList.remove("tutem-sync-toast--show");
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 320);
    }, 4500);
}

// Debounce: várias chamadas em sequência viram 1 sync "tudo" para não estourar quota (60 writes/min)
const SYNC_DEBOUNCE_MS = 3000;
let _syncDebounceTimer = null;

/**
 * Clona dados para o Firestore; remove fotos base64 muito grandes (limite ~1MB por documento).
 */
function cloneDataForFirestoreSnapshot(allData) {
    try {
        var raw = JSON.stringify(allData);
        if (raw.length < 800000) {
            return JSON.parse(raw);
        }
    } catch (e) {}
    var out = {
        players: [],
        trainings: allData.trainings || [],
        responses: allData.responses || [],
        questions: allData.questions || { pre: [], post: [] }
    };
    (allData.players || []).forEach(function (p) {
        var o = Object.assign({}, p);
        if (o.photo && typeof o.photo === "string" && o.photo.length > 8000) {
            o.photoOmitted = true;
            delete o.photo;
        }
        out.players.push(o);
    });
    return out;
}

/** @returns {{ tenantId: string, db: object } | null } */
function getTenantFirestoreContext() {
    var tenant = typeof window !== "undefined" ? window.__TUTEM_TENANT__ : null;
    var db = typeof window !== "undefined" ? window.__TUTEM_FIREBASE_DB__ : null;
    if (!tenant || !tenant.tenantId || !db) return null;
    return { tenantId: tenant.tenantId, db: db };
}

/** Remove fotos base64 grandes em qualquer profundidade (treino + respostas). */
function stripLargePhotosDeep(obj, depth) {
    depth = depth || 0;
    if (depth > 40 || obj == null) return;
    if (Array.isArray(obj)) {
        obj.forEach(function (item) {
            stripLargePhotosDeep(item, depth + 1);
        });
        return;
    }
    if (typeof obj !== "object") return;
    if (obj.photo && typeof obj.photo === "string" && obj.photo.length > 8000) {
        obj.photoOmitted = true;
        delete obj.photo;
    }
    Object.keys(obj).forEach(function (k) {
        stripLargePhotosDeep(obj[k], depth + 1);
    });
}

/**
 * Payload para um doc em trainingExports/{trainingId} — espelha “uma linha lógica” por treino (como no Sheets).
 */
function cloneTrainingExportPayload(training, questions) {
    var t = JSON.parse(JSON.stringify(training));
    stripLargePhotosDeep(t);
    var q = JSON.parse(JSON.stringify(questions || { pre: [], post: [] }));
    stripLargePhotosDeep(q);
    return { training: t, questionsAtExport: q };
}

/** Um documento por treino: agrega/atualiza só esse treino (não reescreve o resto). */
async function saveTrainingExportToFirestore(training, questions) {
    var ctx = getTenantFirestoreContext();
    if (!ctx || !training || !training.id) return { skipped: true };
    var firestore = await import(FIRESTORE_SDK);
    var pair = cloneTrainingExportPayload(training, questions);
    var ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "trainingExports", training.id);
    await firestore.setDoc(
        ref,
        {
            updatedAt: firestore.serverTimestamp(),
            trainingId: training.id,
            training: pair.training,
            questionsAtExport: pair.questionsAtExport
        },
        { merge: true }
    );
    console.log("✅ Firestore trainingExports/" + training.id + " atualizado");
    return { ok: true };
}

/** Plantel atual num único doc (como uma aba “Jogadores”). */
async function saveRosterToFirestore(players) {
    var ctx = getTenantFirestoreContext();
    if (!ctx) return { skipped: true };
    var payload = cloneDataForFirestoreSnapshot({
        players: players || [],
        trainings: [],
        responses: [],
        questions: { pre: [], post: [] }
    });
    var firestore = await import(FIRESTORE_SDK);
    var ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
    await firestore.setDoc(
        ref,
        {
            updatedAt: firestore.serverTimestamp(),
            players: payload.players
        },
        { merge: true }
    );
    console.log("✅ Firestore roster/current atualizado");
    return { ok: true };
}

/** Registo append-only (histórico de exportações) para dashboards / auditoria. */
async function appendExportEventFirestore(kind, extra) {
    var ctx = getTenantFirestoreContext();
    if (!ctx) return { skipped: true };
    var firestore = await import(FIRESTORE_SDK);
    var col = firestore.collection(ctx.db, "tenants", ctx.tenantId, "exportEvents");
    var data = Object.assign({ createdAt: firestore.serverTimestamp(), kind: kind }, extra || {});
    await firestore.addDoc(col, data);
    return { ok: true };
}

/** Após sync completo: grava cada treino no seu doc + plantel (batches ≤450 ops). */
async function saveAllTrainingExportsAndRosterToFirestore(allData) {
    var ctx = getTenantFirestoreContext();
    if (!ctx) return { skipped: true };
    var firestore = await import(FIRESTORE_SDK);
    var questions = allData.questions || { pre: [], post: [] };
    var trainings = allData.trainings || [];
    var batch = firestore.writeBatch(ctx.db);
    var opCount = 0;
    async function commitBatch() {
        if (opCount === 0) return;
        await batch.commit();
        batch = firestore.writeBatch(ctx.db);
        opCount = 0;
    }
    for (var i = 0; i < trainings.length; i++) {
        var training = trainings[i];
        if (!training || !training.id) continue;
        if (opCount >= 450) await commitBatch();
        var ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "trainingExports", training.id);
        var pair = cloneTrainingExportPayload(training, questions);
        batch.set(
            ref,
            {
                updatedAt: firestore.serverTimestamp(),
                trainingId: training.id,
                training: pair.training,
                questionsAtExport: pair.questionsAtExport
            },
            { merge: true }
        );
        opCount++;
    }
    if (opCount >= 450) await commitBatch();
    var rosterRef = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
    var pl = cloneDataForFirestoreSnapshot({
        players: allData.players || [],
        trainings: [],
        responses: [],
        questions: { pre: [], post: [] }
    });
    batch.set(
        rosterRef,
        { updatedAt: firestore.serverTimestamp(), players: pl.players },
        { merge: true }
    );
    opCount++;
    await commitBatch();
    console.log(
        "✅ Firestore: " +
            trainings.length +
            " treino(s) em trainingExports + roster/current"
    );
    return { ok: true };
}

/** Mesmo payload que o sync/all envia ao Sheets. */
function getAllDataForSnapshot() {
    return {
        players: typeof loadPlayers === "function" ? loadPlayers() : [],
        trainings: typeof loadTrainings === "function" ? loadTrainings() : [],
        responses: typeof loadResponses === "function" ? loadResponses() : [],
        questions: typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] }
    };
}

async function writeFirestoreAfterTrainingSync(training, questions, showToast) {
    showToast = showToast !== false;
    try {
        var fsResult = await saveTrainingExportToFirestore(training, questions);
        if (fsResult && fsResult.skipped) {
            if (showToast) showSyncToast("Firestore: não gravado (sem sessão Firebase).", "info");
            return;
        }
        var resp = training.responses || [];
        await appendExportEventFirestore("training_sync", {
            trainingId: training.id,
            mode: training.mode || null,
            responseCount: resp.length
        });
        if (showToast) {
            showSyncToast("Firestore: dados do treino agregados (coleção trainingExports).", "success");
        }
    } catch (err) {
        console.warn("⚠️ Firestore (treino):", err);
        if (showToast) {
            showSyncToast("Firestore: falhou — " + (err && err.message ? err.message : String(err)), "error");
        }
    }
}

async function writeFirestoreAfterRosterSync(players, showToast) {
    showToast = showToast !== false;
    try {
        var fsResult = await saveRosterToFirestore(players);
        if (fsResult && fsResult.skipped) {
            if (showToast) showSyncToast("Firestore: não gravado (sem sessão Firebase).", "info");
            return;
        }
        await appendExportEventFirestore("roster_sync", {
            playerCount: (players || []).length
        });
        if (showToast) {
            showSyncToast("Firestore: plantel agregado (roster/current).", "success");
        } else {
            console.log("✅ Firestore roster atualizado (silencioso).");
        }
    } catch (err) {
        console.warn("⚠️ Firestore (plantel):", err);
        if (showToast) {
            showSyncToast("Firestore: falhou — " + (err && err.message ? err.message : String(err)), "error");
        }
    }
}

async function writeFirestoreAfterFullSync(allData, showToast) {
    showToast = showToast !== false;
    try {
        var fsResult = await saveAllTrainingExportsAndRosterToFirestore(allData);
        if (fsResult && fsResult.skipped) {
            if (showToast) showSyncToast("Firestore: não gravado (sem sessão Firebase).", "info");
            return;
        }
        await appendExportEventFirestore("full_sync", {
            trainingCount: (allData.trainings || []).length,
            playerCount: (allData.players || []).length
        });
        if (showToast) {
            showSyncToast("Firestore: treinos e plantel agregados (trainingExports + roster).", "success");
        }
    } catch (err) {
        console.warn("⚠️ Firestore (sync completo):", err);
        if (showToast) {
            showSyncToast("Firestore: falhou — " + (err && err.message ? err.message : String(err)), "error");
        }
    }
}

/** Cancela o sync agendado (útil antes de "Limpar treinos" para não reenviar depois). */
function cancelSyncDebounce() {
    if (_syncDebounceTimer) {
        clearTimeout(_syncDebounceTimer);
        _syncDebounceTimer = null;
    }
}

/**
 * Sincroniza dados com Google Sheets (com debounce: agenda 1 sync "tudo" após 3 s)
 * @param {string} type - Tipo de dado: 'players', 'trainings', 'responses', 'questions'
 * @param {any} data - Dados a serem sincronizados
 * @param {object} questions - Perguntas (necessário apenas para 'responses')
 */
function syncToSheets(type, data, questions = null) {
    if (!sheetsSyncEnabled) {
        console.log("📊 Sincronização com Sheets desabilitada");
        return Promise.resolve();
    }
    if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
    _syncDebounceTimer = setTimeout(function () {
        _syncDebounceTimer = null;
        syncAllToSheets().catch(function (err) { console.error("Erro ao sincronizar:", err); });
    }, SYNC_DEBOUNCE_MS);
    return Promise.resolve();
}

/**
 * Sincroniza todos os dados de uma vez (1 request, backend faz batch por aba = poucas writes na API)
 */
async function syncAllToSheets() {
    if (!sheetsSyncEnabled) {
        console.log("📊 Sincronização com Sheets desabilitada");
        return;
    }
    try {
        const allData = getAllDataForSnapshot();
        const numTrainings = (allData.trainings || []).length;
        const numResponses = (allData.responses || []).length;
        const preResponses = (allData.trainings || []).filter(function(t){ return t.mode === "pre"; }).reduce(function(acc, t){ return acc + (t.responses || []).length; }, 0);
        console.debug("[SHEETS] Enviando sync: " + numTrainings + " treino(s), " + numResponses + " resposta(s) no array, " + preResponses + " resposta(s) pré nos treinos");
        const response = await fetch(SHEETS_SYNC_ALL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        });
        if (!response.ok) {
            let msg = "Erro desconhecido";
            const text = await response.text();
            try {
                const body = JSON.parse(text);
                const raw = body && (body.error ?? body.message);
                msg = typeof raw === "string" ? raw : (raw ? JSON.stringify(raw) : text || msg);
            } catch (_) {
                if (text && text.length < 500) msg = text;
            }
            if (typeof msg !== "string") msg = String(msg);
            if (response.status === 502) {
                msg = "502 Bad Gateway: o servidor (ex.: Render) pode estar iniciando ou indisponível. Aguarde 1–2 min e tente de novo.";
                console.log("💡 Se abriu o app por arquivo local (file://), use um servidor local (ex.: npx serve .) para evitar CORS com origin null.");
            }
            console.error("❌ Erro ao sincronizar todos os dados: " + msg);
            if (msg.indexOf("429") !== -1 || msg.indexOf("RATE_LIMIT") !== -1 || msg.indexOf("Quota exceeded") !== -1) {
                console.log("💡 Limite do Google Sheets (60 writes/min). Aguarde ~1 minuto e tente de novo.");
            }
            return { success: false, error: msg };
        }
        const result = await response.json();
        console.log("✅ Todos os dados sincronizados com sucesso");
        showSyncToast("Google Sheets: exportado com sucesso.", "success");
        await writeFirestoreAfterFullSync(allData, true);
        return result;
    } catch (error) {
        console.error("❌ Erro ao conectar com serviço de sincronização:", error);
        var hint = "Certifique-se de que o backend está rodando (local: cd backend/legacy && python app.py). ";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
            hint += "Abriu por file:// — use um servidor local (ex.: npx serve . ou Live Server) para evitar CORS (origin null). ";
        }
        if (String(error.message || "").indexOf("fetch") !== -1 || String(error.message || "").indexOf("Failed") !== -1) {
            hint += "Se o backend está no Render, pode estar acordando (502); aguarde 1–2 min e tente de novo.";
        }
        console.log("💡 " + hint);
        return { success: false, error: error.message };
    }
}

/**
 * Sincroniza apenas as respostas de um treino específico com o Sheets (não envia outros treinos/respostas).
 */
async function syncSingleTrainingToSheets(trainingId) {
    if (!sheetsSyncEnabled) {
        console.log("📊 Sincronização com Sheets desabilitada");
        return;
    }
    try {
        const trainings = typeof loadTrainings === "function" ? loadTrainings() : [];
        const training = trainings.find(function (t) { return t.id === trainingId; });
        if (!training) {
            console.warn("[SHEETS] Treino não encontrado:", trainingId);
            return { success: false, error: "Treino não encontrado" };
        }
        // Garantir dados do treino (período, data formatada) para a aba Treinos no Sheets
        const trainingToSend = {
            ...training,
            dateFormatted: training.dateFormatted || training.date,
            datetime: training.datetime || (training.date ? training.date + "T12:00:00.000Z" : new Date().toISOString()),
            period: training.period != null ? training.period : null
        };
        const questions = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
        const payload = { training: trainingToSend, questions: questions };
        const response = await fetch(SHEETS_SYNC_TRAINING_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text();
            let msg = text;
            try { var b = JSON.parse(text); msg = b.error || b.message || text; } catch (_) {}
            console.error("❌ Erro ao sincronizar treino:", msg);
            return { success: false, error: msg };
        }
        const result = await response.json();
        console.log("✅ Treino " + trainingId + " sincronizado com o Sheets");
        await writeFirestoreAfterTrainingSync(trainingToSend, questions, true);
        return result;
    } catch (error) {
        console.error("❌ Erro ao conectar:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Acorda o backend no Render em produção (ping /health em background).
 * No plano gratuito o serviço dorme após ~15 min; ao abrir o app já disparamos um request
 * para ele começar a acordar, assim quando o usuário clicar em Sincronizar pode já estar pronto.
 */
function wakeBackendIfNeeded() {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
    var url = (typeof getBackendUrl === "function" ? getBackendUrl() : (window.BACKEND_URL || "")) + "/health";
    if (!url || url === "/health") return;
    fetch(url, { method: "GET" }).catch(function () {});
}

/**
 * Verifica se o serviço está disponível
 */
async function checkSheetsService() {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Habilita ou desabilita a sincronização
 */
function setSheetsSyncEnabled(enabled) {
    sheetsSyncEnabled = enabled;
    console.log(`📊 Sincronização com Sheets: ${enabled ? 'habilitada' : 'desabilitada'}`);
}

/**
 * Busca a lista de jogadores do Sheets e atualiza o localStorage.
 * Chamado automaticamente ao digitar a senha principal (entrar no app).
 */
async function fetchPlayersFromSheets() {
    if (!sheetsSyncEnabled) return { success: false, error: "Sincronização desabilitada" };
    try {
        const response = await fetch(BACKEND_BASE_URL + "/players", { method: "GET" });
        if (!response.ok) {
            const text = await response.text();
            console.warn("[SHEETS] Falha ao buscar jogadores:", text);
            return { success: false, error: text || response.statusText };
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.players) && typeof savePlayers === "function") {
            var local = typeof loadPlayers === "function" ? loadPlayers() : [];
            var localById = {};
            local.forEach(function (p) {
                if (p && p.id) localById[p.id] = p;
            });
            result.players.forEach(function (p) {
                if (!p || !p.id) return;
                if (typeof normalizePlayerPhotoUrl === "function" && p.photo) {
                    p.photo = normalizePlayerPhotoUrl(p.photo);
                } else if (p.photo && typeof p.photo === "string" && p.photo.indexOf("/") === 0) {
                    var b = typeof getBackendUrl === "function" ? getBackendUrl() : window.BACKEND_URL || "";
                    if (b) p.photo = b.replace(/\/$/, "") + p.photo;
                }
                if (!p.photo && localById[p.id] && localById[p.id].photo) {
                    p.photo = localById[p.id].photo;
                    if (typeof normalizePlayerPhotoUrl === "function") {
                        p.photo = normalizePlayerPhotoUrl(p.photo);
                    }
                }
            });
            var sheetsIds = {};
            result.players.forEach(function (p) { sheetsIds[p.id] = true; });
            var onlyLocal = local.filter(function (p) { return p && p.id && !sheetsIds[p.id]; });
            var merged = result.players.concat(onlyLocal);
            savePlayers(merged);
            console.log("✅ Lista de jogadores atualizada do Sheets (" + result.players.length + " do Sheets, " + onlyLocal.length + " só locais = " + merged.length + " total)");
            await writeFirestoreAfterRosterSync(merged, false);
            return { success: true, players: merged };
        }
        return result;
    } catch (error) {
        console.warn("[SHEETS] Erro ao buscar jogadores:", error);
        return { success: false, error: error && error.message ? error.message : String(error) };
    }
}

/**
 * Envia a lista de jogadores do localStorage para o Sheets (aba Jogadores).
 * Use o botão "Atualizar lista de jogadores" nas configurações.
 */
async function pushPlayersToSheets() {
    if (!sheetsSyncEnabled) return { success: false, error: "Sincronização desabilitada" };
    try {
        const players = typeof loadPlayers === "function" ? loadPlayers() : [];
        const response = await fetch(BACKEND_BASE_URL + "/sync/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ players: players })
        });
        if (!response.ok) {
            const text = await response.text();
            console.error("[SHEETS] Falha ao enviar jogadores:", text);
            return { success: false, error: text || response.statusText };
        }
        const result = await response.json();
        if (result.success) {
            console.log("✅ Lista de jogadores enviada para o Sheets (" + players.length + " jogadores)");
            await writeFirestoreAfterRosterSync(players, true);
        }
        return result;
    } catch (error) {
        console.error("[SHEETS] Erro ao enviar jogadores:", error);
        return { success: false, error: error && error.message ? error.message : String(error) };
    }
}
