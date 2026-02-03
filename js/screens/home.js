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
                <button class="home-btn home-btn-secondary" onclick="goSettings()">
                    <i data-feather="settings"></i>
                    <div>Configurações</div>
                </button>
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
