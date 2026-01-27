/* ===========================
   🖥️ TELA: ADICIONAR JOGADOR A UM TREINO
   =========================== */

function goSelectPlayerForTraining(trainingId){
    state.currentScreen = "addPlayerToTraining";
    state.currentTrainingId = trainingId;
    
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training){
        alert("Treino não encontrado.");
        goTrainingsList();
        return;
    }

    const players = loadPlayers();
    const responses = training.responses || [];
    
    // IDs dos jogadores que já responderam
    const respondedPlayerIds = responses.map(r => r.playerId);
    
    // Filtrar TODOS os jogadores cadastrados que NÃO responderam ao treino
    // (mesmo que não tenham sido selecionados inicialmente)
    const availablePlayers = players.filter(p => !respondedPlayerIds.includes(p.id));
    
    if(availablePlayers.length === 0){
        alert("Todos os jogadores já responderam este treino.");
        viewTrainingDetails(trainingId);
        return;
    }

    const modeLabel = training.mode === "pre" ? "Pré Treino" : "Pós Treino";
    
    const playerCardsHTML = availablePlayers.map(p => {
        const position = p.position || "Não definida";
        const photoHTML = p.photo 
            ? `<img src="${p.photo}" alt="${p.name}" class="player-card-photo" />`
            : `<div class="player-card-photo" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.5rem;">👤</div>`;
        return `
        <div class="player-card"
            onclick="addPlayerToTraining('${trainingId}', '${p.id}')">
            ${photoHTML}
            <div class="player-card-content">
                <div>${p.name}</div>
                <small>${position}${p.number ? ` • #${p.number}` : ''}</small>
            </div>
        </div>`;
    }).join("");

    renderScreen(`
        <div class="player-list-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="viewTrainingDetails('${trainingId}')">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">
                        Adicionar Jogador Atrasado
                    </div>
                    <div class="screen-sub">
                        ${training.dateFormatted || training.date} • ${modeLabel}<br/>
                        Selecione o jogador que chegou atrasado
                    </div>
                </div>
            </div>

            <div class="player-grid">
                ${playerCardsHTML}
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}

function addPlayerToTraining(trainingId, playerId){
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training) return;

    const player = getPlayerById(playerId);
    if(!player) return;

    // Adicionar jogador ao treino
    if(!training.playerIds.includes(playerId)){
        training.playerIds.push(playerId);
        saveTrainings(trainings);
    }

    // Configurar estado para permitir que o jogador responda
    state.currentTrainingId = trainingId;
    state.currentMode = training.mode;
    state.currentPlayerId = playerId;
    state.selectedPlayerIds = training.playerIds;
    state.cameFromScreen = "addPlayerToTraining"; // Marcar que veio de addPlayerToTraining
    
    // Resetar pending apenas com este jogador
    state.pendingByMode[training.mode] = [playerId];
    
    // Limpar respostas temporárias
    state.tempAnswers = {};
    
    // Ir direto para o questionário
    goQuestionnaire();
}
