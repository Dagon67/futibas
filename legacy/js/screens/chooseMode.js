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
    try {
        state.currentMode = mode;
        const players = loadPlayers();
        if (!Array.isArray(players)) {
            console.error("loadPlayers não retornou array");
            alert("Erro ao carregar jogadores. Tente novamente.");
            return;
        }
        if (players.length === 0) {
            alert("Cadastre jogadores em Jogadores antes de iniciar um treino.");
            return;
        }
        state.selectedPlayerIds = [];

        const trainingId = uid();
        const now = luxon.DateTime.now();
        const selectedDate = state.trainingDate || now.toFormat("yyyy-MM-dd");
        const selectedDateFormatted = state.trainingDateFormatted || now.setLocale("pt-BR").toFormat("dd/MM/yyyy");

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
        var trainings = loadTrainings();
        if (!Array.isArray(trainings)) {
            console.error("loadTrainings não retornou array, valor:", trainings);
            alert("Erro ao carregar treinos. Tente novamente.");
            return;
        }
        trainings.push(training);
        saveTrainings(trainings);
        // Garantir que persistiu (evitar falha silenciosa de localStorage)
        var after = loadTrainings();
        if (!after.some(function(t){ return t.id === trainingId; })) {
            console.error("Treino não persistiu no localStorage após saveTrainings");
            alert("Não foi possível salvar o treino. Verifique se o navegador permite armazenamento local.");
            return;
        }

        state.currentTrainingId = trainingId;

        delete state.trainingDate;
        delete state.trainingDateFormatted;
        delete state.trainingPeriod;

        resetPendingForMode(mode);
        goSelectPlayers();
    } catch (err) {
        console.error("Erro ao criar treino:", err);
        alert("Erro ao criar treino: " + (err.message || err));
    }
}
