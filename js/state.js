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
