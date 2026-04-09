/* ===========================
   💾 STORAGE (MAGNUS) - Firestore
   ===========================
   Objetivo: manter o app separado por tenant sem depender de Sheets.

   Importante:
   - Para manter compatibilidade com as telas existentes, mantemos a mesma API:
     loadPlayers/savePlayers/loadTrainings/saveTrainings/loadResponses/saveResponses,
     loadQuestions/saveQuestions, clearAllAppStorage, clearTrainingsAndResponses.
   - Persistimos no Firestore em:
     tenants/{tenantId}/roster/current
     tenants/{tenantId}/trainingExports/{trainingId}
*/

;(function () {
    // Evita erro de redeclare caso o script seja injetado/ativado mais de uma vez
    // (ex.: admin troca tenant sem reload de página).
    if (typeof window !== "undefined") {
        if (window.__TUTEM_MAGNUS_STORAGE_LOADED__) return;
        window.__TUTEM_MAGNUS_STORAGE_LOADED__ = true;
    }

    const FIRESTORE_SDK = "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// Jogadores padrão (fallback quando roster/current estiver vazio)
const defaultPlayers = [
    // Elenco atual/recente (Magnus)
    { id: "magnus_p1", number: 1, name: "André Deko", position: "Goleiro", lateralidade: null },
    { id: "magnus_p2", number: 2, name: "Gustavo Pagliari", position: "Goleiro", lateralidade: null },
    { id: "magnus_p3", number: 3, name: "Ian", position: "Goleiro", lateralidade: null },
    { id: "magnus_p4", number: 4, name: "Leandro", position: "Goleiro", lateralidade: null },
    { id: "magnus_p5", number: 5, name: "Kaique S.", position: "Goleiro", lateralidade: null },

    { id: "magnus_p6", number: 6, name: "Rodrigo Capita", position: "Fixo", lateralidade: null },
    { id: "magnus_p7", number: 7, name: "Lucas Gomes", position: "Fixo", lateralidade: null },
    { id: "magnus_p8", number: 8, name: "Mancine", position: "Fixo", lateralidade: null },
    { id: "magnus_p9", number: 9, name: "Kaio Marinho", position: "Fixo", lateralidade: null },
    { id: "magnus_p10", number: 10, name: "Vagner", position: "Fixo", lateralidade: null },

    { id: "magnus_p11", number: 11, name: "Leandro Lino", position: "Ala", lateralidade: null },
    { id: "magnus_p12", number: 12, name: "Alejo Gayraud", position: "Ala", lateralidade: null },
    { id: "magnus_p13", number: 13, name: "Witamá", position: "Ala", lateralidade: null },
    { id: "magnus_p14", number: 14, name: "Dieguinho", position: "Ala", lateralidade: null },
    { id: "magnus_p15", number: 15, name: "Joãozinho", position: "Ala", lateralidade: null },
    { id: "magnus_p16", number: 16, name: "Pepita", position: "Ala", lateralidade: null },
    { id: "magnus_p17", number: 17, name: "Luis Antonioli", position: "Ala", lateralidade: null },
    { id: "magnus_p18", number: 18, name: "Marcelinho", position: "Ala", lateralidade: null },

    { id: "magnus_p19", number: 19, name: "Genaro", position: "Pivô", lateralidade: null },
    { id: "magnus_p20", number: 20, name: "Leozin", position: "Pivô", lateralidade: null },
    { id: "magnus_p21", number: 21, name: "Bruno Andrade (Bruninho)", position: "Pivô", lateralidade: null },
    { id: "magnus_p22", number: 22, name: "Kauê", position: "Pivô", lateralidade: null }
];

const brazilDefaultPlayers = [
    { id: "br_p1", number: 1, name: "Willian (Norlisk)", position: "Goleiro", lateralidade: null },
    { id: "br_p2", number: 2, name: "Matheus (JEC)", position: "Goleiro", lateralidade: null },
    { id: "br_p3", number: 3, name: "Nicolas (Jaraguá)", position: "Goleiro", lateralidade: null },
    { id: "br_p4", number: 4, name: "Neguinho (Barcelona/Palma)", position: "Fixo", lateralidade: null },
    { id: "br_p5", number: 5, name: "Marlon (Selangor/ElPozo)", position: "Fixo", lateralidade: null },
    { id: "br_p6", number: 6, name: "Lucas Gomes (Magnus)", position: "Fixo", lateralidade: null },
    { id: "br_p7", number: 7, name: "Marcel (El Pozo)", position: "Ala", lateralidade: null },
    { id: "br_p8", number: 8, name: "Dyego (Al-Ula/Barcelona)", position: "Ala", lateralidade: null },
    { id: "br_p9", number: 9, name: "Fabinho (Palma)", position: "Ala", lateralidade: null },
    { id: "br_p10", number: 10, name: "Arthur (Benfica)", position: "Ala", lateralidade: null },
    { id: "br_p11", number: 11, name: "Felipe Valério (Sporting)", position: "Ala", lateralidade: null },
    { id: "br_p12", number: 12, name: "Pito (Barcelona)", position: "Pivô", lateralidade: null },
    { id: "br_p13", number: 13, name: "Rafa Santos (El Pozo)", position: "Pivô", lateralidade: null },
    { id: "br_p14", number: 14, name: "Rocha (Sporting)", position: "Pivô", lateralidade: null }
];

const defaultQuestions = {
    pre: [
        { tipo: "nota", texto: "Qualidade Total de Recuperação", opcoes: [], imagem: "pre/recupera.png", notaMin: 1, notaMax: 20 },
        { tipo: "nota", texto: "Nível de fadiga", opcoes: [], imagem: "pre/fadiga.jpg", notaMin: 1, notaMax: 5 },
        { tipo: "nota", texto: "Nível de sono", opcoes: [], imagem: "pre/sono.jpg", notaMin: 1, notaMax: 5 },
        { tipo: "nota", texto: "Nível de dor", opcoes: [], imagem: "pre/dor.jpg", notaMin: 1, notaMax: 5 },
        { tipo: "nota", texto: "Nível de estresse", opcoes: [], imagem: "pre/estresse.jpg", notaMin: 1, notaMax: 5 },
        { tipo: "nota", texto: "Nível de humor", opcoes: [], imagem: "pre/humor.jpg", notaMin: 1, notaMax: 5 },
        { tipo: "corpo", texto: "Pontos de dor", opcoes: [], imagem: null },
        { tipo: "checkbox", texto: "Pontos de dor articular", opcoes: ["Sem dor", "1", "2", "3", "4", "5", "6", "7", "8", "9"], imagem: "pre/articula.png" }
    ],
    post: [
        { tipo: "nota", texto: "Estado atual", opcoes: [], imagem: "pos/esforço.png", notaMax: 10 },
        { tipo: "duracao", texto: "Quanto tempo de treino foi feito?", opcoes: [], imagem: null }
    ]
};

// localStorage só para perguntas (opcional). Magnus mantém chave legada; outros tenants Firestore têm chave própria.
function getQuestionsLsKey() {
    var tid = (typeof window !== "undefined" && window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId)
        ? String(window.__TUTEM_TENANT__.tenantId)
        : "magnus";
    if (tid === "magnus") return "magnus_treino_questions";
    return "tutem_firestore_questions_" + tid.replace(/[^a-z0-9_-]/gi, "_");
}

let cachePlayers = [];
let cacheTrainings = []; // apenas trainings "ativos" (status !== "completed")
let initPromise = null;

function getTenantFirestoreContext() {
    const tenant = typeof window !== "undefined" ? window.__TUTEM_TENANT__ : null;
    const db = typeof window !== "undefined" ? window.__TUTEM_FIREBASE_DB__ : null;
    if (!tenant || !tenant.tenantId || !db) return null;
    return { tenantId: tenant.tenantId, db: db };
}

function stripLargePhotosDeep(obj, depth) {
    depth = depth || 0;
    if (depth > 40 || obj == null) return;
    if (Array.isArray(obj)) {
        obj.forEach(function (item) { stripLargePhotosDeep(item, depth + 1); });
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

function cloneTrainingForExport(training) {
    // Training é um objeto serializável (localStorage model). Vamos apenas remover "photo" base64 muito grande.
    const copy = JSON.parse(JSON.stringify(training || {}));
    stripLargePhotosDeep(copy);
    return copy;
}

function cloneQuestionsForExport() {
    const qsRaw = typeof loadQuestions === "function" ? loadQuestions() : defaultQuestions;
    const copy = JSON.parse(JSON.stringify(qsRaw || defaultQuestions));
    stripLargePhotosDeep(copy);
    return copy;
}

async function persistRosterToFirestore(players) {
    const ctx = getTenantFirestoreContext();
    if (!ctx) return;
    const firestore = await import(FIRESTORE_SDK);
    const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
    await firestore.setDoc(
        ref,
        { updatedAt: firestore.serverTimestamp(), players: players || [] },
        { merge: true }
    );
}

async function persistTrainingToFirestore(training) {
    const ctx = getTenantFirestoreContext();
    if (!ctx || !training || !training.id) return;
    const firestore = await import(FIRESTORE_SDK);
    const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "trainingExports", String(training.id));
    const pair = {
        training: cloneTrainingForExport(training),
        questionsAtExport: { pre: (cloneQuestionsForExport().pre || []), post: (cloneQuestionsForExport().post || []) }
    };
    await firestore.setDoc(
        ref,
        { updatedAt: firestore.serverTimestamp(), trainingId: String(training.id), ...pair },
        { merge: true }
    );
}

async function loadRosterFromFirestore() {
    const ctx = getTenantFirestoreContext();
    if (!ctx) return [];
    try {
        const firestore = await import(FIRESTORE_SDK);
        const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
        const snap = await firestore.getDoc(ref);
        if (!snap.exists()) return [];
        const data = snap.data() || {};
        const players = data.players;
        if (Array.isArray(players)) return players;
        // compat: às vezes pode ser objeto {id: {...}}
        if (players && typeof players === "object") return Object.values(players);
        return [];
    } catch (e) {
        console.warn("MAGNUS: falha ao carregar roster/current:", e);
        return [];
    }
}

async function loadActiveTrainingsFromFirestore() {
    const ctx = getTenantFirestoreContext();
    if (!ctx) return [];
    try {
        const firestore = await import(FIRESTORE_SDK);
        const colRef = firestore.collection(ctx.db, "tenants", ctx.tenantId, "trainingExports");
        const snap = await firestore.getDocs(colRef);

        const out = [];
        snap.forEach(function (docSnap) {
            const data = docSnap.data() || {};
            const training = data.training || {};
            if (!training || typeof training !== "object") return;
            // Incluir finalizados (acompanhamento/analytics precisam do histórico); lista de treinos filtra na UI.
            out.push(training);
        });

        // ordena por datetime (mais recente primeiro) quando existir
        out.sort(function (a, b) {
            const ad = a.datetime || a.date || "";
            const bd = b.datetime || b.date || "";
            return new Date(bd) - new Date(ad);
        });
        return out;
    } catch (e) {
        console.warn("MAGNUS: falha ao carregar trainingExports:", e);
        return [];
    }
}

async function initMagnusStorage(force) {
    if (force) initPromise = null;
    if (initPromise && !force) return initPromise;
    initPromise = (async function () {
        cachePlayers = await loadRosterFromFirestore();
        cacheTrainings = await loadActiveTrainingsFromFirestore();
    })();
    return initPromise;
}

window.initMagnusStorage = initMagnusStorage;

function loadPlayers() {
    return cachePlayers || [];
}

function savePlayers(players) {
    cachePlayers = Array.isArray(players) ? players : [];
    // Persistência assíncrona (fire-and-forget) para não travar a UI.
    persistRosterToFirestore(cachePlayers).catch(function (err) {
        console.warn("MAGNUS: falha ao persistir roster:", err);
    });
}

function loadQuestions() {
    try {
        const raw = localStorage.getItem(getQuestionsLsKey());
        if (!raw) return defaultQuestions;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.pre || !parsed.post) return defaultQuestions;
        return parsed;
    } catch (e) {
        return defaultQuestions;
    }
}

function saveQuestions(qs) {
    try {
        localStorage.setItem(getQuestionsLsKey(), JSON.stringify(qs || defaultQuestions));
    } catch (e) {}
}

function loadTrainings() {
    return cacheTrainings || [];
}

function saveTrainings(trainings) {
    if (!Array.isArray(trainings)) return;
    cacheTrainings = trainings;

    // Persistir só o que está no array recebido (não deletar nada do Firestore).
    trainings.forEach(function (t) {
        persistTrainingToFirestore(t).catch(function (err) {
            console.warn("MAGNUS: falha ao persistir training:", err);
        });
    });
}

function loadResponses() {
    // Derivadas dos trainings ativos (compat com o app).
    const out = [];
    (cacheTrainings || []).forEach(function (t) {
        const mode = t.mode || null;
        const trainingId = t.id || null;
        const trainingDate = t.dateFormatted || t.date || null;
        (t.responses || []).forEach(function (r) {
            out.push(Object.assign({}, r, {
                mode: mode,
                trainingId: trainingId,
                trainingDate: trainingDate
            }));
        });
    });
    return out;
}

function saveResponses(_responses) {
    // As respostas reais já estão dentro de training.responses (saveTrainings persiste).
    // Mantemos para compatibilidade.
}

function playersListNeedsSheetsPush() {
    return false;
}
function markPlayersListNeedsSheetsPush() {}
function clearPlayersListNeedsSheetsPush() {}

function clearAllAppStorage() {
    // Não apagamos Firestore aqui; só limpamos o estado do app.
    cachePlayers = [];
    cacheTrainings = [];
    try {
        localStorage.removeItem(getQuestionsLsKey());
    } catch (e) {}
    if (typeof initPromise !== "undefined") initPromise = null;
    return true;
}

function cancelSyncDebounce() {}

function clearTrainingsAndResponses() {
    // Mantém o padrão do app (limpa o "ativo" para recomeçar).
    cacheTrainings = [];
}

/* ===========================
   Stubs compatíveis com as telas
   (para o app não quebrar por falta de sheets_sync.js)
   =========================== */

async function fetchPlayersFromSheets() {
    // Mesma semântica do Jaraguá, mas lendo Firestore.
    await initMagnusStorage();
    return { success: true, players: loadPlayers() };
}

async function pushPlayersToSheets() {
    // Persistido via savePlayers; mantemos apenas retorno compat.
    await initMagnusStorage();
    return { success: true };
}

async function syncAllToSheets() {
    // No Magnus, os saves já persistem em Firestore; aqui é só compat.
    await initMagnusStorage();
    return { success: true };
}

async function syncSingleTrainingToSheets(_trainingId) {
    // No Jaraguá, esta função serve para exportar para Sheets e, depois disso,
    // o app remove o treino da lista local. No Magnus, fazemos o "equivalente":
    // marcamos como "completed" no Firestore para não voltar como treino ativo.
    const trainingId = _trainingId != null ? String(_trainingId) : null;
    if (!trainingId) return { success: false, error: "trainingId ausente" };

    await initMagnusStorage();

    try {
        var t = (cacheTrainings || []).find(function (x) { return String(x.id) === trainingId; });
        if (!t) {
            return { success: true };
        }

        if (t.status !== "completed") t.status = "completed";
        if (!t.completedAt) {
            t.completedAt = (typeof nowTimestamp === "function" ? nowTimestamp() : new Date().toISOString());
        }

        await persistTrainingToFirestore(t);
    } catch (e) {
        console.warn("MAGNUS: syncSingleTrainingToSheets falhou:", e);
        return { success: false, error: String(e && e.message ? e.message : e) };
    }

    return { success: true };
}

// ==========
// Helper: abrir Campin a partir do Magnus (sem Sheets)
// ==========
function isMagnusApp() {
    try {
        if (typeof window === "undefined") return false;
        if (window.__TUTEM_APP_MODE__ === "magnus") return true;
        if (window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId === "magnus") return true;
        const params = new URLSearchParams(window.location.search || "");
        return params.get("app") === "magnus" || params.get("tenant") === "magnus";
    } catch (e) {
        return false;
    }
}

const CAMPIN_PLAYERS_LS_KEY = "tutem_campin_players";
function goCampinForMagnus() {
    if (!isMagnusApp()) return;

    try {
        // Usa roster do Firestore mais recente (via cache refresh) para o campin
        // não precisar buscar do backend (que é Sheets no Jaraguá).
        (async function () {
            try {
                if (typeof initMagnusStorage === "function") {
                    await initMagnusStorage(true);
                }
                const players = typeof loadPlayers === "function" ? loadPlayers() : [];
                localStorage.setItem(CAMPIN_PLAYERS_LS_KEY, JSON.stringify(players || []));
            } catch (e) {}
            continueToCampin();
        })();
        return;
    } catch (e) {}

    function continueToCampin() {
        const nowIso = new Date().toISOString();
        const tenantId = (window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId) ? window.__TUTEM_TENANT__.tenantId : "magnus";
        const backend = (typeof window.BACKEND_URL === "string") ? window.BACKEND_URL : "";

        const params = new URLSearchParams();
        params.set("datetime", nowIso);
        var teamLabel = tenantId === "magnus" ? "Magnus" : (tenantId === "brazil" ? "Seleção Brasileira de Futsal" : tenantId);
        params.set("team", teamLabel);
        if (backend) params.set("backend", backend);
        params.set("app", "magnus");
        params.set("tenant", tenantId);

        window.location.href = "campin/campin.html?" + params.toString();
    }
}

// Exposição global (algumas telas chamam funções por nome)
window.loadPlayers = loadPlayers;
window.savePlayers = savePlayers;
window.loadQuestions = loadQuestions;
window.saveQuestions = saveQuestions;
window.loadTrainings = loadTrainings;
window.saveTrainings = saveTrainings;
window.loadResponses = loadResponses;
window.saveResponses = saveResponses;
window.clearAllAppStorage = clearAllAppStorage;
window.clearTrainingsAndResponses = clearTrainingsAndResponses;

// Campin redirect helper (usado após finalizar treino no Magnus)
window.goCampinForMagnus = goCampinForMagnus;

// Defaults por tenant (bootstrap em app-magnus.js)
window.__tutemMagnusDefaultPlayers = function () {
    var tid = (typeof window !== "undefined" && window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId)
        ? window.__TUTEM_TENANT__.tenantId
        : null;
    if (tid === "brazil") return brazilDefaultPlayers;
    return defaultPlayers;
};
window.__MAGNUS_DEFAULT_PLAYERS__ = defaultPlayers;
window.__MAGNUS_DEFAULT_QUESTIONS__ = defaultQuestions;

})();
