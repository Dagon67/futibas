/* ===========================
   🚀 INICIALIZAÇÃO DA APLICAÇÃO
   =========================== */

window.__IMAGE_VERSION = Date.now();

function tryRestoreResumeState() {
    var saved = typeof loadResumeState === "function" ? loadResumeState() : null;
    if (!saved || !saved.currentScreen) return false;
    var lockEl = document.getElementById("lock-screen");
    if (lockEl) lockEl.setAttribute("data-unlocked", "true");
    if (saved.currentScreen === "questionnaire" && saved.currentTrainingId && saved.currentPlayerId) {
        state.currentScreen = saved.currentScreen;
        state.currentMode = saved.currentMode;
        state.currentTrainingId = saved.currentTrainingId;
        state.currentPlayerId = saved.currentPlayerId;
        state.selectedPlayerIds = saved.selectedPlayerIds || [];
        state.pendingByMode = saved.pendingByMode || { pre: [], post: [] };
        state.cameFromScreen = saved.cameFromScreen;
        state.tempAnswers = saved.tempAnswers || {};
        state.currentQuestionTexts = saved.currentQuestionTexts;
        if (state.currentMode) setHeaderModeLabel(state.currentMode === "pre" ? "Pré Treino" : "Pós Treino");
        goQuestionnaire();
        return true;
    }
    if (saved.currentScreen === "selectPlayer" && saved.currentMode) {
        state.currentScreen = saved.currentScreen;
        state.currentMode = saved.currentMode;
        state.currentTrainingId = saved.currentTrainingId;
        state.selectedPlayerIds = saved.selectedPlayerIds || [];
        state.pendingByMode = saved.pendingByMode || { pre: [], post: [] };
        state.currentPlayerId = null;
        state.tempAnswers = {};
        setHeaderModeLabel(saved.currentMode === "pre" ? "Pré Treino" : "Pós Treino");
        goSelectPlayer(saved.currentMode);
        return true;
    }
    return false;
}

// Carregar lista padrão de jogadores (com fotos) do servidor quando não houver dados no localStorage
function initDefaultPlayersThenHome() {
    var players = typeof loadPlayers === "function" ? loadPlayers() : [];
    if (!players || players.length === 0) {
        fetch("jogadores.json")
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (Array.isArray(data) && data.length > 0 && typeof savePlayers === "function") {
                    savePlayers(data);
                } else if (typeof savePlayers === "function" && typeof defaultPlayers !== "undefined") {
                    savePlayers(defaultPlayers);
                }
            })
            .catch(function () {
                if (typeof savePlayers === "function" && typeof defaultPlayers !== "undefined") savePlayers(defaultPlayers);
            })
            .finally(function () {
                if (!tryRestoreResumeState()) goHome();
            });
    } else {
        if (!tryRestoreResumeState()) goHome();
    }
}
// Em produção, acordar o backend (Render) em background para reduzir 502 no primeiro sync
if (typeof wakeBackendIfNeeded === "function") wakeBackendIfNeeded();
// Inicializar (carrega jogadores do servidor se vazio, depois mostra home)
initDefaultPlayersThenHome();

window.addEventListener('beforeunload', function(){
    if (window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    if (typeof saveResumeState === "function") saveResumeState();
});
