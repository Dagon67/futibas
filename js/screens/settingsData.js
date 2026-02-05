/* ===========================
   🖥️ SUBTELA: CONFIGURAÇÕES - DADOS / CSV
   =========================== */

function renderSettingsData(){
    const answers = loadResponses();
    // breve resumo
    let resumoHTML = "";
    if(!answers.length){
        resumoHTML = `<div class="item-sub">Ainda não há respostas registradas.</div>`;
    }else{
        resumoHTML = answers.slice().reverse().slice(0,5).map(r=>{
            return `
                <div class="item-row">
                    <div class="item-main">
                        <div class="item-title">
                            ${r.playerName} • ${r.mode==="pre"?"Pré":"Pós"}
                        </div>
                        <div class="item-sub">
                            ${r.timestamp}<br/>
                            ${Object.keys(r.answers).length} respostas coletadas
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    return `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div class="item-title" style="margin-bottom:.5rem;">Sincronizar com Google Sheets</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                O Sheets é atualizado ao clicar em "Sincronizar agora" ou "Finalizar treino e sincronizar", e <strong>automaticamente quando todos os jogadores respondem</strong> a um treino.
            </div>
            <button class="small-solid-btn" type="button" onclick="syncAllToSheets().then(function(){ alert('Planilha atualizada.'); }).catch(function(e){ alert('Erro: ' + (e && e.message ? e.message : e)); });" style="margin-bottom:1rem;">
                Sincronizar agora
            </button>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Teste de envio (pré-treino)</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Preenche todas as perguntas pré com valores de teste usando o primeiro jogador cadastrado, envia para o Sheets e, após 60 segundos, verifica se os dados chegaram na planilha. Abra o console (F12) para ver os logs de debug.
            </div>
            <button class="small-solid-btn" type="button" onclick="runTestSyncSheets()" style="background:var(--post-color);color:#000;">
                Teste envio Sheets
            </button>
            <div id="testSyncFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;">Limpar treinos</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Apaga todos os treinos e respostas no app e na planilha (Sheets). Use para recomeçar e recriar as abas pre/pos corretamente.
            </div>
            <button class="small-solid-btn" type="button" onclick="confirmClearTrainingsAndResponses()" style="background:var(--card-stroke);color:var(--text-dim);">
                Limpar treinos e respostas
            </button>
            <div id="clearTrainingsFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Exportar CSV</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                O CSV segue o modelo do Sheet: 1ª pergunta pré = Qualidade Total de Recuperação, etc.
            </div>
            <div class="inline-form-row" style="align-items:center;">
                <div class="item-sub" style="flex:1;min-width:200px;">
                    Baixe todas as respostas (pré e pós) em .csv para análise ou importação no Sheets.
                </div>
                <button class="download-btn" onclick="downloadCSV()">
                    Baixar CSV
                </button>
            </div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Perguntas (localStorage)</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                As perguntas ficam no <strong>localStorage</strong> do navegador. Cada dispositivo/navegador tem o seu. Para usar as mesmas perguntas no app do Render (ou em outro aparelho): exporte aqui, abra o app no outro lugar, importe abaixo.
            </div>
            <button class="small-solid-btn" type="button" onclick="copyCurrentQuestionsAsDefault()">
                Exportar perguntas (copiar JSON)
            </button>
            <div id="copyQuestionsFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1rem;">Importar perguntas</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Cole o JSON das perguntas (exportado de outro navegador ou deste) e clique em Importar.
            </div>
            <textarea id="importQuestionsJson" placeholder='Cole aqui o JSON (ex: {"pre":[...],"post":[...]})' style="width:100%;min-height:80px;padding:0.5rem;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.2);background:#000;color:var(--text-main);font-size:0.875rem;resize:vertical;"></textarea>
            <button class="small-solid-btn" type="button" onclick="importQuestionsFromJson()">
                Importar perguntas
            </button>
            <div id="importQuestionsFeedback" style="font-size:0.875rem;margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Jogadores (localStorage)</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                A lista de jogadores também fica no localStorage. Exporte/importe para usar a mesma lista no app do Render ou em outro aparelho.
            </div>
            <button class="small-solid-btn" type="button" onclick="copyCurrentPlayersAsJson()">
                Exportar jogadores (copiar JSON)
            </button>
            <div id="copyPlayersFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>
            <div class="item-title" style="margin-bottom:.5rem;margin-top:1rem;">Importar jogadores</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Cole o JSON da lista de jogadores e clique em Importar (substitui a lista atual).
            </div>
            <textarea id="importPlayersJson" placeholder='Cole aqui o JSON (ex: [{"id":"...","name":"...","number":10,...}])' style="width:100%;min-height:80px;padding:0.5rem;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.2);background:#000;color:var(--text-main);font-size:0.875rem;resize:vertical;"></textarea>
            <button class="small-solid-btn" type="button" onclick="importPlayersFromJson()">
                Importar jogadores
            </button>
            <div id="importPlayersFeedback" style="font-size:0.875rem;margin-top:0.25rem;display:none;"></div>

            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Últimas respostas</div>
                ${resumoHTML}
            </div>
        </div>
    `;
}

function confirmClearTrainingsAndResponses(){
    if (!confirm("Isso vai apagar TODOS os treinos e respostas no app e na planilha (Sheets). Tem certeza?")) return;
    clearTrainingsAndResponses();
    var el = document.getElementById("clearTrainingsFeedback");
    if (el) { el.style.display = "block"; el.textContent = "Treinos e respostas apagados. Planilha está sendo atualizada."; el.style.color = "var(--accent)"; }
    setTimeout(function(){ if (el) { el.style.display = "none"; } }, 5000);
    setTimeout(function(){ renderSettingsData(); renderSettings(); }, 1500);
}

function copyCurrentQuestionsAsDefault(){
    const qs = loadQuestions();
    const json = JSON.stringify(qs, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function(){
            var el = document.getElementById("copyQuestionsFeedback");
            if (el) { el.style.display = "block"; el.textContent = "Copiado. Abra o app no Render (ou outro navegador), vá em Configurações > Dados e importe abaixo."; el.style.color = "var(--accent)"; }
            setTimeout(function(){ if (el) { el.style.display = "none"; } }, 3000);
        }).catch(function(){
            fallbackCopy(json);
        });
    } else {
        fallbackCopy(json);
    }
}
function fallbackCopy(text){
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        var el = document.getElementById("copyQuestionsFeedback");
        if (el) { el.style.display = "block"; el.textContent = "Copiado. Cole na tela de Importar no outro navegador (ex.: no Render)."; }
    } catch(e) {}
    document.body.removeChild(ta);
}

function importQuestionsFromJson(){
    var elInput = document.getElementById("importQuestionsJson");
    var elFeedback = document.getElementById("importQuestionsFeedback");
    if (!elInput || !elFeedback) return;
    var raw = (elInput.value || "").trim();
    if (!raw) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Cole o JSON das perguntas no campo acima.";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 4000);
        return;
    }
    try {
        var data = JSON.parse(raw);
        if (!data || typeof data !== "object") throw new Error("JSON inválido");
        var pre = Array.isArray(data.pre) ? data.pre : [];
        var post = Array.isArray(data.post) ? data.post : [];
        saveQuestions({ pre: pre, post: post });
        elFeedback.style.display = "block";
        elFeedback.style.color = "var(--accent)";
        elFeedback.textContent = "Perguntas importadas (" + pre.length + " pré, " + post.length + " pós). Recarregue a tela de perguntas se precisar.";
        elInput.value = "";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 5000);
    } catch (e) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Erro: " + (e && e.message ? e.message : "JSON inválido. Verifique o texto colado.");
    }
}

function copyCurrentPlayersAsJson(){
    var players = typeof loadPlayers === "function" ? loadPlayers() : [];
    var json = JSON.stringify(players, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function(){
            var el = document.getElementById("copyPlayersFeedback");
            if (el) { el.style.display = "block"; el.textContent = "Copiado. Abra o app no Render (ou outro navegador) e importe jogadores abaixo."; el.style.color = "var(--accent)"; }
            setTimeout(function(){ if (el) { el.style.display = "none"; } }, 3000);
        }).catch(function(){ fallbackCopyPlayers(json); });
    } else {
        fallbackCopyPlayers(json);
    }
}
function fallbackCopyPlayers(text){
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        var el = document.getElementById("copyPlayersFeedback");
        if (el) { el.style.display = "block"; el.textContent = "Copiado. Cole na tela de Importar no outro navegador."; }
    } catch(e) {}
    document.body.removeChild(ta);
}

function importPlayersFromJson(){
    var elInput = document.getElementById("importPlayersJson");
    var elFeedback = document.getElementById("importPlayersFeedback");
    if (!elInput || !elFeedback) return;
    var raw = (elInput.value || "").trim();
    if (!raw) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Cole o JSON dos jogadores no campo acima.";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 4000);
        return;
    }
    try {
        var data = JSON.parse(raw);
        if (!Array.isArray(data)) throw new Error("O JSON deve ser um array de jogadores.");
        savePlayers(data);
        elFeedback.style.display = "block";
        elFeedback.style.color = "var(--accent)";
        elFeedback.textContent = "Jogadores importados (" + data.length + ").";
        elInput.value = "";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 5000);
    } catch (e) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Erro: " + (e && e.message ? e.message : "JSON inválido. Verifique o texto colado.");
    }
}

/**
 * Teste de envio: preenche todas as perguntas pré com um jogador, envia ao Sheets e após 60s verifica se chegou.
 * Use o console (F12) para ver os logs de debug.
 */
function runTestSyncSheets(){
    var feedbackEl = document.getElementById("testSyncFeedback");
    function setFeedback(msg, isError){
        if (feedbackEl) {
            feedbackEl.style.display = "block";
            feedbackEl.textContent = msg;
            feedbackEl.style.color = isError ? "rgba(239,68,68,.9)" : "var(--accent)";
        }
    }
    console.debug("[TESTE SHEETS] Iniciando...");
    var players = typeof loadPlayers === "function" ? loadPlayers() : [];
    if (!players.length) {
        console.debug("[TESTE SHEETS] Nenhum jogador cadastrado.");
        setFeedback("Cadastre pelo menos um jogador para testar.", true);
        return;
    }
    var firstPlayer = players[0];
    console.debug("[TESTE SHEETS] Jogador de teste:", firstPlayer.name, firstPlayer.id);
    var qs = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
    var preList = qs.pre || [];
    if (!preList.length) {
        console.debug("[TESTE SHEETS] Nenhuma pergunta pré cadastrada.");
        setFeedback("Cadastre perguntas pré para testar.", true);
        return;
    }
    var answers = {};
    for (var i = 0; i < preList.length; i++) {
        var q = preList[i];
        var texto = typeof q === "string" ? q : (q && q.texto ? q.texto : "");
        if (!texto) continue;
        var tipo = (q && q.tipo) ? q.tipo : "nota";
        answers[texto] = tipo === "texto" ? "teste envio" : "7";
    }
    console.debug("[TESTE SHEETS] Respostas de teste (por pergunta):", answers);
    var ts = typeof nowTimestamp === "function" ? nowTimestamp() : new Date().toISOString();
    var trainingId = "teste_" + Date.now();
    var dateFormatted = typeof luxon !== "undefined" && luxon.DateTime ? luxon.DateTime.now().toFormat("dd/LL/yyyy") : new Date().toLocaleDateString("pt-BR");
    var response = {
        playerId: firstPlayer.id,
        playerName: firstPlayer.name,
        playerNumber: firstPlayer.number != null ? firstPlayer.number : "",
        timestamp: ts,
        answers: answers
    };
    var training = {
        id: trainingId,
        mode: "pre",
        date: new Date().toISOString().slice(0, 10),
        dateFormatted: dateFormatted,
        datetime: ts,
        period: "",
        playerIds: [firstPlayer.id],
        responses: [response]
    };
    var trainings = typeof loadTrainings === "function" ? loadTrainings() : [];
    trainings.push(training);
    if (typeof saveTrainings === "function") saveTrainings(trainings);
    console.debug("[TESTE SHEETS] Treino de teste salvo. trainingId:", trainingId);
    var responses = typeof loadResponses === "function" ? loadResponses() : [];
    responses.push({
        mode: "pre",
        trainingId: trainingId,
        trainingDate: dateFormatted,
        playerId: response.playerId,
        playerName: response.playerName,
        playerNumber: response.playerNumber,
        timestamp: response.timestamp,
        answers: response.answers
    });
    if (typeof saveResponses === "function") saveResponses(responses);
    console.debug("[TESTE SHEETS] Respostas salvas. Enviando sync...");
    setFeedback("Enviando teste... Aguarde.", false);
    var backendUrl = typeof getBackendUrl === "function" ? getBackendUrl() : (window.BACKEND_URL || "http://localhost:5000");
    if (typeof syncAllToSheets !== "function") {
        setFeedback("Função syncAllToSheets não disponível.", true);
        return;
    }
    syncAllToSheets()
        .then(function(result){
            console.debug("[TESTE SHEETS] Sync concluído:", result);
            if (result && result.success === false) {
                setFeedback((result.error || "Erro ao sincronizar.") + " (Abra F12 para mais detalhes.)", true);
                return;
            }
            setFeedback("Teste enviado. Em 60 segundos será verificada a planilha...", false);
            setTimeout(function(){
                console.debug("[TESTE SHEETS] Verificando aba pre no Sheets (após 60s)...");
                setFeedback("Verificando planilha...", false);
                fetch(backendUrl + "/verify/pre?last=5")
                    .then(function(r){ return r.json(); })
                    .then(function(data){
                        console.debug("[TESTE SHEETS] Resposta /verify/pre:", data);
                        if (!data.success || !data.rows || !data.rows.length) {
                            setFeedback("Verificação: não foi possível ler a aba pre ou está vazia. Veja o console.", true);
                            return;
                        }
                        var rows = data.rows;
                        var header = rows[0] || [];
                        var dataRows = rows.slice(1);
                        var nomeCol = header.indexOf("Nome Jogador");
                        if (nomeCol === -1) nomeCol = 4;
                        var found = false;
                        for (var r = 0; r < dataRows.length; r++) {
                            var row = dataRows[r];
                            var nome = (row[nomeCol] || "").toString().trim();
                            if (nome === firstPlayer.name) {
                                var hasSeven = row.some(function(cell){ return (cell || "").toString().trim() === "7"; });
                                var hasTeste = row.some(function(cell){ return (cell || "").toString().indexOf("teste") !== -1; });
                                if (hasSeven || hasTeste) {
                                    found = true;
                                    console.debug("[TESTE SHEETS] Linha do teste encontrada na planilha:", row);
                                    break;
                                }
                            }
                        }
                        if (found) {
                            setFeedback("Sucesso: os dados do teste chegaram na planilha (aba pre).", false);
                        } else {
                            setFeedback("A planilha foi lida, mas a linha do teste não foi encontrada. Confira a aba pre manualmente.", true);
                        }
                    })
                    .catch(function(err){
                        console.debug("[TESTE SHEETS] Erro ao verificar:", err);
                        setFeedback("Erro ao verificar planilha: " + (err && err.message ? err.message : err), true);
                    });
            }, 60000);
        })
        .catch(function(err){
            console.debug("[TESTE SHEETS] Erro no sync:", err);
            setFeedback("Erro ao enviar: " + (err && err.message ? err.message : err), true);
        });
}
