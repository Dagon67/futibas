/* ===========================
   🔁 ESTADO / STATE MANAGEMENT
   =========================== */

// helpers de estado em memória
let state = {
    currentScreen: "home",     // home | chooseMode | selectPlayers | selectPlayer | questionnaire | settings | trainingsList | trainingDetails
    currentMode: null,         // "pre" | "post" | null
    currentTrainingId: null,   // id do treino atual
    selectedPlayerIds: [],    // jogadores selecionados para este treino
    currentPlayerId: null,     // id jogador atual respondendo
    tempAnswers: {},           // respostas atuais antes de salvar
    currentQuestionTexts: null, // textos das perguntas da tela atual (mesma ordem do questionário aberto)
    cameFromScreen: null,      // tela de onde veio para o questionário (para saber para onde voltar)
    // controle de quem já respondeu nesta rodada:
    pendingByMode: {
        pre: [],
        post: []
    },
    settingsTab: "questionsPre",     // questionsPre | questionsPost | data
    /** Plantel no pré/pós treino: profissional | sub20 */
    rosterCategoriaFilter: "profissional"
};

// Ao iniciar rodada de coleta, pendingByMode[mode] recebe os jogadores selecionados
function resetPendingForMode(mode){
    state.pendingByMode[mode] = [...state.selectedPlayerIds];
}

function getResumeStateKey() {
    try {
        if (typeof window !== "undefined" && window.__TUTEM_SHEETS_MODE__ === "none") {
            var tid = window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId ? String(window.__TUTEM_TENANT__.tenantId) : "";
            if (tid === "brazil") return "brazil_treino_resume_state";
            if (tid === "magnus") return "magnus_treino_resume_state";
        }
    } catch (e) {}
    return "treino_resume_state";
}

function saveResumeState(){
    try {
        var s = state;
        if (s.currentScreen !== "questionnaire" && s.currentScreen !== "selectPlayer") return;
        var payload = {
            currentScreen: s.currentScreen,
            currentMode: s.currentMode,
            currentTrainingId: s.currentTrainingId,
            currentPlayerId: s.currentPlayerId,
            selectedPlayerIds: s.selectedPlayerIds || [],
            pendingByMode: s.pendingByMode ? { pre: (s.pendingByMode.pre || []).slice(), post: (s.pendingByMode.post || []).slice() } : { pre: [], post: [] },
            cameFromScreen: s.cameFromScreen,
            tempAnswers: s.tempAnswers ? JSON.parse(JSON.stringify(s.tempAnswers)) : {},
            currentQuestionTexts: s.currentQuestionTexts || null
        };
        localStorage.setItem(getResumeStateKey(), JSON.stringify(payload));
    } catch (e) { console.warn("saveResumeState:", e); }
}

function loadResumeState(){
    try {
        var raw = localStorage.getItem(getResumeStateKey());
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function clearResumeState(){
    try { localStorage.removeItem(getResumeStateKey()); } catch (e) {}
}
