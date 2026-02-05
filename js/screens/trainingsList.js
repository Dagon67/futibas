/* ===========================
   🖥️ TELA: LISTA DE TREINOS
   =========================== */

function goTrainingsList(){
    // parar atualização do relógio quando sair do home
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    state.currentScreen = "trainingsList";
    setHeaderModeLabel("Lista de Treinos");

    const allTrainings = loadTrainings();
    // Mostrar apenas treinos não finalizados (sem status "completed" ou "incomplete")
    const trainings = allTrainings.filter(t => t.status !== "completed" && t.status !== "incomplete");

    // Ordenar por data (mais recente primeiro)
    const sortedTrainings = [...trainings].sort((a, b) => {
        return new Date(b.datetime) - new Date(a.datetime);
    });

    if(sortedTrainings.length === 0){
        renderScreen(`
            <div class="center-flex-col">
                <div class="back-row" style="width:100%;justify-content:flex-start;">
                    <button class="back-btn" onclick="goHome()">
                        <i data-feather="arrow-left"></i>
                        <span>Voltar</span>
                    </button>
                </div>
                <div class="screen-title">Lista de Treinos</div>
                <div class="screen-sub" style="color:var(--text-dim);margin:2rem 0;">
                    Ainda não há treinos registrados.
                </div>
            </div>
        `);
        updateSettingsButtonVisibility();
        return;
    }

    const trainingsHTML = sortedTrainings.map(t => {
        const modeLabel = t.mode === "pre" ? "Pré Treino" : "Pós Treino";
        const responseCount = t.responses ? t.responses.length : 0;
        const playerCount = t.playerIds ? t.playerIds.length : 0;
        return `
        <div class="item-row training-item" onclick="viewTrainingDetails('${t.id}')" style="cursor:pointer;">
            <div class="item-main">
                <div class="item-title">
                    ${t.dateFormatted || t.date} • ${modeLabel}
                </div>
                <div class="item-sub">
                    ${playerCount} ${playerCount === 1 ? 'jogador' : 'jogadores'} • 
                    ${responseCount} ${responseCount === 1 ? 'resposta' : 'respostas'}
                </div>
            </div>
            <i data-feather="chevron-right" style="width:24px;height:24px;stroke:var(--accent);"></i>
        </div>`;
    }).join("");

    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goHome()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">Lista de Treinos</div>
                    <div class="screen-sub">Toque em um treino para ver os detalhes</div>
                </div>
            </div>

            <div class="settings-panel-area">
                <div class="settings-panel-scroll">
                    ${trainingsHTML}
                </div>
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}
