/* ===========================
   🖥️ TELA: HOME (Tela Inicial)
   =========================== */

function isBrazilTenant() {
    try {
        return !!(window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId === "brazil");
    } catch (e) {
        return false;
    }
}

function goHome(){
    if (typeof clearResumeState === "function") clearResumeState();
    state.currentScreen = "home";
    state.currentMode = null;
    state.currentTrainingId = null;
    state.selectedPlayerIds = [];
    state.currentPlayerId = null;
    setHeaderModeLabel("Início");

    var showAcompanhamento = true;
    try {
        if (!isBrazilTenant()) {
            showAcompanhamento = !(window.__TUTEM_SHEETS_MODE__ === "none");
        }
    } catch (e) {}

    var homeButtonsHtml;
    if (isBrazilTenant()) {
        var disSub = '<div class="home-btn-sub-hint">Desabilitado para esta versão</div>';
        var brIaNotice = "Nesta versão, use Blaze Training para treinos e acompanhamento. OnField está desativado.";
        homeButtonsHtml = `
            <div class="home-buttons">
                <p class="home-brazil-notice" role="note">${brIaNotice}</p>
                <div class="home-onfield-wrap">
                    <button id="homeBlazeToggle" type="button" class="home-btn home-btn-primary home-onfield-toggle" aria-expanded="false" aria-controls="homeBlazeSub" onclick="toggleHomeBlaze(event)">
                        <i data-feather="zap"></i>
                        <div>Blaze Training</div>
                        <div class="home-onfield-chevron" aria-hidden="true"></div>
                    </button>
                    <div id="homeBlazeSub" class="home-onfield-sub" style="display:none;" role="group" aria-label="Blaze Training">
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="iniciarNovoTreinoComSenha()">
                            <i data-feather="play-circle"></i>
                            <div>Iniciar treino</div>
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="goTrainingsList()">
                            <i data-feather="list"></i>
                            <div>Lista de Treinos</div>
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="goAcompanhamento()">
                            <i data-feather="bar-chart-2"></i>
                            <div>Acompanhamento</div>
                        </button>
                    </div>
                </div>
                <div class="home-onfield-wrap">
                    <button id="homeOnFieldToggle" type="button" class="home-btn home-btn-secondary home-onfield-toggle" aria-expanded="false" aria-controls="homeOnFieldSub" onclick="toggleHomeOnField(event)">
                        <i data-feather="map"></i>
                        <div>OnField</div>
                        <div class="home-onfield-chevron" aria-hidden="true"></div>
                    </button>
                    <div id="homeOnFieldSub" class="home-onfield-sub" style="display:none;" role="group" aria-label="OnField">
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" disabled aria-disabled="true">
                            <i data-feather="target"></i>
                            <div>Novo jogo</div>
                            <div class="home-btn-sub-hint home-btn-sub-hint--muted">Campin — mapa e controlo</div>
                            ${disSub}
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" disabled aria-disabled="true">
                            <i data-feather="activity"></i>
                            <div>Dash tático</div>
                            ${disSub}
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" disabled aria-disabled="true">
                            <i data-feather="archive"></i>
                            <div>Histórico de jogos</div>
                            ${disSub}
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" disabled aria-disabled="true">
                            <i data-feather="monitor"></i>
                            <div>Game Room</div>
                            ${disSub}
                        </button>
                    </div>
                </div>
                <button class="home-btn home-btn-secondary" id="home-btn-jogadores" type="button" onclick="abrirJogadores()">
                    <i data-feather="users"></i>
                    <div>Jogadores</div>
                </button>
                <button class="home-btn home-btn-secondary" type="button" disabled aria-disabled="true">
                    <i data-feather="settings"></i>
                    <div>Configurações</div>
                    ${disSub}
                </button>
            </div>
        `;
    } else {
        homeButtonsHtml = `
            <div class="home-buttons">
                <div class="home-onfield-wrap">
                    <button id="homeBlazeToggle" type="button" class="home-btn home-btn-primary home-onfield-toggle" aria-expanded="false" aria-controls="homeBlazeSub" onclick="toggleHomeBlaze(event)">
                        <i data-feather="zap"></i>
                        <div>Blaze Training</div>
                        <div class="home-onfield-chevron" aria-hidden="true"></div>
                    </button>
                    <div id="homeBlazeSub" class="home-onfield-sub" style="display:none;" role="group" aria-label="Blaze Training">
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="iniciarNovoTreinoComSenha()">
                            <i data-feather="play-circle"></i>
                            <div>Iniciar treino</div>
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="goTrainingsList()">
                            <i data-feather="list"></i>
                            <div>Lista de Treinos</div>
                        </button>
                        ${showAcompanhamento ? `
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="goAcompanhamento()">
                            <i data-feather="bar-chart-2"></i>
                            <div>Acompanhamento</div>
                        </button>
                        ` : ``}
                    </div>
                </div>
                <div class="home-onfield-wrap">
                    <button id="homeOnFieldToggle" type="button" class="home-btn home-btn-secondary home-onfield-toggle" aria-expanded="false" aria-controls="homeOnFieldSub" onclick="toggleHomeOnField(event)">
                        <i data-feather="map"></i>
                        <div>OnField</div>
                        <div class="home-onfield-chevron" aria-hidden="true"></div>
                    </button>
                    <div id="homeOnFieldSub" class="home-onfield-sub" style="display:none;" role="group" aria-label="OnField">
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="iniciarNovoJogoComSenha()">
                            <i data-feather="target"></i>
                            <div>Novo jogo</div>
                            <div class="home-btn-sub-hint home-btn-sub-hint--muted">Campin — mapa e controlo</div>
                        </button>
                        ${showAcompanhamento ? `
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="abrirDashTaticoComSenha()">
                            <i data-feather="activity"></i>
                            <div>Dash tático</div>
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="abrirAnaliseJogosPassadosComSenha()">
                            <i data-feather="archive"></i>
                            <div>Histórico de jogos</div>
                        </button>
                        <button class="home-btn home-btn-secondary home-onfield-item" type="button" onclick="abrirGameRoomComSenha()">
                            <i data-feather="monitor"></i>
                            <div>Game Room</div>
                        </button>
                        ` : ``}
                    </div>
                </div>
                <button class="home-btn home-btn-secondary" id="home-btn-jogadores" type="button" onclick="abrirJogadores()">
                    <i data-feather="users"></i>
                    <div>Jogadores</div>
                </button>
                <button class="home-btn home-btn-secondary" type="button">
                    <i data-feather="settings"></i>
                    <div>Configurações</div>
                </button>
                <div class="settings-password-row" style="margin-top:0.5rem;display:flex;flex-direction:column;gap:0.35rem;align-items:center;">
                    <input type="password" id="settingsPasswordInput" placeholder="Senha para acessar" class="settings-password-input" style="max-width:180px;padding:0.4rem 0.6rem;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.25);background:rgba(0,0,0,0.3);color:var(--text-main);font-size:0.9rem;" />
                    <button type="button" class="small-solid-btn" onclick="openSettingsWithPassword()" style="padding:0.35rem 0.75rem;font-size:0.85rem;">Acessar configurações</button>
                </div>
            </div>
        `;
    }

    var homeTeamLogoHtml = "";
    try {
        if (window.__TUTEM_APP_MODE__ === "jaragua") {
            homeTeamLogoHtml =
                '<div class="home-team-logo-wrap" aria-hidden="true">' +
                '<img class="home-team-logo" src="Associação_Desportiva_Jaraguá.png" alt="Associação Desportiva Jaraguá" />' +
                "</div>";
        }
    } catch (e) {}

    renderScreen(`
        <div class="center-flex-col">
            <div class="datetime-display">
                <div class="date" id="currentDate"></div>
                <div class="time" id="currentTime"></div>
            </div>
            <div class="home-spark-below-time" aria-hidden="true">
                <div class="spark-brand spark-brand--dark" aria-label="SPARK Technologies">
                    <div class="logo"><span class="spark">SPARK</span><span class="tech">TECHNOLOGIES</span></div>
                </div>
            </div>
            ${homeTeamLogoHtml}
            ${homeButtonsHtml}
        </div>
    `);
    
    // Atualizar data/hora imediatamente e depois a cada segundo
    updateDateTime();
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    window.dateTimeInterval = setInterval(updateDateTime, 1000);
    
    // Mostrar botão de configurações no menu (mas agora está na tela home)
    updateSettingsButtonVisibility();
}

function toggleHomeOnField(ev) {
    if (ev) ev.preventDefault();
    var sub = document.getElementById("homeOnFieldSub");
    var btn = document.getElementById("homeOnFieldToggle");
    if (!sub || !btn) return;
    var open = btn.classList.contains("home-onfield--open");
    if (open) {
        sub.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("home-onfield--open");
    } else {
        sub.style.display = "flex";
        btn.setAttribute("aria-expanded", "true");
        btn.classList.add("home-onfield--open");
    }
    try {
        if (window.feather && feather.replace) feather.replace();
    } catch (e) {}
}

function toggleHomeBlaze(ev) {
    if (ev) ev.preventDefault();
    var sub = document.getElementById("homeBlazeSub");
    var btn = document.getElementById("homeBlazeToggle");
    if (!sub || !btn) return;
    var open = btn.classList.contains("home-blaze--open");
    if (open) {
        sub.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("home-blaze--open");
    } else {
        sub.style.display = "flex";
        btn.setAttribute("aria-expanded", "true");
        btn.classList.add("home-blaze--open");
    }
    try {
        if (window.feather && feather.replace) feather.replace();
    } catch (e) {}
}

function updateDateTime(){
    const now = luxon.DateTime.now().setLocale('pt-BR');
    const dateStr = now.toFormat("EEEE, dd 'de' MMMM 'de' yyyy");
    const timeStr = now.toFormat("HH:mm:ss");
    
    const dateEl = document.getElementById("currentDate");
    const timeEl = document.getElementById("currentTime");
    
    if(dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    if(timeEl) timeEl.textContent = timeStr;
}

// Hash SHA-256 da senha (não armazena a senha em texto no código)
var SETTINGS_PASSWORD_HASH = "fa1406e0e4904a7add9ec9bb970a2cf8d175aa8d41a47811d5976d3e279342a8";
function sha256Hex(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
        .then(function (buf) {
            return Array.from(new Uint8Array(buf)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
        });
}
function iniciarNovoTreinoComSenha() {
    if (typeof window.showLockScreen === 'function') {
        window.showLockScreen(function() {
            if (typeof goTrainingSetup === 'function') goTrainingSetup();
        });
    } else if (typeof goTrainingSetup === 'function') {
        goTrainingSetup();
    }
}

function iniciarNovoJogoComSenha() {
    if (typeof window.showLockScreen === 'function') {
        window.showLockScreen(function() {
            if (typeof goGameSetup === 'function') goGameSetup();
        });
    } else if (typeof goGameSetup === 'function') {
        goGameSetup();
    }
}

function abrirInsightsComSenha() {
    if (typeof window.showLockScreen === 'function') {
        window.showLockScreen(function() {
            if (typeof goInsights === 'function') goInsights();
        });
    } else if (typeof goInsights === 'function') {
        goInsights();
    }
}

/** Leitura do jogo em aberto (Campin → Sheets Campin_Live). Abre em nova URL; segundo dispositivo pode usar ao mesmo tempo. */
function abrirDashTaticoComSenha() {
    function openDash() {
        var backend = (typeof window !== "undefined" && window.BACKEND_URL) ? String(window.BACKEND_URL).replace(/\/$/, "") : "";
        var params = new URLSearchParams();
        if (backend) params.set("backend", backend);
        window.location.href = "dash-tatico.html?" + params.toString();
    }
    if (typeof window.showLockScreen === "function") {
        window.showLockScreen(openDash);
    } else {
        openDash();
    }
}

function openSettingsWithPassword() {
    var input = document.getElementById("settingsPasswordInput");
    var value = input ? (input.value || "").trim() : "";
    if (!value) { alert("Digite a senha."); return; }
    sha256Hex(value).then(function (hash) {
        if (hash === SETTINGS_PASSWORD_HASH) {
            if (input) input.value = "";
            goSettings();
        } else {
            alert("Senha incorreta.");
        }
    });
}
