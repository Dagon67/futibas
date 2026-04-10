/* ===========================
   🖥️ TELA: SELECIONAR JOGADORES PARA O TREINO
   =========================== */

function setRosterCategoriaFilter(cat) {
    if (cat !== ROSTER_CATEGORIA_PRO && cat !== ROSTER_CATEGORIA_SUB20) return;
    state.rosterCategoriaFilter = cat;
    const visibleIds = new Set(
        loadPlayers()
            .filter(function (p) {
                return playerMatchesRosterCategoria(p, cat);
            })
            .map(function (p) {
                return p.id;
            })
    );
    state.selectedPlayerIds = (state.selectedPlayerIds || []).filter(function (id) {
        return visibleIds.has(id);
    });
    goSelectPlayers();
}

function goSelectPlayers(){
    state.currentScreen = "selectPlayers";
    setHeaderModeLabel(state.currentMode==="pre"?"Pré Treino":"Pós Treino");

    if (!state.rosterCategoriaFilter) state.rosterCategoriaFilter = ROSTER_CATEGORIA_PRO;

    const allPlayers = loadPlayers();
    const players = allPlayers.filter(function (p) {
        return playerMatchesRosterCategoria(p, state.rosterCategoriaFilter);
    });
    
    if(allPlayers.length === 0){
        renderScreen(`
            <div class="center-flex-col">
                <div class="back-row" style="width:100%;justify-content:flex-start;">
                    <button class="back-btn" onclick="goChooseMode()">
                        <i data-feather="arrow-left"></i>
                        <span>Voltar</span>
                    </button>
                </div>
                <div class="screen-title">Selecionar Jogadores</div>
                <div class="screen-sub" style="color:var(--text-dim);margin:2rem 0;">
                    Nenhum jogador cadastrado ainda.<br/>
                    Adicione jogadores para começar.
                </div>
                <button class="home-btn home-btn-secondary" onclick="goPlayers()">
                    <i data-feather="users"></i>
                    <div>Gerenciar Jogadores</div>
                </button>
            </div>
        `);
        updateSettingsButtonVisibility();
        return;
    }

    if (players.length === 0) {
        renderScreen(`
            <div class="player-list-wrapper">
                <div class="back-row">
                    <button class="back-btn" onclick="goChooseMode()">
                        <i data-feather="arrow-left"></i>
                        <span>Voltar</span>
                    </button>
                    <div>
                        <div class="screen-title">Selecionar Jogadores</div>
                        <div class="screen-sub">Nenhum jogador nesta categoria. Troque para Profissional ou Sub-20.</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin:1rem 0;">
                    <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_PRO ? "selected" : ""}" onclick="setRosterCategoriaFilter(ROSTER_CATEGORIA_PRO)">Profissional</button>
                    <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_SUB20 ? "selected" : ""}" onclick="setRosterCategoriaFilter(ROSTER_CATEGORIA_SUB20)">Sub-20</button>
                </div>
            </div>
        `);
        updateSettingsButtonVisibility();
        try { feather.replace(); } catch (e) {}
        return;
    }

    const selectedCount = state.selectedPlayerIds.length;
    const canContinue = selectedCount > 0;
    const allSelected = selectedCount === players.length && players.length > 0;

    const playerCardsHTML = players.map(p=>{
        const isSelected = state.selectedPlayerIds.includes(p.id);
        const photoHTML = p.photo 
            ? `<img src="${p.photo}" alt="${p.name}" class="player-card-photo" />`
            : `<div class="player-card-photo" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.5rem;">👤</div>`;
        return `
        <div class="player-card ${isSelected ? 'player-card-selected' : ''}"
            onclick="togglePlayer('${p.id}')">
            ${photoHTML}
            <div class="player-card-content">
                <div>${p.name}</div>
                <small>${isSelected ? '✓ Selecionado' : 'Toque para selecionar'}</small>
            </div>
        </div>`;
    }).join("");

    renderScreen(`
        <div class="player-list-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goChooseMode()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">
                        Selecionar Jogadores
                    </div>
                    <div class="screen-sub">
                        ${selectedCount > 0 
                            ? `${selectedCount} ${selectedCount === 1 ? 'jogador selecionado' : 'jogadores selecionados'}` 
                            : 'Selecione os jogadores que participarão deste treino'}
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;align-items:center;">
                <span style="font-size:0.9rem;color:var(--text-dim);width:100%;">Categoria do plantel</span>
                <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_PRO ? "selected" : ""}" onclick="setRosterCategoriaFilter(ROSTER_CATEGORIA_PRO)">Profissional</button>
                <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_SUB20 ? "selected" : ""}" onclick="setRosterCategoriaFilter(ROSTER_CATEGORIA_SUB20)">Sub-20</button>
            </div>

            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;">
                <button class="small-solid-btn" onclick="selectAllPlayers()">
                    ${allSelected ? 'Desselecionar Todos' : 'Selecionar Todos'}
                </button>
            </div>

            <div class="player-grid">
                ${playerCardsHTML}
            </div>

            ${canContinue ? `
                <button class="submit-btn" onclick="confirmPlayers()" style="margin-top:1rem;">
                    Continuar
                </button>
            ` : ''}
        </div>
    `);
    
    updateSettingsButtonVisibility();
    try { feather.replace(); } catch (e) {}
}

function togglePlayer(playerId){
    const idx = state.selectedPlayerIds.indexOf(playerId);
    if(idx >= 0){
        state.selectedPlayerIds.splice(idx, 1);
    } else {
        state.selectedPlayerIds.push(playerId);
    }
    goSelectPlayers(); // Re-render
}

function selectAllPlayers(){
    const players = loadPlayers().filter(function (p) {
        return playerMatchesRosterCategoria(p, state.rosterCategoriaFilter);
    });
    const allSelected = state.selectedPlayerIds.length === players.length && players.length > 0;
    
    if(allSelected){
        state.selectedPlayerIds = [];
    } else {
        state.selectedPlayerIds = players.map(p => p.id);
    }
    
    goSelectPlayers(); // Re-render
}

function confirmPlayers(){
    if(state.selectedPlayerIds.length === 0){
        alert("Selecione pelo menos um jogador.");
        return;
    }
    
    // Atualizar treino com os jogadores selecionados
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === state.currentTrainingId);
    if(training){
        training.playerIds = [...state.selectedPlayerIds];
        saveTrainings(trainings);
    }
    
    // Resetar pending para os jogadores selecionados
    resetPendingForMode(state.currentMode);
    
    // Ir para seleção de jogador individual (para responder questionário)
    goSelectPlayer(state.currentMode);
}
