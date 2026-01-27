# 🚀 Guia de Hospedagem Gratuita - App Tutem

Este guia mostra como hospedar seu aplicativo gratuitamente em diferentes plataformas.

## 📋 Opções de Hospedagem

### 1. **Render** (Recomendado) ⭐
- ✅ Plano gratuito disponível
- ✅ Suporta Flask/Python
- ✅ Deploy automático via GitHub
- ✅ HTTPS incluído
- ⚠️ Serviço "dorme" após 15min de inatividade (acorda em ~30s)

### 2. **Railway**
- ✅ Plano gratuito ($5 crédito/mês)
- ✅ Suporta Flask/Python
- ✅ Deploy rápido
- ⚠️ Créditos limitados

### 3. **Fly.io**
- ✅ Plano gratuito generoso
- ✅ Suporta Flask/Python
- ✅ Global edge network
- ⚠️ Configuração um pouco mais complexa

### 4. **PythonAnywhere**
- ✅ Gratuito para apps básicos
- ✅ Fácil de usar
- ⚠️ Limitado a 1 app gratuito
- ⚠️ Domínio: `seuapp.pythonanywhere.com`

---

## 🎯 Opção 1: Render (Passo a Passo)

### Pré-requisitos
1. Conta no GitHub (gratuita)
2. Conta no Render (gratuita)
3. Seu código no GitHub

### Passo 1: Preparar o Repositório

1. Crie um arquivo `.gitignore` na raiz (se não existir):
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
*.json
credentials_oauth.json
client_secret*.json
*.pem
.DS_Store
```

2. **IMPORTANTE**: As credenciais do Google Sheets devem ser configuradas como variáveis de ambiente no Render (não commite no GitHub!)

### Passo 2: Criar Arquivo de Configuração do Render

Crie `render.yaml` na raiz do projeto (já criado automaticamente).

### Passo 3: Deploy no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `tutem-backend` (ou o nome que preferir)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r sheets/requirements.txt`
   - **Start Command**: `cd sheets && gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: Free

5. **Variáveis de Ambiente** (Settings → Environment Variables):
   ```
   PORT=10000
   GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/sheets/futsal-476923-19e955d7ed78.json
   ```
   
   **OU** (mais seguro) - adicione o conteúdo do JSON como variável:
   ```
   GOOGLE_CREDENTIALS_JSON=<cole aqui o conteúdo do arquivo JSON>
   ```

6. Clique em "Create Web Service"

### Passo 4: Hospedar Frontend

**Opção A: Render Static Site** (Recomendado)
1. No Render, clique em "New +" → "Static Site"
2. Conecte o mesmo repositório
3. Configure:
   - **Build Command**: (deixe vazio)
   - **Publish Directory**: `/` (raiz)
4. Após o deploy, você terá uma URL como: `https://seuapp.onrender.com`

**Opção B: Netlify** (Alternativa gratuita)
1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta do projeto ou conecte GitHub
3. Deploy automático!

### Passo 5: Atualizar URL do Backend no Frontend

Após o deploy, você terá uma URL do backend (ex: `https://tutem-backend.onrender.com`).

Atualize o arquivo `js/sheets_sync.js` para usar essa URL em produção.

---

## 🎯 Opção 2: Railway

### Passo 1: Instalar Railway CLI
```bash
npm i -g @railway/cli
```

### Passo 2: Login
```bash
railway login
```

### Passo 3: Deploy
```bash
railway init
railway up
```

### Passo 4: Configurar Variáveis
No dashboard do Railway, adicione as variáveis de ambiente necessárias.

---

## 🎯 Opção 3: Fly.io

### Passo 1: Instalar Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Passo 2: Login
```bash
fly auth login
```

### Passo 3: Criar App
```bash
fly launch
```

Siga as instruções na tela.

---

## 🔧 Configurações Importantes

### 1. Atualizar URL do Backend

O arquivo `js/sheets_sync.js` precisa ser atualizado para detectar automaticamente a URL do backend:

- Em desenvolvimento: `http://localhost:5000`
- Em produção: URL do seu serviço Render/Railway/etc.

### 2. Variáveis de Ambiente

No Render/Railway, configure:
- `PORT`: Porta (geralmente definida automaticamente)
- `GOOGLE_APPLICATION_CREDENTIALS`: Caminho do arquivo JSON (ou use variável `GOOGLE_CREDENTIALS_JSON`)

### 3. CORS

O Flask já está configurado com CORS, mas certifique-se de que permite requisições do seu domínio frontend.

---

## 📝 Checklist de Deploy

- [ ] Código no GitHub
- [ ] `.gitignore` configurado (sem credenciais)
- [ ] `requirements.txt` atualizado
- [ ] Backend deployado e funcionando
- [ ] Frontend deployado
- [ ] URL do backend atualizada no frontend
- [ ] Variáveis de ambiente configuradas
- [ ] Testar sincronização com Google Sheets

---

## 🆘 Problemas Comuns

### Backend "dorme" no Render
- **Solução**: Use um serviço de "ping" gratuito como [UptimeRobot](https://uptimerobot.com) para manter o serviço ativo

### Erro de CORS
- **Solução**: Verifique se o `flask-cors` está instalado e configurado corretamente

### Credenciais do Google não funcionam
- **Solução**: Certifique-se de que o arquivo JSON está acessível ou use variável de ambiente `GOOGLE_CREDENTIALS_JSON`

---

## 💡 Dica Extra

Para manter o backend sempre ativo no Render (gratuito), você pode:
1. Usar UptimeRobot para fazer ping a cada 5 minutos
2. Ou aceitar que o primeiro acesso após inatividade leve ~30 segundos

---

## 📞 Suporte

Se tiver problemas, consulte:
- [Documentação Render](https://render.com/docs)
- [Documentação Railway](https://docs.railway.app)
- [Documentação Fly.io](https://fly.io/docs)
