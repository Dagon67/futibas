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

Fotos enviadas pelo app são gravadas em `uploads/players/` na **raiz do repositório** (o Flask em `backend/legacy` já resolve esse caminho). No Render o disco é **efémero**; para gravar no **GitHub** sem depender de `git` no servidor:

### Fotos no repositório GitHub (API)

1. Cria um **Personal Access Token** (classic) ou **fine-grained** com permissão de escrita no repositório (scope *Contents: Read and write* no repo).
2. No Render → Web Service → **Environment**:
   - `GITHUB_TOKEN` — o token (marca como **Secret**).
   - `GITHUB_REPO` — `owner/repo` (ex.: `Dagon67/futibas`).
   - `GITHUB_BRANCH` — opcional, default `main`.
3. Cada upload chama a [GitHub Contents API](https://docs.github.com/rest/repos/contents#create-or-update-file-contents) e faz commit em `uploads/players/<ficheiro>`.
4. A resposta da API devolve ao browser a URL **`https://raw.githubusercontent.com/.../uploads/players/...`** (repositório **público**: a imagem abre em qualquer lado; após redeploy o ficheiro já vem no clone).

**Repositório privado:** o `raw.githubusercontent.com` pode não servir a imagem no `<img>` sem auth. Define `PLAYER_PHOTO_USE_RENDER_URL=true` para a app continuar a usar a URL do próprio Render (`/uploads/...`) — o ficheiro **igual** fica commitado no Git para o próximo deploy, mas enquanto o dyno não reinicia o disco ainda tem a cópia local.

Desativa só o upload para o GitHub omitindo `GITHUB_TOKEN` ou `GITHUB_REPO`. O commit local opcional (`GIT_AUTO_COMMIT`) continua a funcionar onde existir `.git`.

### Coluna **Foto (URL)** na planilha (última foto do jogador)

- Ao **adicionar** ou **guardar alterações** num jogador no ecrã Jogadores, a app chama automaticamente o envio da lista completa ao Sheets (`/sync/players`). A coluna **Foto (URL)** fica com o mesmo valor que está no `player.photo` (por exemplo `https://raw.githubusercontent.com/...` se o upload ao GitHub tiver sucesso).
- **Render:** além das credenciais Google (Sheets), para o link ser o do repositório:
  - `GITHUB_TOKEN` + `GITHUB_REPO` (e opcionalmente `GITHUB_BRANCH`) — ver secção acima.
- **GitHub:** não há ficheiros a editar no PC; só o **token** com permissão de escrita no repositório (Contents). O repositório pode ser público (recomendado para as imagens `raw.githubusercontent.com` abrirem no browser) ou privado (ver `PLAYER_PHOTO_USE_RENDER_URL` na secção anterior).
- Se o envio automático ao Sheets falhar (rede, quota), aparece um toast de erro; o jogador continua guardado localmente e podes usar **Atualizar lista de jogadores** de novo.

## Free tier

Serviços gratuitos hibernam; o primeiro request após dormir pode falhar (502) — normal, tente de novo em ~1–2 minutos.
