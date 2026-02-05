/* ===========================
   🖥️ TELA: CONFIGURAÇÕES
   =========================== */

function goSettings(){
    // parar atualização do relógio quando sair do menu
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    state.currentScreen = "settings";
    state.currentMode = null;
    state.currentPlayerId = null;
    setHeaderModeLabel("Configurações");
    renderSettings();
    
    // Ocultar botão de configurações (estamos dentro das configurações)
    updateSettingsButtonVisibility();
}

function setSettingsTab(tab){
    state.settingsTab = tab;
    // Resetar formulário de perguntas ao trocar de aba
    questionFormState = {
        tipo: "texto",
        opcoes: [],
        imagemPreview: null,
        notaMax: 10
    };
    renderSettings();
}

/** Restaura as perguntas (pré e pós) ao conjunto padrão do app. Apenas administradores alteram perguntas. */
function restoreDefaultQuestions(){
    if (!confirm("Restaurar todas as perguntas ao padrão? As perguntas atuais serão substituídas.")) return;
    saveQuestions(defaultQuestions);
    renderSettings();
}

function renderSettings(){
    const tab = state.settingsTab;

    let panelHTML = "";

    if(tab==="questionsPre"){
        panelHTML = renderSettingsQuestions("pre");
    }else if(tab==="questionsPost"){
        panelHTML = renderSettingsQuestions("post");
    }else if(tab==="data"){
        panelHTML = renderSettingsData();
    }

    renderScreen(`
        <div class="settings-wrapper">

            <div class="back-row">
                <button class="back-btn" onclick="goHome()">
                    <i data-feather="arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <div>
                    <div class="screen-title">Configurações</div>
                    <div class="screen-sub">Gestão de perguntas e dados.</div>
                </div>
            </div>

            <div class="tab-row">
                <button class="tab-btn" data-active="${tab==="questionsPre"}" onclick="setSettingsTab('questionsPre')">Perguntas Pré</button>
                <button class="tab-btn" data-active="${tab==="questionsPost"}" onclick="setSettingsTab('questionsPost')">Perguntas Pós</button>
                <button class="tab-btn" data-active="${tab==="data"}" onclick="setSettingsTab('data')">Dados / CSV</button>
            </div>

            <div class="settings-panel-area">
                <div class="settings-panel-scroll">
                    ${panelHTML}
                </div>
            </div>

        </div>
    `);

    feather.replace();
}
