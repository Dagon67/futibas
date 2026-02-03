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
                msg = typeof raw === "string" ? raw : (raw ? JSON.stringify(raw) : msg);
            } catch (_) {
                if (text && text.length < 500) msg = text;
            }
            if (typeof msg !== "string") msg = String(msg);
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
        console.log("💡 Certifique-se de que o serviço Flask está rodando (python sheets/app.py)");
        return { success: false, error: error.message };
    }
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
