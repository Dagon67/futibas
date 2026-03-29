# Tutem — monitoramento de treinos

Sistema para treinos, jogadores e questionários (pré/pós). O **app em produção hoje** é o pacote **legado** (Jaraguá + Google Sheets). Código de **multi-tenant**, **Firestore** e APIs novas deve ficar em **`platform/`** e, no futuro, `backend/platform/`, sem misturar com o legado.

## Estrutura

| Pasta | Função |
|--------|--------|
| `legacy/` | Frontend estático atual (`index.html`, `totem.html`, `js/`, `campin/`, `corpo/`, `jogadores.json`, `perguntas.json`) |
| `backend/legacy/` | API Flask + sincronização Google Sheets (`app.py`, `sheets_sync.py`) |
| `platform/` | Espaço reservado para tenants, regras de plataforma e integração Firestore (ver `platform/README.md`) |
| `docs/` | Deploy (`docs/deploy-render.md`), Firebase (`docs/firebase-setup.md`, `docs/firebase-firestore-rules.md`) |
| `uploads/` | Fotos de jogadores servidas pelo backend (persistência no deploy conforme sua configuração) |

Na raiz, `index.html` só **redireciona** para `legacy/index.html` para não quebrar links antigos à raiz do site.

## Desenvolvimento local

**Backend**

```bash
cd backend/legacy
pip install -r requirements.txt
python app.py
```

**Frontend** — sirva a pasta `legacy/` (ou a raiz, que redireciona):

```bash
npx serve .
# ou: python -m http.server 8000
```

Abra `http://localhost:3000/legacy/` ou `http://localhost:8000/legacy/index.html` conforme a porta.

Credenciais Google: veja `backend/legacy/README.md`. Login Firebase + Firestore no painel: `docs/firebase-setup.md`.

## Deploy (Render)

Resumo em [`docs/deploy-render.md`](docs/deploy-render.md): Web Service apontando para `backend/legacy/`, Static Site com **publish directory** `legacy`.

## Requisitos Python na raiz

O arquivo `requirements.txt` na raiz espelha o do legado para quem instala a partir do clone na raiz; a fonte canônica é `backend/legacy/requirements.txt`.

## Licença

Uso privado.
