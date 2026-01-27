# 🔐 Configurar Service Account no Render (Recomendado para Produção)

OAuth Web Application não funciona bem em produção porque requer interação manual. A melhor solução é usar **Service Account**.

## 📋 Passo a Passo

### 1. Criar Service Account no Google Cloud Console

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=futsal-476923
2. Clique em **"+ CREATE SERVICE ACCOUNT"**
3. Preencha:
   - **Name**: `futibas-render`
   - **Description**: `Service Account para Render`
4. Clique em **"CREATE AND CONTINUE"**
5. **Role**: Deixe vazio ou adicione "Editor" (opcional)
6. Clique em **"CONTINUE"** → **"DONE"**

### 2. Criar e Baixar Chave JSON

1. Clique no Service Account criado
2. Vá na aba **"KEYS"**
3. Clique em **"ADD KEY"** → **"Create new key"**
4. Escolha **JSON**
5. Clique em **"CREATE"**
6. O arquivo JSON será baixado automaticamente

### 3. Compartilhar Planilha com Service Account

1. Abra sua planilha no Google Sheets
2. Clique em **"Compartilhar"**
3. Adicione o **email do Service Account** (encontrado no arquivo JSON, campo `client_email`)
4. Dê permissão de **"Editor"**
5. Clique em **"Enviar"**

### 4. Adicionar no Render

No Render, vá em **Settings** → **Environment** e adicione:

**Opção A: Secret File (Recomendado)**
1. Clique em **"Add Secret File"**
2. **FILENAME**: `GOOGLE_APPLICATION_CREDENTIALS`
3. **CONTENTS**: Cole TODO o conteúdo do arquivo JSON baixado
4. Salve

**Opção B: Variável de Ambiente**
1. Adicione variável:
   - **KEY**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **VALUE**: `/opt/render/project/src/sheets/service-account.json`
2. E adicione outro Secret File:
   - **FILENAME**: `service-account.json`
   - **CONTENTS**: Cole o conteúdo do JSON

### 5. Redeploy

Após adicionar, o Render fará rebuild automaticamente. O código detectará o Service Account e usará automaticamente.

## ✅ Verificação

Após o deploy, o código vai:
1. Detectar que está no Render
2. Procurar por `GOOGLE_APPLICATION_CREDENTIALS`
3. Usar Service Account automaticamente
4. Sincronizar com Google Sheets sem problemas!

## 🆘 Problemas Comuns

### Erro: "Permission denied"
- **Solução**: Certifique-se de que compartilhou a planilha com o email do Service Account

### Erro: "File not found"
- **Solução**: Verifique se o Secret File foi criado corretamente no Render

---

**Nota**: Service Account é mais seguro e confiável para produção do que OAuth interativo!
