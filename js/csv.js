/* ===========================
   💾 RESPOSTAS E CSV
   =========================== */

function finalizeQuestionnaireAndSave(){
    const mode = state.currentMode;
    const playerId = state.currentPlayerId;
    const trainingId = state.currentTrainingId;
    const player = getPlayerById(playerId);
    if(!player || !trainingId) return;

    // Criar resposta
    const response = {
        playerId,
        playerName: player.name,
        timestamp: nowTimestamp(),
        answers: {...state.tempAnswers}
    };

    // Salvar no treino
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(training){
        if(!training.responses) training.responses = [];
        // Remover resposta anterior do mesmo jogador se existir
        training.responses = training.responses.filter(r => r.playerId !== playerId);
        training.responses.push(response);
        saveTrainings(trainings);
    }

    // Também salvar no array principal de respostas (para compatibilidade com CSV)
    const responses = loadResponses();
    responses.push({
        mode,
        trainingId,
        trainingDate: training.dateFormatted || training.date,
        ...response
    });
    saveResponses(responses);

    // marcar jogador como já respondeu nesta rodada
    const idx = state.pendingByMode[mode].indexOf(playerId);
    if(idx>=0){
        state.pendingByMode[mode].splice(idx,1);
    }

    // limpar respostas temporárias
    state.tempAnswers = {};
    state.currentPlayerId = null;

    // Verificar de onde veio para saber para onde voltar
    const cameFrom = state.cameFromScreen;
    
    // Se veio de adicionar jogador atrasado, voltar para detalhes do treino
    if(cameFrom === "addPlayerToTraining" || cameFrom === "trainingDetails"){
        if(trainingId){
            viewTrainingDetails(trainingId);
            state.cameFromScreen = null;
            return;
        }
    }

    // Fluxo normal: sempre voltar para selectPlayer (tela onde mostra quem precisa responder)
    // Só sai dessa tela quando todos responderem e clicar em "Iniciar Treino" ou usar senha
    goSelectPlayer(mode);
    state.cameFromScreen = null;
}

// gera CSV de todas respostas já colhidas
function generateCSV(){
    // Coletar todas respostas de todos treinos
    const trainings = loadTrainings();
    const allResponses = [];
    trainings.forEach(t => {
        (t.responses || []).forEach(r => {
            allResponses.push({
                ...r,
                mode: t.mode,
                trainingId: t.id,
                trainingDate: t.dateFormatted || t.date
            });
        });
    });

    // Cabeçalho dinâmico: juntar todas perguntas possíveis
    const qs = loadQuestions();
    const allQ = [...qs.pre, ...qs.post];
    // Criar mapa de texto da pergunta para ID único
    const questionMap = new Map();
    allQ.forEach((q,idx)=>{
        const qText = typeof q === 'string' ? q : q.texto;
        if(!questionMap.has(qText)){
            questionMap.set(qText, qText);
        }
    });
    const uniqueQuestions = Array.from(questionMap.keys());

    // cabeçalho
    // data treino, mode, playerName, timestamp, depois cada pergunta, comentario
    const header = ["data_treino","modo","jogador","datahora", ...uniqueQuestions.map(q => sanitizeCSVHeader(q)), "comentario"];

    const rows = [header];

    allResponses.forEach(r=>{
        const row = [];
        row.push(r.trainingDate || "");
        row.push(r.mode==="pre"?"Pré":"Pós");
        row.push(r.playerName || "");
        row.push(r.timestamp || "");
        uniqueQuestions.forEach(qText=>{
            const answer = r.answers[qText];
            let answerStr = "";
            if(Array.isArray(answer)){
                answerStr = answer.join("; ");
            }else if(answer != null){
                answerStr = answer.toString();
            }
            row.push(answerStr.replace(/\r?\n/g," "));
        });
        // Adicionar comentário
        row.push((r.comment || "").replace(/\r?\n/g," "));
        rows.push(row);
    });

    // montar CSV string
    const csvString = rows.map(cols => cols.map(csvEscape).join(",")).join("\r\n");
    return csvString;

    function csvEscape(val){
        const v = (val==null?"":String(val));
        if(v.includes('"') || v.includes(",") || v.includes("\n")){
            return '"'+v.replace(/"/g,'""')+'"';
        }
        return v;
    }
    function sanitizeCSVHeader(h){
        return h.replace(/[\r\n,]+/g," ").trim();
    }
}

// baixa CSV
function downloadCSV(){
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dt = luxon.DateTime.now().toFormat("yyyyLLdd_HHmmss");
    a.download = "respostas_treino_"+dt+".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
