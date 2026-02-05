/* ===========================
   🖥️ TELA: DETALHES DE UM TREINO
   =========================== */

function viewTrainingDetails(trainingId){
    state.currentScreen = "trainingDetails";
    setHeaderModeLabel("Detalhes do Treino");

    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    
    if(!training){
        alert("Treino não encontrado.");
        goTrainingsList();
        return;
    }

    const modeLabel = training.mode === "pre" ? "Pré Treino" : "Pós Treino";
    const periodLabel = training.period ? 
        (training.period === "manha" ? "Manhã" : training.period === "tarde" ? "Tarde" : "Noite") : 
        "";
    const periodInfo = periodLabel ? ` • ${periodLabel}` : "";
    const players = loadPlayers();
    const responses = training.responses || [];

    // IDs dos jogadores que já responderam
    const respondedPlayerIds = responses.map(r => r.playerId);
    
    // Verificar se há jogadores que não responderam (para mostrar o botão)
    const playersWithoutResponse = players.filter(p => !respondedPlayerIds.includes(p.id));

    // Agrupar respostas por jogador
    const playerResponses = {};
    training.playerIds.forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if(player){
            playerResponses[playerId] = {
                player: player,
                response: responses.find(r => r.playerId === playerId) || null
            };
        }
    });

    const playersHTML = Object.values(playerResponses).map(pr => {
        const hasResponse = pr.response !== null;
        return `
        <div class="item-row">
            <div class="item-main">
                <div class="item-title">
                    ${pr.player.name}
                    ${hasResponse ? '<span style="color:var(--pre-color);margin-left:0.5rem;">✓</span>' : '<span style="color:var(--text-dim);margin-left:0.5rem;">Pendente</span>'}
                </div>
                ${hasResponse ? `
                    <div class="item-sub">
                        Respondido em: ${pr.response.timestamp ? new Date(pr.response.timestamp).toLocaleString('pt-BR') : 'N/A'}<br/>
                        ${Object.keys(pr.response.answers || {}).length} ${Object.keys(pr.response.answers || {}).length === 1 ? 'resposta' : 'respostas'}
                    </div>
                ` : `
                    <div class="item-sub">
                        Ainda não respondeu o questionário
                    </div>
                `}
            </div>
            ${hasResponse ? `
                <button class="small-solid-btn" onclick="viewPlayerResponse('${trainingId}', '${pr.player.id}')">
                    Ver Respostas
                </button>
            ` : `
                <button class="small-solid-btn" onclick="answerQuestionnaireForPlayer('${trainingId}', '${pr.player.id}')">
                    Responder
                </button>
            `}
        </div>`;
    }).join("");

    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goTrainingsList()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">${training.dateFormatted || training.date} • ${modeLabel}${periodInfo}</div>
                    <div class="screen-sub">${training.playerIds.length} ${training.playerIds.length === 1 ? 'jogador' : 'jogadores'} • ${responses.length} ${responses.length === 1 ? 'resposta' : 'respostas'}</div>
                </div>
            </div>

            <div class="settings-panel-area">
                <div class="settings-panel-scroll">
                    ${playersWithoutResponse.length > 0 ? `
                        <div style="margin-bottom:1rem;">
                            <button class="small-solid-btn" onclick="goSelectPlayerForTraining('${trainingId}')" style="width:100%;">
                                <i data-feather="user-plus" style="width:20px;height:20px;margin-right:0.5rem;"></i>
                                Adicionar Jogador Atrasado
                            </button>
                        </div>
                    ` : ''}
                    <div style="margin-bottom:1rem;">
                        <button class="small-solid-btn" onclick="finalizeTrainingAndSyncToSheets('${trainingId}')" style="width:100%;">
                            <i data-feather="upload-cloud" style="width:20px;height:20px;margin-right:0.5rem;"></i>
                            Finalizar treino e sincronizar com Sheets
                        </button>
                    </div>
                    <div class="item-title" style="margin-bottom:1rem;">Jogadores e Respostas</div>
                    ${playersHTML}
                </div>
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}

/** Finaliza o treino enviando os dados atuais (localStorage) para o Google Sheets. Envia as respostas que tiver, mesmo que o formulário esteja incompleto. */
function finalizeTrainingAndSyncToSheets(trainingId) {
    if (typeof syncAllToSheets !== "function") {
        alert("Sincronização com Sheets não disponível.");
        return;
    }
    syncAllToSheets()
        .then(function () {
            alert("Treino sincronizado com a planilha.");
        })
        .catch(function (err) {
            alert("Erro ao sincronizar: " + (err && err.message ? err.message : String(err)));
        });
}

function answerQuestionnaireForPlayer(trainingId, playerId){
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training) return;

    // Configurar estado para permitir que o jogador responda
    state.currentTrainingId = trainingId;
    state.currentMode = training.mode;
    state.currentPlayerId = playerId;
    state.selectedPlayerIds = training.playerIds;
    state.cameFromScreen = "trainingDetails"; // Marcar que veio de trainingDetails
    
    // Resetar pending apenas com este jogador
    state.pendingByMode[training.mode] = [playerId];
    
    // Limpar respostas temporárias
    state.tempAnswers = {};
    
    // Ir direto para o questionário
    goQuestionnaire();
}

function viewPlayerResponse(trainingId, playerId){
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training) return;

    const player = getPlayerById(playerId);
    if(!player) return;

    const response = (training.responses || []).find(r => r.playerId === playerId);
    if(!response){
        alert("Resposta não encontrada.");
        return;
    }

    const answersHTML = Object.entries(response.answers || {}).map(([question, answer]) => {
        let answerDisplay = "";
        if(Array.isArray(answer)){
            answerDisplay = answer.join(", ");
        } else {
            answerDisplay = answer.toString();
        }
        return `
        <div class="q-item">
            <div class="q-text">${question}</div>
            <div class="item-sub" style="margin-top:0.5rem;padding:0.75rem;background:rgba(15,23,42,0.6);border-radius:var(--radius-md);">
                ${answerDisplay}
            </div>
        </div>`;
    }).join("");

    // Comentário salvo (se existir) - mostrar abaixo das respostas
    const currentComment = response.comment || "";
    const savedCommentHTML = currentComment ? `
        <div class="q-item" style="border:2px solid var(--pre-color);background:rgba(16,185,129,0.05);">
            <div class="q-text" style="color:var(--pre-color);">Comentário Salvo</div>
            <div class="item-sub" style="margin-top:0.75rem;padding:0.75rem;background:rgba(15,23,42,0.6);border-radius:var(--radius-md);white-space:pre-wrap;line-height:1.6;">
                ${currentComment}
            </div>
        </div>
    ` : "";

    // Campo de edição de comentário
    const commentHTML = `
        <div class="q-item" style="border:2px solid var(--accent);background:rgba(96,165,250,0.05);">
            <div class="q-text" style="color:var(--accent);">${currentComment ? 'Editar Comentário' : 'Adicionar Comentário'}</div>
            <textarea 
                id="player-comment-${trainingId}-${playerId}" 
                class="q-input" 
                rows="4" 
                placeholder="Digite um comentário sobre este jogador neste treino..."
                style="margin-top:0.75rem;min-height:100px;">${currentComment}</textarea>
            <button class="small-solid-btn" onclick="savePlayerComment('${trainingId}', '${playerId}')" style="margin-top:0.75rem;width:100%;">
                ${currentComment ? 'Atualizar Comentário' : 'Salvar Comentário'}
            </button>
        </div>
    `;

    renderScreen(`
        <div class="questionnaire-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="viewTrainingDetails('${trainingId}')">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">Respostas de ${player.name}</div>
                    <div class="screen-sub">${training.dateFormatted || training.date} • ${training.mode === "pre" ? "Pré Treino" : "Pós Treino"}</div>
                </div>
            </div>

            <div class="q-list">
                ${answersHTML}
                ${savedCommentHTML}
                ${commentHTML}
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}

function savePlayerComment(trainingId, playerId){
    const commentInput = document.getElementById(`player-comment-${trainingId}-${playerId}`);
    if(!commentInput) return;

    const comment = commentInput.value.trim();
    
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training) return;

    const response = (training.responses || []).find(r => r.playerId === playerId);
    if(!response) return;

    // Adicionar ou atualizar comentário na resposta
    response.comment = comment;
    
    // Atualizar também no array principal de respostas (para CSV)
    const allResponses = loadResponses();
    const responseIndex = allResponses.findIndex(r => 
        r.trainingId === trainingId && r.playerId === playerId
    );
    if(responseIndex >= 0){
        allResponses[responseIndex].comment = comment;
        saveResponses(allResponses);
    }

    // Salvar treino atualizado
    saveTrainings(trainings);

    // Recarregar a visualização para mostrar o comentário salvo
    viewPlayerResponse(trainingId, playerId);
}
