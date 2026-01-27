# 🚀 Deploy Rápido no Render

## Passo a Passo Simplificado

### 1. Preparar o Código

✅ Arquivos já criados:
- `render.yaml` - Configuração do Render
- `Procfile` - Comando de inicialização
- `requirements.txt` - Dependências (já inclui gunicorn)

### 2. Criar Conta e Deploy

1. **Acesse**: [render.com](https://render.com) e crie uma conta (pode usar GitHub)

2. **Crie um Web Service**:
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub
   - Selecione o repositório do projeto

3. **Configure o Serviço**:
   - **Name**: `tutem-backend`
   - **Environment**: `Python 3`
   - **Region**: Escolha a mais próxima (ex: `Oregon (US West)`)
   - **Branch**: `main` (ou sua branch principal)
   - **Root Directory**: (deixe vazio)
   - **Build Command**: `pip install -r sheets/requirements.txt`
   - **Start Command**: `cd sheets && gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: `Free`

4. **Variáveis de Ambiente** (Settings → Environment):
   
   Adicione:
   ```
   PORT=10000
   ```
   
   **Para as credenciais do Google Sheets**, você tem 2 opções:
   
   **Opção A** (Mais simples - mas menos seguro):
   - Faça upload do arquivo JSON via Render Dashboard
   - Configure: `GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/sheets/seu-arquivo.json`
   
   **Opção B** (Mais seguro - recomendado):
   - Abra o arquivo JSON das credenciais
   - Copie TODO o conteúdo
   - No Render, crie variável: `GOOGLE_CREDENTIALS_JSON`
   - Cole o conteúdo JSON completo
   - Modifique `sheets/sheets_sync.py` para ler dessa variável (veja abaixo)

5. **Clique em "Create Web Service"**

6. **Aguarde o Deploy** (5-10 minutos na primeira vez)

### 3. Atualizar Código para Usar Variável de Ambiente (Opcional)

Se você escolheu a Opção B acima, modifique `sheets/sheets_sync.py`:

```python
import os
import json

# No início do arquivo, após os imports
if 'GOOGLE_CREDENTIALS_JSON' in os.environ:
    # Criar arquivo temporário a partir da variável de ambiente
    creds_json = json.loads(os.environ['GOOGLE_CREDENTIALS_JSON'])
    with open('/tmp/google_creds.json', 'w') as f:
        json.dump(creds_json, f)
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/tmp/google_creds.json'
```

### 4. Hospedar o Frontend

**Opção A: Render Static Site** (Recomendado)

1. No Render, clique em "New +" → "Static Site"
2. Conecte o mesmo repositório
3. Configure:
   - **Name**: `tutem-frontend`
   - **Build Command**: (deixe vazio)
   - **Publish Directory**: `/` (raiz)
4. Após o deploy, você terá uma URL como: `https://tutem-frontend.onrender.com`

**Opção B: Netlify** (Alternativa - também gratuito)

1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta do projeto ou conecte GitHub
3. Deploy automático!

### 5. Atualizar URL do Backend no Frontend

Após o deploy do backend, você terá uma URL como: `https://tutem-backend.onrender.com`

**Atualize o HTML** (`index.html` e `totem.html`):

Adicione antes do fechamento de `</head>`:

```html
<script>
    // Configurar URL do backend em produção
    window.BACKEND_URL = 'https://tutem-backend.onrender.com'; // Substitua pela sua URL
</script>
```

Ou edite diretamente em `js/sheets_sync.js` na linha que diz:
```javascript
return PROD_BACKEND_URL || 'https://tutem-backend.onrender.com'; // Substitua pela sua URL
```

### 6. Testar

1. Acesse a URL do frontend
2. Teste criar um jogador
3. Verifique se a sincronização com Google Sheets funciona

---

## ⚠️ Importante

### Render Free Tier - "Sleep Mode"

No plano gratuito, o serviço "dorme" após 15 minutos de inatividade. O primeiro acesso após isso pode levar ~30 segundos.

**Soluções**:
1. **Aceitar o delay** (gratuito)
2. **Usar UptimeRobot** (gratuito) para fazer ping a cada 5 minutos
3. **Upgrade para plano pago** ($7/mês) - sem sleep mode

---

## 🆘 Problemas Comuns

### Erro: "Module not found"
- Verifique se todas as dependências estão em `requirements.txt`
- Verifique os logs do build no Render

### Erro: "Port already in use"
- O Render define automaticamente a variável `PORT`
- Certifique-se de usar `$PORT` no comando gunicorn

### CORS Error
- Verifique se `flask-cors` está instalado
- O código já tem `CORS(app)` configurado

### Google Sheets não funciona
- Verifique se as credenciais estão configuradas corretamente
- Verifique os logs do Render para erros específicos

---

## ✅ Checklist Final

- [ ] Backend deployado e acessível
- [ ] Frontend deployado
- [ ] URL do backend atualizada no frontend
- [ ] Testado criar jogador
- [ ] Testado sincronização com Google Sheets
- [ ] Configurado UptimeRobot (opcional, para evitar sleep)

---

## 📞 Próximos Passos

Depois de fazer o deploy, você pode:
1. Configurar um domínio personalizado (gratuito no Render)
2. Configurar SSL (automático no Render)
3. Adicionar monitoramento (UptimeRobot)
