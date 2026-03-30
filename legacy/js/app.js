/* ===========================
   🚀 INICIALIZAÇÃO DA APLICAÇÃO
   =========================== */

window.__IMAGE_VERSION = Date.now();

// Saída de emergência: ?clearCampin=1 limpa jogo travado e mostra o menu
(function () {
    try {
        if (typeof window !== "undefined" && window.location && (window.location.search.indexOf("clearCampin=1") !== -1 || window.location.search.indexOf("clearCampin=1&") !== -1)) {
            localStorage.removeItem("tutem_campin_game_in_progress");
            localStorage.removeItem("tutem_campin_saved_state");
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, "", window.location.pathname || "index.html");
            }
        }
    } catch (e) {}
})();

// Só neste aparelho: redirecionar ao Campin se existir estado salvo local com partida não encerrada.
// Outro dispositivo sem esse localStorage não é redirecionado (pode usar o menu / dash tático com dados no Sheets).
(function sanitizeCampinLocalStorage() {
    try {
        var flag = localStorage.getItem("tutem_campin_game_in_progress");
        var raw = localStorage.getItem("tutem_campin_saved_state");
        if (flag === "1" && !raw) {
            localStorage.removeItem("tutem_campin_game_in_progress");
            return;
        }
        if (raw) {
            var p = JSON.parse(raw);
            if (!p || p.matchEnded === true || p.started !== true) {
                localStorage.removeItem("tutem_campin_game_in_progress");
                localStorage.removeItem("tutem_campin_saved_state");
            }
        }
    } catch (e) {
        try {
            localStorage.removeItem("tutem_campin_game_in_progress");
            localStorage.removeItem("tutem_campin_saved_state");
        } catch (e2) {}
    }
})();

var redirectToCampinIfGameInProgress = (function () {
    try {
        if (localStorage.getItem("tutem_campin_game_in_progress") !== "1") return false;
        var raw = localStorage.getItem("tutem_campin_saved_state");
        if (!raw) return false;
        var p = JSON.parse(raw);
        if (!p || !p.started || p.matchEnded === true) return false;
        window.location.replace("campin/campin.html");
        return true;
    } catch (e) {}
    return false;
})();

function tryRestoreResumeState() {
    var saved = typeof loadResumeState === "function" ? loadResumeState() : null;
    if (!saved || !saved.currentScreen) return false;
    var lockEl = document.getElementById("lock-screen");
    var appShell = document.getElementById("app-shell");
    if (lockEl) lockEl.setAttribute("data-unlocked", "true");
    function showAppAndRestore() {
        if (appShell) appShell.style.display = "flex";
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
            return;
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
        }
    }
    setTimeout(showAppAndRestore, 0);
    return true;
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
// Arranque da app só depois de Firebase + senha do painel (ver index.html / startTutemApp)
function startTutemApp() {
    if (window.__tutemAppStarted) return;
    window.__tutemAppStarted = true;
    if (typeof wakeBackendIfNeeded === "function") wakeBackendIfNeeded();
    if (!redirectToCampinIfGameInProgress) initDefaultPlayersThenHome();
}
window.startTutemApp = startTutemApp;

window.addEventListener('beforeunload', function(){
    if (window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    if (typeof saveResumeState === "function") saveResumeState();
});
