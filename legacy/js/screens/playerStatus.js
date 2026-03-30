/* ===========================
   🖥️ TELA: STATUS/DETALHES DO JOGADOR
   =========================== */

function viewPlayerStatus(playerId){
    state.currentScreen = "playerStatus";
    setHeaderModeLabel("Status do Jogador");

    const player = getPlayerById(playerId);
    if(!player){
        alert("Jogador não encontrado.");
        goPlayers();
        return;
    }

    // Buscar todas as respostas deste jogador
    const trainings = loadTrainings();
    const allResponses = [];
    
    trainings.forEach(training => {
        (training.responses || []).forEach(response => {
            if(response.playerId === playerId){
                allResponses.push({
                    ...response,
                    trainingDate: training.dateFormatted || training.date,
                    trainingMode: training.mode,
                    trainingId: training.id
                });
            }
        });
    });

    // Ordenar por data (mais recente primeiro)
    allResponses.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const playerThumb =
        typeof playerAvatarThumbHTML === "function"
            ? playerAvatarThumbHTML(player, "player-avatar-thumb player-avatar-thumb--header")
            : "";

    // Informações do jogador
    const playerInfoHTML = `
        <div class="item-row item-row--player" style="background:rgba(96,165,250,0.1);border-color:var(--accent);">
            <div class="item-row-avatar">${playerThumb}</div>
            <div class="item-main">
                <div class="item-title" style="font-size:var(--touch-font-lg);">${player.name}</div>
                <div class="item-sub">
                    ${player.position ? `Posição: ${player.position}` : ''}
                    ${player.lateralidade ? ` • ${player.lateralidade}` : ''}
                    ${player.number ? ` • Número: #${player.number}` : ''}
                    ${player.age ? ` • Idade: ${player.age} anos` : ''}
                    ${player.height ? ` • Altura: ${player.height}cm` : ''}
                    ${player.weight ? ` • Peso: ${player.weight}kg` : ''}
                </div>
            </div>
        </div>
    `;

    // Estatísticas resumidas
    let statsHTML = "";
    if(allResponses.length > 0){
        const preResponses = allResponses.filter(r => r.trainingMode === "pre");
        const postResponses = allResponses.filter(r => r.trainingMode === "post");
        
        statsHTML = `
            <div class="item-row">
                <div class="item-main">
                    <div class="item-title">Estatísticas</div>
                    <div class="item-sub">
                        Total de treinos: ${allResponses.length}<br/>
                        Pré treinos: ${preResponses.length} • Pós treinos: ${postResponses.length}
                    </div>
                </div>
            </div>
        `;
    }

    // Lista de respostas
    let responsesHTML = "";
    if(allResponses.length === 0){
        responsesHTML = `
            <div class="item-row">
                <div class="item-main" style="text-align:center;padding:2rem;">
                    <div class="item-sub">Sem dados disponíveis</div>
                    <div class="item-sub" style="margin-top:0.5rem;color:var(--text-dim);">
                        Este jogador ainda não respondeu nenhum questionário.
                    </div>
                </div>
            </div>
        `;
    } else {
        responsesHTML = allResponses.map(r => {
            const modeLabel = r.trainingMode === "pre" ? "Pré Treino" : "Pós Treino";
            const date = new Date(r.timestamp).toLocaleString('pt-BR');
            const answerCount = Object.keys(r.answers || {}).length;
            
            return `
            <div class="item-row" onclick="viewPlayerResponseDetail('${playerId}', '${r.trainingId}')" style="cursor:pointer;">
                <div class="item-main">
                    <div class="item-title">
                        ${r.trainingDate} • ${modeLabel}
                    </div>
                    <div class="item-sub">
                        ${date}<br/>
                        ${answerCount} ${answerCount === 1 ? 'resposta' : 'respostas'}
                    </div>
                </div>
                <i data-feather="chevron-right" style="width:24px;height:24px;stroke:var(--accent);"></i>
            </div>`;
        }).join("");
    }

    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goPlayers()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">Status do Jogador</div>
                    <div class="screen-sub">Histórico e dados do jogador</div>
                </div>
            </div>

            <div class="settings-panel-area">
                <div class="settings-panel-scroll">
                    ${playerInfoHTML}
                    ${statsHTML}
                    <div class="item-title" style="margin-top:1rem;margin-bottom:.5rem;">Histórico de Respostas</div>
                    ${responsesHTML}
                </div>
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}

function viewPlayerResponseDetail(playerId, trainingId){
    const player = getPlayerById(playerId);
    if(!player) return;

    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(!training) return;

    const response = (training.responses || []).find(r => r.playerId === playerId);
    if(!response){
        alert("Resposta não encontrada.");
        return;
    }

    const modeLabel = training.mode === "pre" ? "Pré Treino" : "Pós Treino";
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
            <button class="small-solid-btn" onclick="savePlayerCommentAndReload('${trainingId}', '${playerId}')" style="margin-top:0.75rem;width:100%;">
                ${currentComment ? 'Atualizar Comentário' : 'Salvar Comentário'}
            </button>
        </div>
    `;

    renderScreen(`
        <div class="questionnaire-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="viewPlayerStatus('${playerId}')">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">Respostas de ${player.name}</div>
                    <div class="screen-sub">${training.dateFormatted || training.date} • ${modeLabel}</div>
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

function savePlayerCommentAndReload(trainingId, playerId){
    // Salvar o comentário usando a função existente
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
    viewPlayerResponseDetail(playerId, trainingId);
}
