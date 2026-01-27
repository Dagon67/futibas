/* ===========================
   💾 STORAGE / LOCALSTORAGE
   =========================== */

const STORAGE_KEYS = {
    PLAYERS: "treino_players",
    QUESTIONS: "treino_questions",
    RESPONSES: "treino_responses",
    TRAININGS: "treino_trainings"  // Sessões de treino
};

// inicial: perguntas pré e pós
const defaultQuestions = {
    pre: [
        {tipo:"texto",texto:"Como você está se sentindo hoje fisicamente?",opcoes:[],imagem:null},
        {tipo:"nota",texto:"Qual seu nível de fadiga agora?",opcoes:[],imagem:null},
        {tipo:"texto",texto:"Sentiu dor ou desconforto em alguma parte do corpo?",opcoes:[],imagem:null},
        {tipo:"nota",texto:"Dormiu bem?",opcoes:[],imagem:null}
    ],
    post: [
        {tipo:"texto",texto:"Como você está se sentindo após o treino?",opcoes:[],imagem:null},
        {tipo:"texto",texto:"Sentiu dor aguda em algum momento?",opcoes:[],imagem:null},
        {tipo:"nota",texto:"Nível de esforço hoje?",opcoes:[],imagem:null},
        {tipo:"escolha",texto:"Você acha que consegue treinar igual amanhã?",opcoes:["Sim","Não","Talvez"],imagem:null}
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
    // Sincronizar com Google Sheets
    if(typeof syncToSheets === 'function'){
        syncToSheets('players', players).catch(err => console.error('Erro ao sincronizar jogadores:', err));
    }
}

function loadQuestions(){
    try{
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS));
        if(!saved) return defaultQuestions;
        // Migrar perguntas antigas (strings) para novo formato (objetos)
        const migrated = {pre:[],post:[]};
        ['pre','post'].forEach(mode=>{
            if(Array.isArray(saved[mode])){
                saved[mode].forEach(q=>{
                    if(typeof q === 'string'){
                        // Migrar string para objeto
                        migrated[mode].push({tipo:"texto",texto:q,opcoes:[],imagem:null});
                    }else if(q && typeof q === 'object'){
                        // Já está no formato novo
                        migrated[mode].push({
                            tipo:q.tipo || "texto",
                            texto:q.texto || q,
                            opcoes:Array.isArray(q.opcoes) ? q.opcoes : [],
                            imagem:q.imagem || null
                        });
                    }
                });
            }
        });
        return migrated;
    }catch(e){return defaultQuestions}
}
function saveQuestions(qs){
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(qs));
    // Sincronizar com Google Sheets
    if(typeof syncToSheets === 'function'){
        syncToSheets('questions', qs).catch(err => console.error('Erro ao sincronizar perguntas:', err));
    }
}

function loadResponses(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES)) || [];
    }catch(e){return []}
}
function saveResponses(r){
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(r));
    // Sincronizar com Google Sheets (precisa das perguntas para criar cabeçalho)
    // Incluir treinos também para coletar todas as respostas
    if(typeof syncToSheets === 'function'){
        const questions = loadQuestions();
        const trainings = loadTrainings();
        const payload = {
            type: 'responses',
            data: r,
            questions: questions,
            trainings: trainings
        };
        // Usar a função syncToSheets se disponível, senão usar URL dinâmica
        const backendUrl = (typeof getBackendUrl === 'function' ? getBackendUrl() : (window.BACKEND_URL || 'http://localhost:5000'));
        fetch(`${backendUrl}/sync`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        }).catch(err => console.error('Erro ao sincronizar respostas:', err));
    }
}

// Treinos (sessões de treino)
function loadTrainings(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRAININGS)) || [];
    }catch(e){return []}
}
function saveTrainings(trainings){
    localStorage.setItem(STORAGE_KEYS.TRAININGS, JSON.stringify(trainings));
    // Sincronizar com Google Sheets
    if(typeof syncToSheets === 'function'){
        syncToSheets('trainings', trainings).catch(err => console.error('Erro ao sincronizar treinos:', err));
    }
}

// garantir defaults
if(!localStorage.getItem(STORAGE_KEYS.QUESTIONS)){
    saveQuestions(defaultQuestions);
}
if(!localStorage.getItem(STORAGE_KEYS.PLAYERS)){
    savePlayers([]);
}
if(!localStorage.getItem(STORAGE_KEYS.RESPONSES)){
    saveResponses([]);
}
if(!localStorage.getItem(STORAGE_KEYS.TRAININGS)){
    saveTrainings([]);
}