/* ===========================
   💾 RESPOSTAS E CSV
   =========================== */

function finalizeQuestionnaireAndSave(){
    const mode = state.currentMode;
    const playerId = state.currentPlayerId;
    const trainingId = state.currentTrainingId;
    const player = getPlayerById(playerId);
    if(!player || !trainingId) return;

    // Montar answers com uma entrada por pergunta (mesma ordem/chave que o backend usa no Sheets)
    const allQuestions = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
    const qsList = mode === "pre" ? (allQuestions.pre || []) : (allQuestions.post || []);
    const answers = {};
    for (let i = 0; i < qsList.length; i++) {
        const q = qsList[i];
        const qText = typeof q === "string" ? q : (q && q.texto ? q.texto : "");
        if (!qText) continue;
        let val = state.tempAnswers[qText];
        if (val === undefined || val === null) val = "";
        if (Array.isArray(val)) {
            val = val.length === 0 ? "" : val.join("");
        }
        answers[qText] = val;
    }
    // Incluir qualquer resposta extra que veio do DOM e não está na lista (compatibilidade)
    Object.keys(state.tempAnswers).forEach(function(k) {
        if (answers[k] === undefined) answers[k] = state.tempAnswers[k];
    });

    const response = {
        playerId,
        playerName: player.name,
        playerNumber: player.number != null ? player.number : "",
        timestamp: nowTimestamp(),
        answers: answers
    };

    // Salvar no treino (cópia profunda para garantir que o localStorage persista corretamente)
    const trainings = loadTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if(training){
        if(!training.responses) training.responses = [];
        training.responses = training.responses.filter(r => r.playerId !== playerId);
        training.responses.push(response);
        saveTrainings(JSON.parse(JSON.stringify(trainings)));
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

    // Não sincronizar aqui: o Sheets só recebe ao clicar "Iniciar Treino" (só esse treino) ou "Finalizar e sincronizar" em Treinos

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

// Modelo de exportação para Sheets (1ª pergunta = Qualidade Total de Recuperação, etc.)
var EXPORT_HEADERS_PRE = [
    "Qualidade Total de Recuperação",
    "Bem Estar [Fadiga]",
    "Bem Estar [Qualidade de Sono]",
    "Bem Estar [Dor Muscular]",
    "Bem Estar [Nível de Estresse]",
    "Bem Estar [Humor]",
    "Pontos de Dor",
    "Pontos de Dor Articular"
];

// gera CSV de todas respostas já colhidas (modelo compatível com o Sheet)
function generateCSV(){
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

    const qs = loadQuestions();
    const preQs = (qs.pre || []).map(q => typeof q === 'string' ? { texto: q } : q);
    const postQs = (qs.post || []).map(q => typeof q === 'string' ? { texto: q } : q);

    // Cabeçalho: Carimbo, Nome, Modo, colunas do modelo pré (EXPORT_HEADERS_PRE), colunas pós (texto das perguntas), Comentário
    const postHeaders = postQs.map(q => sanitizeCSVHeader(q.texto));
    const header = ["Carimbo de data/hora", "Nome", "Modo", ...EXPORT_HEADERS_PRE, ...postHeaders, "Comentário"];
    const rows = [header];

    allResponses.forEach(r => {
        const row = [];
        row.push(r.timestamp || "");
        row.push(r.playerName || "");
        row.push(r.mode === "pre" ? "Pré" : "Pós");

        // Respostas pré (por ordem; Pontos de dor/articular já vêm como string sem separador)
        for (let i = 0; i < EXPORT_HEADERS_PRE.length; i++) {
            const qText = preQs[i] ? preQs[i].texto : null;
            const raw = r.mode === "pre" && qText && r.answers[qText] != null ? r.answers[qText] : "";
            const val = Array.isArray(raw) ? raw.join("") : String(raw);
            row.push((val || "").replace(/\r?\n/g, " "));
        }
        // Respostas pós (por ordem)
        postQs.forEach(q => {
            const raw = r.mode === "post" && r.answers[q.texto] != null ? r.answers[q.texto] : "";
            const val = Array.isArray(raw) ? raw.join("") : String(raw);
            row.push((val || "").replace(/\r?\n/g, " "));
        });
        row.push((r.comment || "").replace(/\r?\n/g, " "));
        rows.push(row);
    });

    const csvString = rows.map(cols => cols.map(csvEscape).join(",")).join("\r\n");
    return csvString;

    function csvEscape(val) {
        const v = (val == null ? "" : String(val));
        if (v.includes('"') || v.includes(",") || v.includes("\n")) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }
    function sanitizeCSVHeader(h) {
        return (h || "").replace(/[\r\n,]+/g, " ").trim();
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
