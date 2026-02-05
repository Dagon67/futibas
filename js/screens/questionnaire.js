/* ===========================
   🖥️ TELA: QUESTIONÁRIO
   =========================== */

function goQuestionnaire(){
    state.currentScreen = "questionnaire";

    const mode = state.currentMode;
    const player = getPlayerById(state.currentPlayerId);
    const allQuestions = loadQuestions();
    const qsList = mode==="pre" ? allQuestions.pre : allQuestions.post;
    // Guardar textos na ordem exata usada na tela (evita discrepância com localStorage no clique)
    state.currentQuestionTexts = qsList.map(function(q){
        return typeof q === "string" ? q : (q && q.texto ? q.texto : "");
    });
    
    // Botão de voltar - verificar de onde veio
    let backButtonHTML = "";
    const cameFrom = state.cameFromScreen;
    
    if(cameFrom === "addPlayerToTraining" || cameFrom === "trainingDetails"){
        // Se veio de adicionar jogador atrasado ou detalhes do treino, voltar para detalhes
        backButtonHTML = `<button class="back-btn" onclick="viewTrainingDetails('${state.currentTrainingId}')">
            <i data-feather="arrow-left"></i>
            <span>${player ? player.name : "Voltar"}</span>
        </button>`;
    } else {
        // Caso normal (fluxo de questionários), voltar para seleção de jogador
        backButtonHTML = `<button class="back-btn" onclick="goSelectPlayer('${mode}')">
            <i data-feather="arrow-left"></i>
            <span>${player ? player.name : "Voltar"}</span>
        </button>`;
    }

    // montar inputs baseado no tipo de pergunta
    const qItemsHTML = qsList.map((qObj,idx)=>{
        const q = typeof qObj === 'string' ? {tipo:"texto",texto:qObj,opcoes:[],imagem:null} : qObj;
        const qText = q.texto || qObj;
        const safeId = "q_"+idx;
        const qId = "qid_"+idx;
        
        let inputHTML = "";
        if(q.tipo === "texto"){
            inputHTML = `<textarea class="q-input" rows="3" id="${safeId}" oninput="captureAnswerByIndex(${idx}, this.value)" placeholder="Digite aqui..." required></textarea>`;
        }else if(q.tipo === "nota"){
            const notaMax = q.notaMax || 10;
            const scale = Array.from({length: notaMax + 1}, (_, i) => i);
            inputHTML = `<div class="rating-scale" id="${qId}">
                ${scale.map(n=>
                    `<button type="button" class="rating-btn" onclick="selectRatingByIndex(${idx}, ${n}, '${qId}')">${n}</button>`
                ).join("")}
            </div>`;
        }else if(q.tipo === "escolha"){
            if(q.opcoes && q.opcoes.length > 0){
                inputHTML = `<div id="${qId}">
                    ${q.opcoes.map((opt,optIdx)=>
                        `<label class="radio-option">
                            <input type="radio" name="${safeId}" value="${opt}" onchange="captureAnswerByIndex(${idx}, this.value)" required>
                            <span>${opt}</span>
                        </label>`
                    ).join("")}
                </div>`;
            }else{
                inputHTML = `<div class="item-sub">Nenhuma opção configurada</div>`;
            }
        }else if(q.tipo === "checkbox"){
            if(q.opcoes && q.opcoes.length > 0){
                inputHTML = `<div id="${qId}">
                    ${q.opcoes.map((opt,optIdx)=>
                        `<label class="checkbox-option">
                            <input type="checkbox" name="${safeId}" value="${opt}" onchange="captureCheckboxAnswerByIndex(${idx}, this.value, this.checked)">
                            <span>${opt}</span>
                        </label>`
                    ).join("")}
                </div>`;
            }else{
                inputHTML = `<div class="item-sub">Nenhuma opção configurada</div>`;
            }
        }
        
        const imageHTML = q.imagem ? `<img src="${q.imagem}" alt="Imagem da pergunta" class="q-image">` : "";
        const qTextEscaped = (qText || "").replace(/"/g, "&quot;");
        return `
        <div class="q-item" data-question-index="${idx}" data-question-text="${qTextEscaped}">
            <div class="q-text">${qText} <span style="color:var(--pre-color);">*</span></div>
            ${imageHTML}
            ${inputHTML}
        </div>`;
    }).join("");

    renderScreen(`
        <div class="questionnaire-wrapper">
            <div class="back-row">
                ${backButtonHTML}
                <div>
                    <div class="screen-title">
                        ${mode==="pre" ? "Questionário Pré Treino" : "Questionário Pós Treino"}
                    </div>
                    <div class="screen-sub">
                        Todas as perguntas são obrigatórias. Responda com sinceridade.
                    </div>
                </div>
            </div>

            <div class="q-list">
                ${qItemsHTML}
            </div>

            <button class="submit-btn" id="submitAnswersBtn"
                onclick="submitAnswers()">
                Enviar Respostas
            </button>
        </div>
    `);
    
    // Ocultar botão de configurações
    updateSettingsButtonVisibility();
}

/** Retorna o texto da pergunta pelo índice. Usa a lista gravada ao abrir o questionário (state.currentQuestionTexts) para não depender de loadQuestions() no clique. */
function getQuestionTextByIndex(idx){
    if (state.currentQuestionTexts && Array.isArray(state.currentQuestionTexts) && state.currentQuestionTexts[idx] !== undefined) {
        return state.currentQuestionTexts[idx];
    }
    var qs = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
    var list = state.currentMode === "pre" ? qs.pre : qs.post;
    var q = list[idx];
    if (typeof q === "string") return q;
    return (q && q.texto) ? q.texto : "";
}

function captureAnswer(qText, val){
    state.tempAnswers[qText] = val;
}
function captureAnswerByIndex(idx, val){
    var qText = getQuestionTextByIndex(idx);
    if (qText) state.tempAnswers[qText] = val;
}

function selectRating(qText, value, containerId){
    state.tempAnswers[qText] = value.toString();
    var container = document.getElementById(containerId);
    if(container){
        var buttons = container.querySelectorAll('.rating-btn');
        buttons.forEach(function(btn, i){ btn.classList.toggle('selected', i === value); });
    }
}
function selectRatingByIndex(idx, value, containerId){
    var qText = getQuestionTextByIndex(idx);
    if (qText) state.tempAnswers[qText] = value.toString();
    var container = document.getElementById(containerId);
    if(container){
        var buttons = container.querySelectorAll('.rating-btn');
        buttons.forEach(function(btn, i){ btn.classList.toggle('selected', i === value); });
    }
}

function captureCheckboxAnswer(qText, value, checked){
    if(!state.tempAnswers[qText]) state.tempAnswers[qText] = [];
    if(!Array.isArray(state.tempAnswers[qText])) state.tempAnswers[qText] = [];
    if(checked){
        if(!state.tempAnswers[qText].includes(value)) state.tempAnswers[qText].push(value);
    }else{
        state.tempAnswers[qText] = state.tempAnswers[qText].filter(function(v){ return v !== value; });
    }
}
function captureCheckboxAnswerByIndex(idx, value, checked){
    var qText = getQuestionTextByIndex(idx);
    if (qText) captureCheckboxAnswer(qText, value, checked);
}

/** Lê todas as respostas do formulário no DOM e preenche state.tempAnswers. Usa índice como fonte da chave (state.currentQuestionTexts[i]) para garantir mesma chave que o backend no Sheets. */
function collectAnswersFromDOM(){
    var items = document.querySelectorAll(".q-item");
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        // Chave sempre pela lista de perguntas (mesma que loadQuestions / backend)
        var qText = state.currentQuestionTexts && state.currentQuestionTexts[i];
        if (!qText) {
            qText = item.getAttribute("data-question-text");
            if (qText) qText = qText.replace(/&quot;/g, '"').trim();
            if (!qText) {
                var textDiv = item.querySelector(".q-text");
                if (textDiv) qText = (textDiv.textContent || "").replace(/\s*\*\s*$/, "").trim();
            }
        }
        if (!qText) continue;
        var val = "";
        var textarea = item.querySelector("textarea.q-input");
        if (textarea) {
            val = (textarea.value || "").trim();
        } else {
            var scale = item.querySelector(".rating-scale");
            if (scale) {
                var sel = scale.querySelector(".rating-btn.selected");
                val = sel ? (sel.textContent || "").trim() : "";
            } else {
                var radio = item.querySelector('input[type="radio"]:checked');
                if (radio) val = radio.value || "";
                else {
                    var checks = item.querySelectorAll('input[type="checkbox"]:checked');
                    val = Array.prototype.slice.call(checks).map(function(c){ return c.value; });
                }
            }
        }
        state.tempAnswers[qText] = val;
    }
}

function submitAnswers(){
    var mode = state.currentMode;
    var allQuestions = loadQuestions();
    var qsList = mode === "pre" ? allQuestions.pre : allQuestions.post;

    // Coletar todas as respostas do DOM (chave = data-question-text de cada .q-item)
    collectAnswersFromDOM();

    var missing = [];
    for (var i = 0; i < qsList.length; i++) {
        var qObj = qsList[i];
        var q = typeof qObj === "string" ? { tipo: "texto", texto: qObj, opcoes: [], imagem: null } : qObj;
        var qText = q.texto || qObj;
        var answer = state.tempAnswers[qText];
        var isEmpty = !answer || (Array.isArray(answer) ? answer.length === 0 : answer.toString().trim() === "");
        if (isEmpty) missing.push(qText);
    }
    if (missing.length > 0 && !confirm("Faltam " + missing.length + " pergunta(s) sem resposta. Enviar mesmo assim? (as que tiver serão salvas)")) {
        return;
    }

    var btn = document.getElementById("submitAnswersBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

    finalizeQuestionnaireAndSave();
}
