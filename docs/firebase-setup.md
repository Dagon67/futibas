# Firebase no painel (`legacy/`)

## Fluxo

1. **Login Firebase** (e-mail/senha) — sessão persistente no browser.
2. Leitura do documento **`users/{uid}`** no Firestore (`tenantId`, etc.).
3. **Senha do painel** (a mesma de sempre, hash no `index.html`).
4. Arranque da app (`startTutemApp`).

## Ficheiros

- `legacy/js/firebase-config.js` — objeto `firebaseConfig` (podes copiar de `firebase-config.example.js`).
- `legacy/js/firebase-auth-gate.js` — módulo que trata do Auth + gate das telas.
- `legacy/js/sheets_sync.js` — após sync completo ao Sheets, grava **`tenants/{tenantId}/snapshot/last`** no Firestore (espelho dos dados; fotos base64 muito grandes podem ser omitidas).

## Testar localmente

Use um servidor HTTP (`npx serve .` na raiz do repo ou na pasta `legacy/`), **não** abra o HTML por `file://` — módulos ES e o Firebase precisam de origem `http(s)`.

## Logout para testes

Abre `legacy/index.html?firebaseLogout=1` (ou a URL equivalente no Render) para terminar sessão Firebase e recarregar.

## Console Firebase

- **Authorized domains:** domínio do Render + `localhost`.
- **Firestore rules:** ver `docs/firebase-firestore-rules.md`.

## Reverter código

Foi criado o branch Git `backup/pre-firebase-auth-2026-03-29` apontando para o commit anterior à integração (ajusta se o teu histórico for outro).
