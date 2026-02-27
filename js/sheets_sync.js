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
const SHEETS_SYNC_URL = `${BACKEND_BASE_URL}/sync`;
const SHEETS_SYNC_ALL_URL = `${BACKEND_BASE_URL}/sync/all`;
const SHEETS_SYNC_TRAINING_URL = `${BACKEND_BASE_URL}/sync/training`;

// Flag para habilitar/desabilitar sincronização
let sheetsSyncEnabled = true;

// Debounce: várias chamadas em sequência viram 1 sync "tudo" para não estourar quota (60 writes/min)
const SYNC_DEBOUNCE_MS = 3000;
let _syncDebounceTimer = null;

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
        const allData = {
            players: typeof loadPlayers === "function" ? loadPlayers() : [],
            trainings: typeof loadTrainings === "function" ? loadTrainings() : [],
            responses: typeof loadResponses === "function" ? loadResponses() : [],
            questions: typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] }
        };
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
        return result;
    } catch (error) {
        console.error("❌ Erro ao conectar com serviço de sincronização:", error);
        var hint = "Certifique-se de que o backend está rodando (local: python sheets/app.py). ";
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
            var sheetsIds = {};
            result.players.forEach(function (p) { sheetsIds[p.id] = true; });
            var onlyLocal = local.filter(function (p) { return p && p.id && !sheetsIds[p.id]; });
            var merged = result.players.concat(onlyLocal);
            savePlayers(merged);
            console.log("✅ Lista de jogadores atualizada do Sheets (" + result.players.length + " do Sheets, " + onlyLocal.length + " só locais = " + merged.length + " total)");
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
        if (result.success) console.log("✅ Lista de jogadores enviada para o Sheets (" + players.length + " jogadores)");
        return result;
    } catch (error) {
        console.error("[SHEETS] Erro ao enviar jogadores:", error);
        return { success: false, error: error && error.message ? error.message : String(error) };
    }
}
