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

/**
 * Sincroniza dados com Google Sheets
 * @param {string} type - Tipo de dado: 'players', 'trainings', 'responses', 'questions'
 * @param {any} data - Dados a serem sincronizados
 * @param {object} questions - Perguntas (necessário apenas para 'responses')
 */
async function syncToSheets(type, data, questions = null) {
    if (!sheetsSyncEnabled) {
        console.log("📊 Sincronização com Sheets desabilitada");
        return;
    }

    try {
        const payload = {
            type: type,
            data: data,
            questions: questions
        };

        const response = await fetch(SHEETS_SYNC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`❌ Erro ao sincronizar ${type}:`, error);
            return { success: false, error: error.error || "Erro desconhecido" };
        }

        const result = await response.json();
        console.log(`✅ ${type} sincronizado com sucesso`);
        return result;
    } catch (error) {
        console.error(`❌ Erro ao conectar com serviço de sincronização:`, error);
        console.log("💡 Certifique-se de que o serviço Flask está rodando (python sheets/app.py)");
        return { success: false, error: error.message };
    }
}

/**
 * Sincroniza todos os dados de uma vez
 */
async function syncAllToSheets() {
    if (!sheetsSyncEnabled) {
        console.log("📊 Sincronização com Sheets desabilitada");
        return;
    }

    try {
        const allData = {
            players: loadPlayers(),
            trainings: loadTrainings(),
            responses: loadResponses(),
            questions: loadQuestions()
        };

        const response = await fetch(SHEETS_SYNC_ALL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allData)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("❌ Erro ao sincronizar todos os dados:", error);
            return { success: false, error: error.error || "Erro desconhecido" };
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
