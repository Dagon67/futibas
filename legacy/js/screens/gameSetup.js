/* ===========================
   🎯 CONFIGURAR JOGO (abre o Campin)
   =========================== */

function goGameSetup() {
    state.currentScreen = "gameSetup";
    setHeaderModeLabel("Novo Jogo");
    var now = new Date();
    var dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    renderScreen(`
        <div class="center-flex-col">
            <div class="back-row" style="width:100%;justify-content:flex-start;">
                <button class="back-btn" onclick="goHome()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
            </div>
            <div class="screen-title" style="margin-bottom:1rem;">Configurar Jogo</div>
            <div class="screen-sub" style="margin-bottom:2rem;">Data e horário padrão do sistema. No controle de jogo você escolhe quem entra no elenco e monta o quinteto na quadra.</div>
            <div style="width:100%;max-width:600px;display:flex;flex-direction:column;gap:var(--touch-gap);">
                <div class="label-col">
                    <label>Data do jogo</label>
                    <input type="date" id="game-date" value="${dateStr}" style="font-size:var(--touch-font-md);">
                </div>
                <div class="label-col">
                    <label>Horário do jogo</label>
                    <input type="time" id="game-time" value="${timeStr}" style="font-size:var(--touch-font-md);">
                </div>
                <div class="label-col">
                    <label>Nome do time (opcional)</label>
                    <input type="text" id="game-team" placeholder="Ex.: Jaraguá Futsal" style="font-size:var(--touch-font-md);">
                </div>
                <button class="submit-btn" onclick="abrirCampin()" style="margin-top:1rem;">
                    Abrir Controle de Jogo
                </button>
            </div>
        </div>
    `);
    updateSettingsButtonVisibility();
    feather.replace();
}

function abrirCampin() {
    var dateEl = document.getElementById("game-date");
    var timeEl = document.getElementById("game-time");
    var teamEl = document.getElementById("game-team");
    var dateStr = dateEl ? dateEl.value : "";
    var timeStr = timeEl ? timeEl.value : "12:00";
    var team = teamEl ? (teamEl.value || "").trim() : "";
    var date = dateStr || new Date().toISOString().slice(0, 10);
    var time = timeStr || "12:00";
    var iso = date + "T" + time + ":00.000";
    var backend = (typeof window !== "undefined" && window.BACKEND_URL) ? window.BACKEND_URL : "";
    var params = new URLSearchParams();
    params.set("datetime", iso);
    if (team) params.set("team", team);
    if (backend) params.set("backend", backend);
    // Sem Google Sheets: flags para o Campin (localStorage + tenant; `app=magnus` = modo sem planilha no campin).
    try {
        if (window.__TUTEM_SHEETS_MODE__ === "none") {
            params.set("app", "magnus");
            var tid = (window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId) ? window.__TUTEM_TENANT__.tenantId : "magnus";
            params.set("tenant", tid);

            // Sem Sheets: hidratar roster do Firestore antes de abrir o Campin (consome localStorage).
            (async function () {
                try {
                    if (typeof window.initJaraguaFirestoreStorage === "function") {
                        await window.initJaraguaFirestoreStorage(true);
                    }
                    if (typeof window.loadPlayers === "function") {
                        var players = window.loadPlayers() || [];
                        localStorage.setItem("tutem_campin_players", JSON.stringify(players));
                    }
                } catch (e) {}
                window.location.href = "campin/campin.html?" + params.toString();
            })();
            return;
        }
    } catch (e) {}
    var url = "campin/campin.html?" + params.toString();
    window.location.href = url;
}
