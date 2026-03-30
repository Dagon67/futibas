/* ===========================
   🚀 BOOTSTRAP (MAGNUS)
   Inicializa caches carregando do Firestore e só então arranca o app.
   =========================== */

(function () {
    function isMagnusMode() {
        try {
            var params = new URLSearchParams(window.location.search || "");
            if (params.get("app") === "magnus") return true;
            if (window.__TUTEM_APP_MODE__ === "magnus") return true;
            if (window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId === "magnus") return true;
            return false;
        } catch (e) {
            return false;
        }
    }

    async function startTutemApp() {
        // Magnus precisa recarregar o roster/current ao destrancar (para refletir mudanças).
        // Usamos um guard separado para não bloquear re-import.

        if (!isMagnusMode()) {
            // fallback: não deveria acontecer
            if (typeof window.goHome === "function") window.goHome();
            return;
        }

        // Init do storage (FireStore). Se falhar por rules/latência, ainda assim
        // tentamos seed local para que a UI mostre jogadores.
        try {
            if (typeof window.initMagnusStorage !== "function") {
                console.warn("MAGNUS: initMagnusStorage não encontrado.");
            } else {
                await window.initMagnusStorage(true);
            }
        } catch (err) {
            console.error("MAGNUS: erro ao iniciar storage:", err);
        }

        // Se não houver roster salvo, inicializar com defaults.
        try {
            if (typeof window.loadPlayers === "function") {
                var players = window.loadPlayers() || [];
                if (players.length === 0) {
                    if (typeof window.__MAGNUS_DEFAULT_PLAYERS__ !== "undefined") {
                        window.savePlayers(window.__MAGNUS_DEFAULT_PLAYERS__);
                    }
                }
            }
        } catch (err) {
            console.warn("MAGNUS: seed de defaults falhou:", err);
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

