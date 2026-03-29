/* ===========================
   🖥️ SUBTELA: CONFIGURAÇÕES - PERGUNTAS
   =========================== */

let questionFormState = {
    tipo: "texto",
    opcoes: [],
    imagemPreview: null,
    notaMax: 10   // escala de nota: 5, 10 ou 20
};

function renderSettingsQuestions(mode){
    const qs = loadQuestions();
    const list = mode==="pre" ? qs.pre : qs.post;
    const labelMode = mode==="pre" ? "pré treino" : "pós treino";

    const listHTML = list.map((qObj,idx)=>{
        const q = typeof qObj === 'string' ? {tipo:"texto",texto:qObj,opcoes:[],imagem:null} : qObj;
        const qText = q.texto || qObj;
        const tipoLabel = q.tipo === "texto" ? "Aberta" : q.tipo === "nota" ? "Nota" : q.tipo === "escolha" ? "Escolha única" : q.tipo === "duracao" ? "Duração" : q.tipo === "corpo" ? "Mapa corporal" : "Múltipla escolha";
        const hasImage = q.imagem ? `<small style="color:var(--accent);">📷 Com imagem</small>` : "";
        return `
        <div class="item-row" style="align-items:flex-start;">
            <div class="item-main">
                <div class="item-title">Pergunta ${idx+1} • ${tipoLabel}</div>
                <div class="item-sub">${qText}</div>
                ${hasImage}
            </div>
        </div>`;
    }).join("");

    return `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div class="item-sub" style="margin-bottom:0.5rem;">As perguntas são fixas e iguais para todos. Apenas visualização.</div>
            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Perguntas (${labelMode})</div>
                ${list.length ? listHTML : `<div class="item-sub">Nenhuma pergunta.</div>`}
            </div>
        </div>
    `;
}

function changeQuestionType(newType, mode){
    questionFormState.tipo = newType;
    if(newType === "nota" && !questionFormState.notaMax){
        questionFormState.notaMax = 10;
    }
    if(newType !== "escolha" && newType !== "checkbox"){
        questionFormState.opcoes = [];
    }else if(questionFormState.opcoes.length === 0){
        questionFormState.opcoes = [""];
    }
    renderSettings();
}

function addQuestionOption(mode){
    questionFormState.opcoes.push("");
    renderSettings();
}

function updateQuestionOption(index, value, mode){
    questionFormState.opcoes[index] = value;
}

function removeQuestionOption(index, mode){
    questionFormState.opcoes.splice(index, 1);
    renderSettings();
}

// Lista de extensões de imagem comuns
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

// Cache de imagens encontradas por pasta
const imageCache = {
    pre: null,
    post: null
};

function loadAvailableImages(mode){
    const imageFolder = mode === "pre" ? "pre" : "pos";
    const select = document.getElementById(`newQuestionImage_${mode}`);
    
    if(!select) return;
    
    // Limpar opções existentes (exceto a primeira)
    while(select.options.length > 1){
        select.remove(1);
    }
    
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Carregando imagens...';
    loadingOption.disabled = true;
    select.appendChild(loadingOption);
    
    // Tentar primeiro a API do backend (lista real da pasta)
    const backendUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : (window.BACKEND_URL || '');
    if(backendUrl){
        fetch(backendUrl + '/api/images/' + imageFolder)
            .then(function(r){ return r.json(); })
            .then(function(data){
                while(select.options.length > 1) select.remove(1);
                if(data.success && data.images && data.images.length > 0){
                    data.images.forEach(function(fileName){
                        const opt = document.createElement('option');
                        opt.value = fileName;
                        opt.textContent = fileName;
                        select.appendChild(opt);
                    });
                    imageCache[mode === "pre" ? "pre" : "post"] = data.images;
                } else {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = 'Nenhuma imagem na pasta';
                    opt.disabled = true;
                    select.appendChild(opt);
                }
            })
            .catch(function(){
                // Backend indisponível: usar descoberta por tentativa
                while(select.options.length > 1) select.remove(1);
                loadingOption.textContent = 'Carregando imagens...';
                select.appendChild(loadingOption);
                findImagesInFolder(imageFolder, mode);
            });
        return;
    }
    
    findImagesInFolder(imageFolder, mode);
}

function findImagesInFolder(folder, mode){
    const foundImages = [];
    const checkedImages = new Set();
    
    // Estratégia: tentar nomes específicos primeiro, depois números
    const namesToTry = [];
    
    // Nomes específicos conhecidos das pastas (usado só quando não há backend)
    const specificNames = [
        // Pre
        'articula', 'musculo', 'bem estar', 'recupera', 'sono', 'dor', 'fadiga', 'humor', 'estresse',
        // Pos
        'esforço',
        // Palavras comuns em português relacionadas a treino
        'articulacao', 'articulacoes', 'musculos', 'musculo',
        'bem-estar', 'bemestar', 'recuperacao', 'recuperar',
        'esforco', 'esforços', 'dores',
        'energia', 'disposicao', 'motivacao', 'concentracao',
        'flexibilidade', 'forca', 'resistencia', 'velocidade',
        'agilidade', 'coordenacao', 'equilibrio', 'postura',
        'aquecimento', 'alongamento', 'treino', 'exercicio',
        'corpo', 'perna', 'pernas', 'braco', 'bracos',
        'ombro', 'ombros', 'joelho', 'joelhos', 'tornozelo',
        'pescoco', 'costas', 'coluna', 'quadril', 'quadris'
    ];
    
    // Adicionar nomes específicos primeiro
    specificNames.forEach(name => {
        IMAGE_EXTENSIONS.forEach(ext => {
            namesToTry.push(`${name}.${ext}`);
            // Também tentar com espaço substituído por hífen ou underscore
            namesToTry.push(`${name.replace(/\s+/g, '-')}.${ext}`);
            namesToTry.push(`${name.replace(/\s+/g, '_')}.${ext}`);
        });
    });
    
    // Números de 1 a 100 com diferentes formatos
    for(let i = 1; i <= 100; i++){
        IMAGE_EXTENSIONS.forEach(ext => {
            namesToTry.push(`${i}.${ext}`);
            if(i < 100) namesToTry.push(`${String(i).padStart(2, '0')}.${ext}`);
            if(i < 10) namesToTry.push(`${String(i).padStart(3, '0')}.${ext}`);
        });
    }
    
    // Nomes genéricos comuns
    const commonNames = [
        'imagem', 'image', 'foto', 'photo', 'img', 'pic', 'picture',
        'foto1', 'foto2', 'foto3', 'imagem1', 'imagem2', 'imagem3',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'
    ];
    commonNames.forEach(name => {
        IMAGE_EXTENSIONS.forEach(ext => {
            namesToTry.push(`${name}.${ext}`);
        });
    });
    
    let completed = 0;
    const total = namesToTry.length;
    const batchSize = 50; // Processar em lotes
    let currentBatch = 0;
    
    function processBatch(startIndex){
        const endIndex = Math.min(startIndex + batchSize, total);
        let batchCompleted = 0;
        
        for(let i = startIndex; i < endIndex; i++){
            const fileName = namesToTry[i];
            if(checkedImages.has(fileName)) {
                batchCompleted++;
                completed++;
                continue;
            }
            
            const imagePath = `${folder}/${fileName}`;
            const img = new Image();
            
            let isResolved = false;
            
            // Timeout mais longo para imagens maiores
            const timeout = setTimeout(() => {
                if(!isResolved && !checkedImages.has(fileName)){
                    checkedImages.add(fileName);
                    isResolved = true;
                    batchCompleted++;
                    completed++;
                    
                    if(completed === total || completed % 50 === 0){
                        populateImageSelect([...foundImages].sort(), mode);
                    }
                }
            }, 1000); // Aumentado para 1 segundo
            
            img.onload = function(){
                if(!isResolved){
                    clearTimeout(timeout);
                    isResolved = true;
                    if(!checkedImages.has(fileName)){
                        foundImages.push(fileName);
                        checkedImages.add(fileName);
                    }
                    batchCompleted++;
                    completed++;
                    
                    // Atualizar select periodicamente
                    if(foundImages.length > 0 && (foundImages.length % 5 === 0 || completed === total)){
                        populateImageSelect([...foundImages].sort(), mode);
                    }
                }
            };
            
            img.onerror = function(){
                if(!isResolved){
                    clearTimeout(timeout);
                    isResolved = true;
                    if(!checkedImages.has(fileName)){
                        checkedImages.add(fileName);
                    }
                    batchCompleted++;
                    completed++;
                    
                    if(completed === total || completed % 50 === 0){
                        populateImageSelect([...foundImages].sort(), mode);
                    }
                }
            };
            
            // Tentar carregar a imagem
            img.src = imagePath;
        }
        
        // Processar próximo lote
        if(endIndex < total){
            setTimeout(() => processBatch(endIndex), 50);
        } else {
            // Finalizar após um pequeno delay para garantir que todas as imagens foram processadas
            setTimeout(() => {
                populateImageSelect([...foundImages].sort(), mode);
            }, 1500);
        }
    }
    
    // Iniciar processamento
    processBatch(0);
    
    // Timeout de segurança - aumentar para dar mais tempo
    setTimeout(() => {
        if(completed < total){
            populateImageSelect([...foundImages].sort(), mode);
        }
    }, 15000); // 15 segundos para garantir que todas as imagens sejam verificadas
}

function populateImageSelect(images, mode){
    const select = document.getElementById(`newQuestionImage_${mode}`);
    if(!select) return;
    
    // Limpar todas as opções (exceto a primeira)
    while(select.options.length > 1){
        select.remove(1);
    }
    
    if(images.length === 0){
        const noImagesOption = document.createElement('option');
        noImagesOption.value = '';
        noImagesOption.textContent = 'Nenhuma imagem encontrada';
        noImagesOption.disabled = true;
        select.appendChild(noImagesOption);
        return;
    }
    
    // Ordenar imagens
    images.sort();
    
    // Adicionar opções
    images.forEach(fileName => {
        const option = document.createElement('option');
        option.value = fileName;
        option.textContent = fileName;
        select.appendChild(option);
    });
    
    // Salvar no cache
    const cacheKey = mode === "pre" ? "pre" : "post";
    imageCache[cacheKey] = images;
}

function handleImageSelect(fileName, mode){
    if(!fileName) {
        questionFormState.imagemPreview = null;
        const previewEl = document.getElementById(`imagePreview_${mode}`);
        if(previewEl){
            previewEl.style.display = "none";
        }
        return;
    }
    
    previewQuestionImageFromFolder(fileName, mode);
}

// Carregar imagens automaticamente quando a tela é renderizada
let imageLoaderInitialized = false;

function previewQuestionImageFromFolder(fileName, mode){
    const trimmedName = fileName ? fileName.trim() : "";
    const imageFolder = mode === "pre" ? "pre" : "pos";
    
    if(!trimmedName){
        questionFormState.imagemPreview = null;
        const previewEl = document.getElementById(`imagePreview_${mode}`);
        if(previewEl){
            previewEl.style.display = "none";
        }
        return;
    }
    
    // Construir caminho relativo
    const imagePath = `${imageFolder}/${trimmedName}`;
    
    // Tentar carregar a imagem da pasta
    const img = new Image();
    img.onload = function(){
        questionFormState.imagemPreview = imagePath;
        const previewEl = document.getElementById(`imagePreview_${mode}`);
        if(previewEl){
            previewEl.src = imagePath;
            previewEl.style.display = "block";
        }else{
            renderSettings();
        }
    };
    img.onerror = function(){
        // Se não conseguir carregar, usar o nome do arquivo mesmo
        questionFormState.imagemPreview = imagePath;
        const previewEl = document.getElementById(`imagePreview_${mode}`);
        if(previewEl){
            previewEl.src = imagePath;
            previewEl.style.display = "block";
        }else{
            renderSettings();
        }
    };
    img.src = imagePath;
}

function previewQuestionImage(url, mode){
    // Função mantida para compatibilidade, mas agora usa a nova função
    previewQuestionImageFromFolder(url, mode);
}

function addQuestion(mode){
    const ta = document.getElementById(`newQuestionText_${mode}`);
    const text = ta.value.trim();
    if(!text){
        alert("Digite o texto da pergunta.");
        return;
    }
    
    const tipo = questionFormState.tipo;
    let opcoes = [];
    
    if(tipo === "escolha" || tipo === "checkbox"){
        opcoes = questionFormState.opcoes.filter(o => o.trim() !== "");
        if(opcoes.length < 2){
            alert(`Perguntas do tipo "${tipo === 'escolha' ? 'Escolha única' : 'Múltipla escolha'}" precisam de pelo menos 2 opções.`);
            return;
        }
    }
    
    const imageInput = document.getElementById(`newQuestionImage_${mode}`);
    const imageFileName = imageInput ? imageInput.value.trim() : null;
    
    // Construir caminho completo baseado na pasta
    let imagem = null;
    if(imageFileName){
        const imageFolder = mode === "pre" ? "pre" : "pos";
        imagem = `${imageFolder}/${imageFileName}`;
    }
    
    const qs = loadQuestions();
    const newQ = {
        tipo: tipo,
        texto: text,
        opcoes: opcoes,
        imagem: imagem || null
    };
    if(tipo === "nota"){
        const notaMaxEl = document.getElementById(`newQuestionNotaMax_${mode}`);
        newQ.notaMax = notaMaxEl ? (parseInt(notaMaxEl.value, 10) || 10) : (questionFormState.notaMax || 10);
    }
    
    if(mode==="pre"){
        qs.pre.push(newQ);
    }else{
        qs.post.push(newQ);
    }
    saveQuestions(qs);
    
    // Limpar formulário
    ta.value = "";
    if(imageInput) imageInput.value = "";
    questionFormState = {
        tipo: "texto",
        opcoes: [],
        imagemPreview: null,
        notaMax: 10
    };
    renderSettings();
}

function removeQuestion(mode, idx){
    if(!confirm("Tem certeza que deseja remover esta pergunta?")){
        return;
    }
    const qs = loadQuestions();
    if(mode==="pre"){
        qs.pre.splice(idx,1);
    }else{
        qs.post.splice(idx,1);
    }
    saveQuestions(qs);
    renderSettings();
}
