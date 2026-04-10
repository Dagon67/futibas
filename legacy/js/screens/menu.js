/* ===========================
   🖥️ TELA: MENU INICIAL
   =========================== */

function updateDateTime(){
    const now = luxon.DateTime.now().setLocale('pt-BR');
    const dateStr = now.toFormat("EEEE, dd 'de' MMMM 'de' yyyy");
    const timeStr = now.toFormat("HH:mm:ss");
    
    const dateEl = document.getElementById("currentDate");
    const timeEl = document.getElementById("currentTime");
    
    if(dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    if(timeEl) timeEl.textContent = timeStr;
}

function goMenu(){
    state.currentScreen = "menu";
    state.currentMode = null;
    state.currentPlayerId = null;
    setHeaderModeLabel("Menu");

    renderScreen(`
        <div class="center-flex-col">
            <div class="datetime-display">
                <div class="date" id="currentDate"></div>
                <div class="time" id="currentTime"></div>
            </div>
            <div class="big-dual-buttons">
                <button class="action-btn" data-variant="pre"
                    onclick="startMode('pre')">
                    <div>Pré Treino</div>
                    <div class="sub">Check-in físico antes da sessão</div>
                </button>
                <button class="action-btn" data-variant="post"
                    onclick="startMode('post')">
                    <div>Pós Treino</div>
                    <div class="sub">Como você saiu do treino</div>
                </button>
            </div>
            <button type="button" class="home-btn home-btn-secondary home-btn-logout" onclick="tutemFirebaseSignOut()" style="margin-top:1.25rem;">
                <i data-feather="log-out"></i>
                <div>Sair</div>
            </button>
        </div>
    `);
    
    // Atualizar data/hora imediatamente e depois a cada segundo
    updateDateTime();
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    window.dateTimeInterval = setInterval(updateDateTime, 1000);
    
    // Mostrar botão de configurações no menu
    updateSettingsButtonVisibility();
}

function startMode(mode){
    // parar atualização do relógio quando sair do menu
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    // se estamos começando agora, resetar pending
    resetPendingForMode(mode);
    goSelectPlayer(mode);
}
