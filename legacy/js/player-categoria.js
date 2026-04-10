/* Categoria do plantel: profissional | sub20 (Firestore/Sheets + UI). */
(function (global) {
    global.ROSTER_CATEGORIA_PRO = "profissional";
    global.ROSTER_CATEGORIA_SUB20 = "sub20";

    global.normalizePlayerCategoria = function (p) {
        var c = p && p.categoria != null ? String(p.categoria).toLowerCase().replace(/\s+/g, " ").trim() : "";
        if (c === "sub-20" || c === "sub20" || (c.indexOf("sub") === 0 && c.indexOf("20") >= 0)) {
            return global.ROSTER_CATEGORIA_SUB20;
        }
        if (c === "profissional" || c === "pro" || c === "professional") {
            return global.ROSTER_CATEGORIA_PRO;
        }
        return "";
    };

    /** filter: profissional | sub20 — jogadores sem categoria aparecem nas duas listas. */
    global.playerMatchesRosterCategoria = function (p, filter) {
        if (!filter) return true;
        var n = global.normalizePlayerCategoria(p);
        if (!n) return true;
        return n === filter;
    };

    global.categoriaDisplayLabel = function (p) {
        var n = global.normalizePlayerCategoria(p);
        if (n === global.ROSTER_CATEGORIA_SUB20) return "Sub-20";
        if (n === global.ROSTER_CATEGORIA_PRO) return "Profissional";
        return "";
    };
})(typeof window !== "undefined" ? window : globalThis);
