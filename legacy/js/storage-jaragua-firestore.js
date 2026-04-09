/* ===========================
   💾 STORAGE — app Jaraguá (app.js) + Firestore (sem Google Sheets)
   ===========================
   POLÍTICA: só o tenant legado `jaragua-futsal` usa Google Sheets.
   Tenants como `brazil` usam o MESMO bundle que Jaraguá (storage.js + app.js),
   com esta camada por cima: roster/current + trainingExports no Firestore.

   Não carregar este ficheiro para `jaragua-futsal` nem para `magnus`.
*/

;(function () {
    if (typeof window !== "undefined") {
        if (window.__TUTEM_JARAGUA_FS_STORAGE_LOADED__) return;
        window.__TUTEM_JARAGUA_FS_STORAGE_LOADED__ = true;
    }

    const FIRESTORE_SDK = "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

    const jaraguaTemplateDefaultPlayers = [
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

    const brazilDefaultPlayers = [
        { id: "br_p1", number: 1, name: "Willian (Norlisk)", position: "Goleiro", lateralidade: null },
        { id: "br_p2", number: 2, name: "Matheus (JEC)", position: "Goleiro", lateralidade: null },
        { id: "br_p3", number: 3, name: "Nicolas (Jaraguá)", position: "Goleiro", lateralidade: null },
        { id: "br_p4", number: 4, name: "Neguinho (Barcelona/Palma)", position: "Fixo", lateralidade: null },
        { id: "br_p5", number: 5, name: "Marlon (Selangor/ElPozo)", position: "Fixo", lateralidade: null },
        { id: "br_p6", number: 6, name: "Lucas Gomes (Magnus)", position: "Fixo", lateralidade: null },
        { id: "br_p7", number: 7, name: "Marcel (El Pozo)", position: "Ala", lateralidade: null },
        { id: "br_p8", number: 8, name: "Dyego (Al-Ula/Barcelona)", position: "Ala", lateralidade: null },
        { id: "br_p9", number: 9, name: "Fabinho (Palma)", position: "Ala", lateralidade: null },
        { id: "br_p10", number: 10, name: "Arthur (Benfica)", position: "Ala", lateralidade: null },
        { id: "br_p11", number: 11, name: "Felipe Valério (Sporting)", position: "Ala", lateralidade: null },
        { id: "br_p12", number: 12, name: "Pito (Barcelona)", position: "Pivô", lateralidade: null },
        { id: "br_p13", number: 13, name: "Rafa Santos (El Pozo)", position: "Pivô", lateralidade: null },
        { id: "br_p14", number: 14, name: "Rocha (Sporting)", position: "Pivô", lateralidade: null }
    ];

    const defaultQuestions = {
        pre: [
            { tipo: "nota", texto: "Qualidade Total de Recuperação", opcoes: [], imagem: "pre/recupera.png", notaMin: 1, notaMax: 20 },
            { tipo: "nota", texto: "Nível de fadiga", opcoes: [], imagem: "pre/fadiga.jpg", notaMin: 1, notaMax: 5 },
            { tipo: "nota", texto: "Nível de sono", opcoes: [], imagem: "pre/sono.jpg", notaMin: 1, notaMax: 5 },
            { tipo: "nota", texto: "Nível de dor", opcoes: [], imagem: "pre/dor.jpg", notaMin: 1, notaMax: 5 },
            { tipo: "nota", texto: "Nível de estresse", opcoes: [], imagem: "pre/estresse.jpg", notaMin: 1, notaMax: 5 },
            { tipo: "nota", texto: "Nível de humor", opcoes: [], imagem: "pre/humor.jpg", notaMin: 1, notaMax: 5 },
            { tipo: "corpo", texto: "Pontos de dor", opcoes: [], imagem: null },
            { tipo: "checkbox", texto: "Pontos de dor articular", opcoes: ["Sem dor", "1", "2", "3", "4", "5", "6", "7", "8", "9"], imagem: "pre/articula.png" }
        ],
        post: [
            { tipo: "nota", texto: "Estado atual", opcoes: [], imagem: "pos/esforço.png", notaMax: 10 },
            { tipo: "duracao", texto: "Quanto tempo de treino foi feito?", opcoes: [], imagem: null }
        ]
    };

    function getQuestionsLsKey() {
        var tid = (typeof window !== "undefined" && window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId)
            ? String(window.__TUTEM_TENANT__.tenantId)
            : "tenant";
        return "tutem_firestore_questions_" + tid.replace(/[^a-z0-9_-]/gi, "_");
    }

    let cachePlayers = [];
    let cacheTrainings = [];
    let initPromise = null;

    function getTenantFirestoreContext() {
        const tenant = typeof window !== "undefined" ? window.__TUTEM_TENANT__ : null;
        const db = typeof window !== "undefined" ? window.__TUTEM_FIREBASE_DB__ : null;
        if (!tenant || !tenant.tenantId || !db) return null;
        return { tenantId: tenant.tenantId, db: db };
    }

    function stripLargePhotosDeep(obj, depth) {
        depth = depth || 0;
        if (depth > 40 || obj == null) return;
        if (Array.isArray(obj)) {
            obj.forEach(function (item) { stripLargePhotosDeep(item, depth + 1); });
            return;
        }
        if (typeof obj !== "object") return;
        if (obj.photo && typeof obj.photo === "string" && obj.photo.length > 8000) {
            obj.photoOmitted = true;
            delete obj.photo;
        }
        Object.keys(obj).forEach(function (k) {
            stripLargePhotosDeep(obj[k], depth + 1);
        });
    }

    function cloneTrainingForExport(training) {
        const copy = JSON.parse(JSON.stringify(training || {}));
        stripLargePhotosDeep(copy);
        return copy;
    }

    function cloneQuestionsForExport() {
        const qsRaw = typeof loadQuestions === "function" ? loadQuestions() : defaultQuestions;
        const copy = JSON.parse(JSON.stringify(qsRaw || defaultQuestions));
        stripLargePhotosDeep(copy);
        return copy;
    }

    async function persistRosterToFirestore(players) {
        const ctx = getTenantFirestoreContext();
        if (!ctx) return;
        const firestore = await import(FIRESTORE_SDK);
        const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
        await firestore.setDoc(
            ref,
            { updatedAt: firestore.serverTimestamp(), players: players || [] },
            { merge: true }
        );
    }

    async function persistTrainingToFirestore(training) {
        const ctx = getTenantFirestoreContext();
        if (!ctx || !training || !training.id) return;
        const firestore = await import(FIRESTORE_SDK);
        const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "trainingExports", String(training.id));
        const pair = {
            training: cloneTrainingForExport(training),
            questionsAtExport: { pre: (cloneQuestionsForExport().pre || []), post: (cloneQuestionsForExport().post || []) }
        };
        await firestore.setDoc(
            ref,
            { updatedAt: firestore.serverTimestamp(), trainingId: String(training.id), ...pair },
            { merge: true }
        );
    }

    async function loadRosterFromFirestore() {
        const ctx = getTenantFirestoreContext();
        if (!ctx) return [];
        try {
            const firestore = await import(FIRESTORE_SDK);
            const ref = firestore.doc(ctx.db, "tenants", ctx.tenantId, "roster", "current");
            const snap = await firestore.getDoc(ref);
            if (!snap.exists()) return [];
            const data = snap.data() || {};
            const players = data.players;
            if (Array.isArray(players)) return players;
            if (players && typeof players === "object") return Object.values(players);
            return [];
        } catch (e) {
            console.warn("Firestore roster/current:", e);
            return [];
        }
    }

    async function loadActiveTrainingsFromFirestore() {
        const ctx = getTenantFirestoreContext();
        if (!ctx) return [];
        try {
            const firestore = await import(FIRESTORE_SDK);
            const colRef = firestore.collection(ctx.db, "tenants", ctx.tenantId, "trainingExports");
            const snap = await firestore.getDocs(colRef);

            const out = [];
            snap.forEach(function (docSnap) {
                const data = docSnap.data() || {};
                const training = data.training || {};
                if (!training || typeof training !== "object") return;
                if (training.status === "completed") return;
                out.push(training);
            });

            out.sort(function (a, b) {
                const ad = a.datetime || a.date || "";
                const bd = b.datetime || b.date || "";
                return new Date(bd) - new Date(ad);
            });
            return out;
        } catch (e) {
            console.warn("Firestore trainingExports:", e);
            return [];
        }
    }

    async function initJaraguaFirestoreStorage(force) {
        if (force) initPromise = null;
        if (initPromise && !force) return initPromise;
        initPromise = (async function () {
            cachePlayers = await loadRosterFromFirestore();
            cacheTrainings = await loadActiveTrainingsFromFirestore();
        })();
        return initPromise;
    }

    window.initJaraguaFirestoreStorage = initJaraguaFirestoreStorage;

    function loadPlayers() {
        return cachePlayers || [];
    }

    function savePlayers(players) {
        cachePlayers = Array.isArray(players) ? players : [];
        persistRosterToFirestore(cachePlayers).catch(function (err) {
            console.warn("Firestore roster persist:", err);
        });
    }

    function loadQuestions() {
        try {
            const raw = localStorage.getItem(getQuestionsLsKey());
            if (!raw) return defaultQuestions;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.pre || !parsed.post) return defaultQuestions;
            return parsed;
        } catch (e) {
            return defaultQuestions;
        }
    }

    function saveQuestions(qs) {
        try {
            localStorage.setItem(getQuestionsLsKey(), JSON.stringify(qs || defaultQuestions));
        } catch (e) {}
    }

    function loadTrainings() {
        return cacheTrainings || [];
    }

    function saveTrainings(trainings) {
        if (!Array.isArray(trainings)) return;
        cacheTrainings = trainings;
        trainings.forEach(function (t) {
            persistTrainingToFirestore(t).catch(function (err) {
                console.warn("Firestore training persist:", err);
            });
        });
    }

    function loadResponses() {
        const out = [];
        (cacheTrainings || []).forEach(function (t) {
            const mode = t.mode || null;
            const trainingId = t.id || null;
            const trainingDate = t.dateFormatted || t.date || null;
            (t.responses || []).forEach(function (r) {
                out.push(Object.assign({}, r, {
                    mode: mode,
                    trainingId: trainingId,
                    trainingDate: trainingDate
                }));
            });
        });
        return out;
    }

    function saveResponses(_responses) {}

    function playersListNeedsSheetsPush() {
        return false;
    }
    function markPlayersListNeedsSheetsPush() {}
    function clearPlayersListNeedsSheetsPush() {}

    function clearAllAppStorage() {
        cachePlayers = [];
        cacheTrainings = [];
        try {
            localStorage.removeItem(getQuestionsLsKey());
        } catch (e) {}
        initPromise = null;
        return true;
    }

    function cancelSyncDebounce() {}

    function clearTrainingsAndResponses() {
        cacheTrainings = [];
    }

    window.__tutemFirestoreJaraguaDefaultPlayers = function () {
        var tid = (typeof window !== "undefined" && window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId)
            ? window.__TUTEM_TENANT__.tenantId
            : null;
        if (tid === "brazil") return brazilDefaultPlayers;
        return jaraguaTemplateDefaultPlayers;
    };

    window.loadPlayers = loadPlayers;
    window.savePlayers = savePlayers;
    window.loadQuestions = loadQuestions;
    window.saveQuestions = saveQuestions;
    window.loadTrainings = loadTrainings;
    window.saveTrainings = saveTrainings;
    window.loadResponses = loadResponses;
    window.saveResponses = saveResponses;
    window.clearAllAppStorage = clearAllAppStorage;
    window.clearTrainingsAndResponses = clearTrainingsAndResponses;
    window.playersListNeedsSheetsPush = playersListNeedsSheetsPush;
    window.markPlayersListNeedsSheetsPush = markPlayersListNeedsSheetsPush;
    window.clearPlayersListNeedsSheetsPush = clearPlayersListNeedsSheetsPush;
    window.cancelSyncDebounce = cancelSyncDebounce;
})();
