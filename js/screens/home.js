/* ===========================
   🖥️ TELA: HOME (Tela Inicial)
   =========================== */

function goHome(){
    // Sempre mostrar tela de bloqueio quando voltar para home
    if (typeof window.showLockScreen === 'function') {
        window.showLockScreen();
    }

    state.currentScreen = "home";
    state.currentMode = null;
    state.currentTrainingId = null;
    state.selectedPlayerIds = [];
    state.currentPlayerId = null;
    setHeaderModeLabel("Início");

    renderScreen(`
        <div class="center-flex-col">
            <div class="datetime-display">
                <div class="date" id="currentDate"></div>
                <div class="time" id="currentTime"></div>
            </div>
            <div class="home-buttons">
                <button class="home-btn home-btn-primary" onclick="goTrainingSetup()">
                    <i data-feather="play-circle"></i>
                    <div>Iniciar Novo Treino</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goTrainingsList()">
                    <i data-feather="list"></i>
                    <div>Lista de Treinos</div>
                </button>
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
        </div>
    `);
    
    // Atualizar data/hora imediatamente e depois a cada segundo
    updateDateTime();
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    window.dateTimeInterval = setInterval(updateDateTime, 1000);
    
    // Mostrar botão de configurações no menu (mas agora está na tela home)
    updateSettingsButtonVisibility();
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
