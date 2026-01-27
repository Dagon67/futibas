# ✅ Configurar Service Account no Render - Guia Final

## 🎯 O Problema

O erro mostra que o backend não está encontrando as credenciais. Vamos configurar corretamente!

## 📋 Solução: Adicionar Secret File no Render

### Passo 1: Abrir o Arquivo JSON

1. Abra o arquivo: `sheets/futsal-476923-19e955d7ed78.json`
2. Selecione **TODO** o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

### Passo 2: Adicionar no Render

1. No Render, vá no serviço **futibas** (backend)
2. Vá em **Settings** → **Environment**
3. Role até a seção **"Secret Files"**
4. Clique em **"+ Add"** ou adicione uma nova linha na tabela
5. Preencha:
   - **FILENAME**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **CONTENTS**: Cole o JSON completo que você copiou
6. Clique em **"Save, rebuild, and deploy"**

### Passo 3: Verificar Planilha Compartilhada

1. Abra sua planilha no Google Sheets
2. Clique em **"Compartilhar"**
3. Verifique se o email está na lista: `futilouco@futsal-476923.iam.gserviceaccount.com`
4. Se **NÃO estiver**, adicione:
   - Email: `futilouco@futsal-476923.iam.gserviceaccount.com`
   - Permissão: **"Editor"**
   - Clique em **"Enviar"**

### Passo 4: Aguardar Deploy

O Render fará rebuild automaticamente. Aguarde 2-3 minutos.

## ✅ Como Verificar se Funcionou

Após o deploy:

1. Acesse: https://futibas.onrender.com/health
   - Deve retornar: `{"status": "ok"}`

2. Teste no frontend:
   - Acesse: https://futibas-frontend.onrender.com
   - Adicione um jogador
   - Verifique se aparece no Google Sheets

3. Verifique os logs no Render:
   - Vá em **Logs** no Render
   - Procure por: `📊 Service Account encontrado`
   - Se aparecer, está funcionando!

## 🆘 Se Ainda Não Funcionar

### Opção Alternativa: Variável de Ambiente JSON

Se o Secret File não funcionar, tente:

1. No Render, **Settings** → **Environment**
2. Adicione variável:
   - **KEY**: `GOOGLE_CREDENTIALS_JSON`
   - **VALUE**: Cole TODO o conteúdo do JSON (mesmo conteúdo do Secret File)
3. Salve e faça redeploy

O código agora detecta automaticamente essa variável também!

## 📝 Resumo

1. ✅ Secret File: `GOOGLE_APPLICATION_CREDENTIALS` com conteúdo do JSON
2. ✅ OU Variável: `GOOGLE_CREDENTIALS_JSON` com conteúdo do JSON
3. ✅ Planilha compartilhada com `futilouco@futsal-476923.iam.gserviceaccount.com`
4. ✅ Redeploy automático

**Pronto!** Deve funcionar agora! 🚀
