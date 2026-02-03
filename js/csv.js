/* ===========================
   💾 RESPOSTAS E CSV
   =========================== */

function finalizeQuestionnaireAndSave(){
    const mode = state.currentMode;
    const playerId = state.currentPlayerId;
    const trainingId = state.currentTrainingId;
    const player = getPlayerById(playerId);
    if(!player || !trainingId) return;

    // Criar resposta (incluir número para planilha legível)
    const response = {
        playerId,
        playerName: player.name,
        playerNumber: player.number != null ? player.number : "",
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

    // Quando todos responderam, atualizar o Sheets automaticamente
    if (state.pendingByMode[mode] && state.pendingByMode[mode].length === 0 && typeof syncAllToSheets === "function") {
        syncAllToSheets().catch(function(err){ console.error("Erro ao sincronizar com Sheets:", err); });
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

        // Respostas pré (por ordem: 1ª pergunta cadastrada = Qualidade Total de Recuperação)
        for (let i = 0; i < EXPORT_HEADERS_PRE.length; i++) {
            const qText = preQs[i] ? preQs[i].texto : null;
            const val = r.mode === "pre" && qText && r.answers[qText] != null
                ? (Array.isArray(r.answers[qText]) ? r.answers[qText].join("; ") : String(r.answers[qText]))
                : "";
            row.push((val || "").replace(/\r?\n/g, " "));
        }
        // Respostas pós (por ordem)
        postQs.forEach(q => {
            const val = r.mode === "post" && r.answers[q.texto] != null
                ? (Array.isArray(r.answers[q.texto]) ? r.answers[q.texto].join("; ") : String(r.answers[q.texto]))
                : "";
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
