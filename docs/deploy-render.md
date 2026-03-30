# Deploy no Render (app legado)

O backend Flask do app monolito (Google Sheets) fica em `backend/legacy/`.

## Web Service (API)

- **Build Command:** `pip install -r backend/legacy/requirements.txt && pip install gunicorn`
- **Start Command:** `cd backend/legacy && gunicorn app:app --bind 0.0.0.0:$PORT`

Variáveis úteis:

- `GOOGLE_APPLICATION_CREDENTIALS` — caminho absoluto ao JSON da service account no disco do Render (ex.: `/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS` se usares **Secret File**), ou `/opt/render/project/src/backend/legacy/seu-arquivo.json` se o ficheiro estiver no repo (não recomendado).

## Erro: `cd: sheets: No such file or directory`

O código do API está em **`backend/legacy/`**, não numa pasta `sheets`. No painel do Render → serviço Web → **Settings**, confirma:

- **Build Command:** `pip install -r backend/legacy/requirements.txt && pip install gunicorn`
- **Start Command:** `cd backend/legacy && gunicorn app:app --bind 0.0.0.0:$PORT`

Se estiver `cd sheets && ...`, apaga e cola o comando acima. Grava e faz **Manual Deploy** → **Clear build cache & deploy** (opcional, se algo ficar em cache).

## Static Site (frontend)

- **Publish directory:** `legacy` (não a raiz do repo), para servir `index.html`, `totem.html`, `js/`, etc.
- **Variáveis de ambiente:** não são obrigatórias para Firebase (config em `legacy/js/firebase-config.js`).
- **Firebase:** no Console → Authentication → **Authorized domains**, inclua o domínio do static site (ex.: `teu-app.onrender.com`) e `localhost` para testes. Regras do Firestore: ver `docs/firebase-firestore-rules.md`.

O fluxo principal com login é o **`legacy/index.html`**. O `totem.html` é um modo alternativo (bundle próprio) e **não** inclui o gate Firebase; use o painel normal para acesso protegido.

No HTML (`legacy/index.html`, `legacy/totem.html`), mantenha `window.BACKEND_URL` apontando para a URL do Web Service.

Fotos enviadas pelo app são gravadas em `uploads/players/` na **raiz do repositório** (o Flask em `backend/legacy` já resolve esse caminho). Em produção, disco efêmero pode apagar arquivos ao reiniciar — para persistência use commit automático (`GIT_AUTO_COMMIT`), storage externo ou migração futura para Firestore.

## Free tier

Serviços gratuitos hibernam; o primeiro request após dormir pode falhar (502) — normal, tente de novo em ~1–2 minutos.
