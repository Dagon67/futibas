/* ===========================
   🖥️ TELA: SELEÇÃO DE JOGADOR
   =========================== */

function goSelectPlayer(mode){
    state.currentScreen = "selectPlayer";
    state.currentMode = mode;
    state.currentPlayerId = null;
    setHeaderModeLabel(mode==="pre"?"Pré Treino":"Pós Treino");

    const players = loadPlayers();
    const pending = state.pendingByMode[mode]; // ids restantes
    
    // Tela sem botão Voltar: só sai quando todos responderem e clicarem em Iniciar Treino
    const canGoBack = pending.length === 0;
    const backButtonHTML = ``;

    const playerCardsHTML = players.length===0 
    ? `<div style="color:var(--text-dim);font-size:var(--touch-font-md);text-align:center;width:100%;">Nenhum jogador cadastrado ainda.</div>`
    : players.map(p=>{
        const alreadyDone = !pending.includes(p.id);
        const photoHTML = p.photo 
            ? `<img src="${p.photo}" alt="${p.name}" class="player-card-photo" />`
            : `<div class="player-card-photo" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.5rem;">👤</div>`;
        return `
        <div class="player-card"
            ${alreadyDone?'data-disabled="true"':''}
            onclick="${alreadyDone?'':`selectPlayer('${p.id}')`}">
            ${photoHTML}
            <div class="player-card-content">
                <div>${p.name}</div>
                <small>${alreadyDone?'Já respondeu':'Toque para responder'}</small>
            </div>
        </div>`;
    }).join("");

    const subtitleText = canGoBack 
        ? "Todos responderam. Você pode iniciar o treino."
        : `Faltam ${pending.length} ${pending.length === 1 ? 'jogador' : 'jogadores'} para responder.`;

    // Botões de ação
    const actionButtonsHTML = canGoBack 
        ? `
            <button class="submit-btn" onclick="startTraining()" style="margin-top:1rem;">
                Iniciar Treino
            </button>
        `
        : `
            <div style="display:flex;flex-direction:column;gap:1rem;margin-top:1rem;">
                <div style="display:flex;flex-direction:column;gap:0.5rem;">
                    <label style="font-size:var(--touch-font-md);color:var(--text-main);font-weight:500;">
                        Senha para iniciar com questionários incompletos:
                    </label>
                    <input type="password" id="trainingPassword" class="q-input" placeholder="Digite a senha" oninput="checkTrainingPassword()" style="margin-bottom:0.5rem;" />
                    <button class="submit-btn" id="startIncompleteBtn" onclick="startTrainingIncomplete()" disabled style="opacity:0.5;cursor:not-allowed;">
                        Salvar e Iniciar Treino com Questionários Incompletos
                    </button>
                </div>
            </div>
        `;

    renderScreen(`
        <div class="player-list-wrapper">
            <div class="back-row">
                ${backButtonHTML}
                <div>
                    <div class="screen-title">
                        ${mode==="pre" ? "Pré Treino" : "Pós Treino"}
                    </div>
                    <div class="screen-sub">
                        ${subtitleText}
                    </div>
                </div>
            </div>

            <div class="player-grid">
                ${playerCardsHTML}
            </div>

            ${actionButtonsHTML}
        </div>
    `);
    if (typeof saveResumeState === "function") saveResumeState();
    updateSettingsButtonVisibility();
    feather.replace();
}

function selectPlayer(playerId){
    state.currentPlayerId = playerId;
    state.cameFromScreen = "selectPlayer"; // Marcar que veio de selectPlayer
    goQuestionnaire();
}

var TRAINING_PASSWORD_HASH = "e9bd5307735327f44ef5ceedf1b0f4964d4d843445cc60f180823b133a82d91f";
function sha256HexTraining(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
        .then(function(buf) {
            return Array.from(new Uint8Array(buf)).map(function(x) { return x.toString(16).padStart(2, "0"); }).join("");
        });
}
function checkTrainingPassword(){
    var passwordInput = document.getElementById("trainingPassword");
    var startBtn = document.getElementById("startIncompleteBtn");
    if (!passwordInput || !startBtn) return;
    var value = (passwordInput.value || "").trim();
    if (!value) {
        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";
        startBtn.style.cursor = "not-allowed";
        return;
    }
    sha256HexTraining(value).then(function(hash) {
        if (hash === TRAINING_PASSWORD_HASH) {
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
            startBtn.style.cursor = "pointer";
        } else {
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
            startBtn.style.cursor = "not-allowed";
        }
    });
}

function startTraining(){
    // Verificar se todos responderam
    const mode = state.currentMode;
    const pending = state.pendingByMode[mode];
    
    if(pending.length > 0){
        alert("Ainda há jogadores que não responderam. Complete todos os questionários ou use a senha para iniciar com questionários incompletos.");
        return;
    }
    
    const trainingId = state.currentTrainingId;
    if (trainingId) {
        const trainings = loadTrainings();
        const training = trainings.find(t => t.id === trainingId);
        if (training) {
            training.status = "completed";
            training.completedAt = nowTimestamp();
            if (!training.responses) training.responses = [];
            if (!training.playerIds || training.playerIds.length === 0) training.playerIds = [...state.selectedPlayerIds];
            training.pendingPlayers = [];
            saveTrainings(trainings);
        }
        state.currentTrainingId = null;
        state.currentMode = null;
        state.selectedPlayerIds = [];
        state.pendingByMode[mode] = [];
        if (typeof clearResumeState === "function") clearResumeState();
        if (typeof syncSingleTrainingToSheets === "function") {
            syncSingleTrainingToSheets(trainingId).then(function (result) {
                var all = loadTrainings();
                var filtered = all.filter(function (t) { return t.id !== trainingId; });
                saveTrainings(filtered);
                if (result && result.success !== false) alert("Treino enviado ao Sheets com sucesso.");
                goHome();
            }).catch(function (err) {
                console.error("Erro ao sincronizar treino:", err);
                alert("Erro ao enviar para o Sheets. Verifique a internet e tente de novo na lista de treinos.");
                var all = loadTrainings();
                var filtered = all.filter(function (t) { return t.id !== trainingId; });
                saveTrainings(filtered);
                goHome();
            });
            return;
        }
        var all = loadTrainings();
        saveTrainings(all.filter(function (t) { return t.id !== trainingId; }));
    } else {
        state.currentTrainingId = null;
        state.currentMode = null;
        state.selectedPlayerIds = [];
        state.pendingByMode[mode] = [];
    }
    goHome();
}

function startTrainingIncomplete(){
    var passwordInput = document.getElementById("trainingPassword");
    var value = passwordInput ? (passwordInput.value || "").trim() : "";
    if (!value) {
        alert("Senha incorreta.");
        return;
    }
    sha256HexTraining(value).then(function(hash) {
        if (hash !== TRAINING_PASSWORD_HASH) {
            alert("Senha incorreta.");
            return;
        }
        doStartTrainingIncomplete();
    });
}
function doStartTrainingIncomplete(){
    // Marcar treino como iniciado (mas incompleto)
    const trainingId = state.currentTrainingId;
    const mode = state.currentMode;
    
    if(trainingId){
        const trainings = loadTrainings();
        const training = trainings.find(t => t.id === trainingId);
        if(training){
            // Não alterar training.responses: as respostas já foram salvas por finalizeQuestionnaireAndSave
            if(!training.responses) training.responses = [];
            training.status = "incomplete";
            training.completedAt = nowTimestamp();
            training.incompleteReason = "Iniciado com questionários incompletos";
            if(!training.playerIds || training.playerIds.length === 0){
                training.playerIds = [...state.selectedPlayerIds];
            }
            const pending = state.pendingByMode[mode] || [];
            training.pendingPlayers = pending;
            saveTrainings(JSON.parse(JSON.stringify(trainings)));
        }
    }
    
    // Limpar estado
    state.currentTrainingId = null;
    state.currentMode = null;
    state.selectedPlayerIds = [];
    state.pendingByMode[mode] = [];
    
    // Voltar para home
    goHome();
}
