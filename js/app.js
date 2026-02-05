/* ===========================
   🚀 INICIALIZAÇÃO DA APLICAÇÃO
   =========================== */

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
            .finally(function () { goHome(); });
    } else {
        goHome();
    }
}
// Em produção, acordar o backend (Render) em background para reduzir 502 no primeiro sync
if (typeof wakeBackendIfNeeded === "function") wakeBackendIfNeeded();
// Inicializar (carrega jogadores do servidor se vazio, depois mostra home)
initDefaultPlayersThenHome();

// Limpar intervalo ao sair da página
window.addEventListener('beforeunload', function(){
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
});
