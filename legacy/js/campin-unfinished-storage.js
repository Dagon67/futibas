/**
 * Jogos do Campin encerrados antes do fim do cronômetro — fila local para reenvio à planilha.
 * Usado por legacy/campin/campin.html e pela tela OnField (campinUnfinished.js).
 */
(function (global) {
  var KEY = "tutem_campin_unfinished_games";
  var MAX = 30;

  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function write(arr) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) { /* quota */ }
  }

  function append(entry) {
    if (!entry || !entry.storeId || !entry.sheetsPayload) return;
    var arr = read();
    arr.unshift(entry);
    if (arr.length > MAX) arr = arr.slice(0, MAX);
    write(arr);
  }

  function remove(storeId) {
    write(read().filter(function (x) { return x.storeId !== storeId; }));
  }

  function update(storeId, patch) {
    var arr = read();
    var changed = false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].storeId === storeId) {
        arr[i] = Object.assign({}, arr[i], patch);
        changed = true;
        break;
      }
    }
    if (changed) write(arr);
  }

  global.tutemCampinUnfinished = {
    KEY: KEY,
    read: read,
    write: write,
    append: append,
    remove: remove,
    update: update
  };
})(typeof window !== "undefined" ? window : this);
