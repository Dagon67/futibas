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
    settingsTab: "questionsPre"     // questionsPre | questionsPost | data
};

// Ao iniciar rodada de coleta, pendingByMode[mode] recebe os jogadores selecionados
function resetPendingForMode(mode){
    state.pendingByMode[mode] = [...state.selectedPlayerIds];
}

const RESUME_STATE_KEY = "treino_resume_state";

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
        localStorage.setItem(RESUME_STATE_KEY, JSON.stringify(payload));
    } catch (e) { console.warn("saveResumeState:", e); }
}

function loadResumeState(){
    try {
        var raw = localStorage.getItem(RESUME_STATE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function clearResumeState(){
    try { localStorage.removeItem(RESUME_STATE_KEY); } catch (e) {}
}
