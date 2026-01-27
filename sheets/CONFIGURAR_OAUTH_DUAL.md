# 🔐 Configuração OAuth Dual - Local + Render

O código agora suporta **automaticamente** ambos os tipos de OAuth:

## 📁 Arquivos de Credenciais

### 1. **Desktop App** (Local - já funciona)
- **Arquivo**: `credentials_oauth.json`
- **Tipo**: `installed` (Desktop app)
- **Uso**: Desenvolvimento local
- **Status**: ✅ Já configurado e funcionando

### 2. **Web Application** (Render - produção)
- **Arquivo**: `credentials_oauth_web.json`
- **Tipo**: `web` (Web application)
- **Uso**: Produção no Render
- **Client ID**: `680015352457-g41n55s793kgr0vb23vv115q0s1m1h5m.apps.googleusercontent.com`

## 🔄 Como Funciona

O código **detecta automaticamente** qual usar:

- **Local** (sem variável `RENDER` ou `PORT`): Usa `credentials_oauth.json` (Desktop app)
- **Render** (com variável `RENDER` ou `PORT`): Usa `credentials_oauth_web.json` (Web application)

## 🚀 Configurar no Render

### Opção 1: Upload do Arquivo (Recomendado)

1. No Render, vá em **Settings** → **Environment**
2. Clique em **"Add Secret File"**
3. **Name**: `GOOGLE_OAUTH_CREDENTIALS`
4. **Path**: `/opt/render/project/src/sheets/credentials_oauth_web.json`
5. **Content**: Cole o conteúdo do arquivo `credentials_oauth_web.json`
6. Salve

### Opção 2: Variável de Ambiente JSON

1. No Render, vá em **Settings** → **Environment**
2. Adicione variável:
   - **KEY**: `GOOGLE_CREDENTIALS_JSON`
   - **VALUE**: (cole TODO o conteúdo do arquivo JSON)
3. Salve

### Opção 3: Upload via Render Dashboard

1. No Render, vá em **Settings** → **Environment**
2. Use a opção de upload de arquivo (se disponível)
3. Faça upload de `credentials_oauth_web.json`

## ⚙️ Variáveis de Ambiente no Render

Adicione também:

```
PORT=10000
RENDER=true
OAUTH_REDIRECT_URI=https://futibas.onrender.com/oauth2callback
```

## ✅ Testar

### Local:
```bash
cd sheets
python teste_oauth.py
```
Deve usar `credentials_oauth.json` automaticamente.

### Render:
Após fazer deploy, o código detectará que está em produção e usará `credentials_oauth_web.json`.

## 📝 Notas Importantes

1. **Arquivos não commitados**: Ambos os arquivos JSON estão no `.gitignore` por segurança
2. **Token compartilhado**: O `token.pickle` pode ser usado em ambos os ambientes (se compatível)
3. **Primeira autorização**: No Render, a primeira vez precisará autorizar manualmente (método console)

## 🆘 Problemas Comuns

### Erro: "Arquivo não encontrado" no Render
- **Solução**: Certifique-se de que o arquivo foi adicionado via Secret File ou variável de ambiente

### Erro: "redirect_uri_mismatch" no Render
- **Solução**: Verifique se as URLs no Google Cloud Console incluem:
  - `https://futibas.onrender.com`
  - `https://futibas.onrender.com/oauth2callback`

### Erro: "403 access_denied"
- **Solução**: Adicione seu email como "Test user" na tela de consentimento OAuth
