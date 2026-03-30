/* ===========================
   🚀 BOOTSTRAP (MAGNUS)
   Inicializa caches carregando do Firestore e só então arranca o app.
   =========================== */

(function () {
    function isMagnusMode() {
        try {
            var params = new URLSearchParams(window.location.search || "");
            return params.get("app") === "magnus";
        } catch (e) {
            return false;
        }
    }

    async function startTutemApp() {
        if (window.__tutemAppStarted) return;
        window.__tutemAppStarted = true;

        if (!isMagnusMode()) {
            // fallback: não deveria acontecer
            if (typeof window.goHome === "function") window.goHome();
            return;
        }

        try {
            if (typeof window.initMagnusStorage !== "function") {
                console.warn("MAGNUS: initMagnusStorage não encontrado.");
            } else {
                await window.initMagnusStorage();
            }

            // Se não houver roster salvo, inicializar com defaults.
            if (typeof window.loadPlayers === "function") {
                var players = window.loadPlayers() || [];
                if (players.length === 0) {
                    // defaultPlayers está no storage-magnus.js no escopo do módulo.
                    // Para não acoplar, tentamos persistir através da mesma assinatura via global opcional.
                    if (typeof window.__MAGNUS_DEFAULT_PLAYERS__ !== "undefined") {
                        window.savePlayers(window.__MAGNUS_DEFAULT_PLAYERS__);
                    } else if (typeof window.savePlayers === "function" && typeof window.defaultPlayers !== "undefined") {
                        window.savePlayers(window.defaultPlayers);
                    }
                }
            }
        } catch (err) {
            console.error("MAGNUS: erro ao iniciar storage:", err);
        }

        // Redesenhar Home.
        if (typeof window.goHome === "function") {
            try {
                window.goHome();
            } catch (e) {
                console.warn("MAGNUS: goHome falhou:", e);
            }
        }
    }

    window.startTutemApp = startTutemApp;
})();

