/* ===========================
   🖥️ TELA: ESCOLHER MODO (Pré ou Pós Treino)
   =========================== */

function goChooseMode(){
    // parar atualização do relógio quando sair do home
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    state.currentScreen = "chooseMode";
    state.currentMode = null;
    setHeaderModeLabel("Novo Treino");

    renderScreen(`
        <div class="center-flex-col">
            <div class="back-row" style="width:100%;justify-content:flex-start;">
                <button class="back-btn" onclick="goTrainingSetup()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
            </div>
            <div class="screen-title" style="margin-bottom:1rem;">Escolha o tipo de treino</div>
            <div class="screen-sub" style="margin-bottom:2rem;">Selecione se é antes ou depois do treino</div>
            <div class="big-dual-buttons">
                <button class="action-btn" data-variant="pre"
                    onclick="selectMode('pre')">
                    <div>Pré Treino</div>
                    <div class="sub">Check-in físico antes da sessão</div>
                </button>
                <button class="action-btn" data-variant="post"
                    onclick="selectMode('post')">
                    <div>Pós Treino</div>
                    <div class="sub">Como você saiu do treino</div>
                </button>
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
}

function selectMode(mode){
    state.currentMode = mode;
    // Criar novo treino
    const trainingId = uid();
    const now = luxon.DateTime.now();
    const selectedDate = state.trainingDate || now.toFormat("yyyy-MM-dd");
    const selectedDateFormatted = state.trainingDateFormatted || now.setLocale('pt-BR').toFormat("dd/MM/yyyy");
    
    const training = {
        id: trainingId,
        date: selectedDate,
        dateFormatted: selectedDateFormatted,
        datetime: now.toISO(),
        mode: mode,
        period: state.trainingPeriod || null,
        playerIds: [],
        responses: []
    };
    const trainings = loadTrainings();
    trainings.push(training);
    saveTrainings(trainings);
    
    state.currentTrainingId = trainingId;
    
    // Limpar dados temporários
    delete state.trainingDate;
    delete state.trainingDateFormatted;
    delete state.trainingPeriod;
    
    goSelectPlayers();
}
