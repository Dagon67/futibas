/* ===========================
   🖥️ TELA: CONFIGURAÇÃO INICIAL DO TREINO
   =========================== */

function goTrainingSetup(){
    state.currentScreen = "trainingSetup";
    setHeaderModeLabel("Novo Treino");
    if (!state.rosterCategoriaFilter) state.rosterCategoriaFilter = ROSTER_CATEGORIA_PRO;
    
    const now = luxon.DateTime.now().setLocale('pt-BR');
    const currentDate = now.toFormat("dd/MM/yyyy");
    const currentDay = now.toFormat("EEEE");
    const capitalizedDay = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
    
    // Determinar período atual baseado na hora
    const currentHour = now.hour;
    let suggestedPeriod = "tarde";
    if(currentHour >= 5 && currentHour < 12){
        suggestedPeriod = "manha";
    } else if(currentHour >= 12 && currentHour < 18){
        suggestedPeriod = "tarde";
    } else {
        suggestedPeriod = "noite";
    }
    
    renderScreen(`
        <div class="center-flex-col">
            <div class="back-row" style="width:100%;justify-content:flex-start;">
                <button class="back-btn" onclick="goHome()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
            </div>
            
            <div class="screen-title" style="margin-bottom:1rem;">Configurar Treino</div>
            <div class="screen-sub" style="margin-bottom:2rem;">Confirme a data e escolha o período</div>
            
            <div style="width:100%;max-width:600px;display:flex;flex-direction:column;gap:var(--touch-gap);">
                <!-- Data -->
                <div class="label-col">
                    <label>Data do Treino</label>
                    <input type="date" id="training-date" value="${now.toFormat('yyyy-MM-dd')}" style="font-size:var(--touch-font-md);">
                    <div style="margin-top:0.5rem;color:var(--text-dim);font-size:var(--touch-font-md);">
                        ${capitalizedDay}, ${currentDate}
                    </div>
                </div>
                
                <!-- Categoria (filtra jogadores no pré/pós) -->
                <div class="label-col">
                    <label>Categoria do plantel</label>
                    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.5rem;">
                        <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_PRO ? 'selected' : ''}" 
                            data-roster-cat="${ROSTER_CATEGORIA_PRO}"
                            onclick="selectTrainingRosterCategoria('${ROSTER_CATEGORIA_PRO}')">
                            <div>Profissional</div>
                        </button>
                        <button type="button" class="period-btn ${state.rosterCategoriaFilter === ROSTER_CATEGORIA_SUB20 ? 'selected' : ''}" 
                            data-roster-cat="${ROSTER_CATEGORIA_SUB20}"
                            onclick="selectTrainingRosterCategoria('${ROSTER_CATEGORIA_SUB20}')">
                            <div>Sub-20</div>
                        </button>
                    </div>
                </div>
                
                <!-- Período -->
                <div class="label-col">
                    <label>Período do Treino</label>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:0.5rem;">
                        <button class="period-btn ${suggestedPeriod === 'manha' ? 'selected' : ''}" 
                            data-period="manha" 
                            onclick="selectPeriod('manha')">
                            <i data-feather="sunrise"></i>
                            <div>Manhã</div>
                        </button>
                        <button class="period-btn ${suggestedPeriod === 'tarde' ? 'selected' : ''}" 
                            data-period="tarde" 
                            onclick="selectPeriod('tarde')">
                            <i data-feather="sun"></i>
                            <div>Tarde</div>
                        </button>
                        <button class="period-btn ${suggestedPeriod === 'noite' ? 'selected' : ''}" 
                            data-period="noite" 
                            onclick="selectPeriod('noite')">
                            <i data-feather="moon"></i>
                            <div>Noite</div>
                        </button>
                    </div>
                </div>
                
                <button class="submit-btn" onclick="confirmTrainingSetup()" style="margin-top:1rem;">
                    Confirmar e Continuar
                </button>
            </div>
        </div>
    `);
    
    // Inicializar período selecionado
    state.trainingPeriod = suggestedPeriod;
    
    updateSettingsButtonVisibility();
    feather.replace();
}

function selectTrainingRosterCategoria(cat) {
    if (cat !== ROSTER_CATEGORIA_PRO && cat !== ROSTER_CATEGORIA_SUB20) return;
    state.rosterCategoriaFilter = cat;
    document.querySelectorAll("[data-roster-cat]").forEach(function (btn) {
        btn.classList.toggle("selected", btn.getAttribute("data-roster-cat") === cat);
    });
}

function selectPeriod(period){
    state.trainingPeriod = period;
    
    // Atualizar visual dos botões
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`[data-period="${period}"]`);
    if(selectedBtn){
        selectedBtn.classList.add('selected');
    }
}

function confirmTrainingSetup(){
    const dateInput = document.getElementById('training-date');
    if(!dateInput || !dateInput.value){
        alert("Selecione uma data para o treino.");
        return;
    }
    
    if(!state.trainingPeriod){
        alert("Selecione o período do treino.");
        return;
    }
    
    // Salvar data e período no state
    const selectedDate = luxon.DateTime.fromISO(dateInput.value);
    state.trainingDate = selectedDate.toFormat("yyyy-MM-dd");
    state.trainingDateFormatted = selectedDate.setLocale('pt-BR').toFormat("dd/MM/yyyy");
    
    // Ir para escolha de modo (pré/pós)
    goChooseMode();
}
