/* ===========================
   💾 STORAGE / LOCALSTORAGE
   =========================== */

const STORAGE_KEYS = {
    PLAYERS: "treino_players",
    QUESTIONS: "treino_questions",
    RESPONSES: "treino_responses",
    TRAININGS: "treino_trainings",
    RESUME_STATE: "treino_resume_state"
};

// Jogadores padrão da temporada (usados quando não há dados salvos ou ao restaurar padrão)
const defaultPlayers = [
    { id: "default_02", number: 2, name: "Tatinho", position: "Ala", lateralidade: "Canhoto" },
    { id: "default_07", number: 7, name: "Bruninho", position: "Ala", lateralidade: "Destro" },
    { id: "default_08", number: 8, name: "Leco", position: "Fixo", lateralidade: null },
    { id: "default_10", number: 10, name: "Pedrinho", position: "Ala", lateralidade: "Canhoto" },
    { id: "default_11", number: 11, name: "William", position: "Ala", lateralidade: "Destro" },
    { id: "default_14", number: 14, name: "Eka", position: "Pivô", lateralidade: null },
    { id: "default_16", number: 16, name: "Caetano", position: "Fixo", lateralidade: null },
    { id: "default_20", number: 20, name: "João Roberto", position: "Pivô", lateralidade: null },
    { id: "default_22", number: 22, name: "Nicolas", position: "Goleiro", lateralidade: null },
    { id: "default_26", number: 26, name: "Bruno Rafael", position: "Ala", lateralidade: "Destro" },
    { id: "default_28", number: 28, name: "Nenen Ribeiro", position: "Fixo", lateralidade: null },
    { id: "default_30", number: 30, name: "Gui Uesler", position: "Fixo", lateralidade: null },
    { id: "default_31", number: 31, name: "Valenga", position: "Goleiro", lateralidade: null },
    { id: "default_33", number: 33, name: "Cadu", position: "Goleiro", lateralidade: null },
    { id: "default_44", number: 44, name: "Matheus", position: "Ala", lateralidade: "Destro" },
    { id: "default_88", number: 88, name: "Marcênio", position: "Fixo", lateralidade: null },
    { id: "default_90", number: 90, name: "Santiago", position: "Ala", lateralidade: "Canhoto" },
    { id: "default_91", number: 91, name: "Menegazzo", position: "Goleiro", lateralidade: null }
];

// Perguntas padrão: Qualidade 1–20; fadiga/sono/dor/estresse/humor 1–5; Pontos de dor A–Z; Pontos articular 1–9
const defaultQuestions = {
    pre: [
        {tipo:"nota",texto:"Qualidade Total de Recuperação",opcoes:[],imagem:"pre/recupera.png",notaMin:1,notaMax:20},
        {tipo:"nota",texto:"Nível de fadiga",opcoes:[],imagem:"pre/fadiga.jpg",notaMin:1,notaMax:5},
        {tipo:"nota",texto:"Nível de sono",opcoes:[],imagem:"pre/sono.jpg",notaMin:1,notaMax:5},
        {tipo:"nota",texto:"Nível de dor",opcoes:[],imagem:"pre/dor.jpg",notaMin:1,notaMax:5},
        {tipo:"nota",texto:"Nível de estresse",opcoes:[],imagem:"pre/estresse.jpg",notaMin:1,notaMax:5},
        {tipo:"nota",texto:"Nível de humor",opcoes:[],imagem:"pre/humor.jpg",notaMin:1,notaMax:5},
        {tipo:"checkbox",texto:"Pontos de dor",opcoes:["Sem dor","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],imagem:"pre/musculo.png"},
        {tipo:"checkbox",texto:"Pontos de dor articular",opcoes:["Sem dor","1","2","3","4","5","6","7","8","9"],imagem:"pre/articula.png"}
    ],
    post: [
        {tipo:"nota",texto:"Estado atual",opcoes:[],imagem:"pos/esforço.png",notaMax:10},
        {tipo:"duracao",texto:"Quanto tempo de treino foi feito?",opcoes:[],imagem:null}
    ]
};

// Carregar / salvar localStorage
function loadPlayers(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    }catch(e){return []}
}
function savePlayers(players){
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    // Sheets só é atualizado ao clicar em "Sincronizar agora" ou "Finalizar treino e sincronizar"
}

/** Perguntas são sempre as mesmas para todos (definidas no app). Não usa localStorage. */
function loadQuestions(){
    return defaultQuestions;
}
function saveQuestions(qs){
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(qs));
    // Sheets só é atualizado ao clicar em "Sincronizar agora" ou "Finalizar treino e sincronizar"
}

function loadResponses(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES)) || [];
    }catch(e){return []}
}
function saveResponses(r){
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(r));
    // Sheets só é atualizado ao finalizar treino ou ao clicar em "Sincronizar" / "Limpar treinos"
}

// Treinos (sessões de treino)
function loadTrainings(){
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.TRAININGS);
        if (raw == null || raw === "") return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (e) {
        console.warn("loadTrainings: falha ao ler localStorage", e);
        return [];
    }
}
function saveTrainings(trainings){
    if (!Array.isArray(trainings)) return;
    try {
        localStorage.setItem(STORAGE_KEYS.TRAININGS, JSON.stringify(trainings));
    } catch (e) {
        console.error("Erro ao salvar treinos:", e);
    }
}

/**
 * Limpa todo o localStorage usado pelo app (treinos, respostas, jogadores, perguntas, estado de continuar).
 * Use para resetar o dispositivo quando houver problema com versão anterior ou dados antigos.
 * Após limpar, a página recarrega e o app volta ao estado inicial.
 */
function clearAllAppStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.TRAININGS);
        localStorage.removeItem(STORAGE_KEYS.RESPONSES);
        localStorage.removeItem(STORAGE_KEYS.PLAYERS);
        localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
        localStorage.removeItem(STORAGE_KEYS.RESUME_STATE);
        return true;
    } catch (e) {
        console.error("clearAllAppStorage:", e);
        return false;
    }
}

/**
 * Limpa treinos e respostas no localStorage e no Google Sheets.
 * Use após "Limpar treinos" para zerar tudo e permitir recomeçar (ex.: recriar abas pre/pos no Sheets).
 */
function clearTrainingsAndResponses() {
    localStorage.setItem(STORAGE_KEYS.TRAININGS, "[]");
    localStorage.setItem(STORAGE_KEYS.RESPONSES, "[]");
    if (typeof cancelSyncDebounce === "function") cancelSyncDebounce();
    if (typeof syncAllToSheets === "function") {
        syncAllToSheets().catch(function (err) { console.error("Erro ao limpar Sheets:", err); });
    }
}

// garantir defaults (perguntas vêm sempre de defaultQuestions, não são gravadas)
// Jogadores: carregados do servidor (jogadores.json) em app.js quando localStorage vazio
if(!localStorage.getItem(STORAGE_KEYS.RESPONSES)){
    saveResponses([]);
}
if(!localStorage.getItem(STORAGE_KEYS.TRAININGS)){
    saveTrainings([]);
}