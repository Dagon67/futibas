# 🔐 Como Criar Service Account - Passo a Passo

## 📋 Passo 1: Acessar o Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Certifique-se de que está no projeto correto: **futsal-476923**
   - Se não estiver, clique no seletor de projeto no topo e escolha "futsal-476923"

## 📋 Passo 2: Ir para Service Accounts

1. No menu lateral esquerdo, clique em **"IAM & Admin"** (ou "IAM e administração")
2. Clique em **"Service Accounts"** (ou "Contas de serviço")

**OU** acesse diretamente:
https://console.cloud.google.com/iam-admin/serviceaccounts?project=futsal-476923

## 📋 Passo 3: Criar Novo Service Account

1. Clique no botão **"+ CREATE SERVICE ACCOUNT"** (ou "+ CRIAR CONTA DE SERVIÇO") no topo
2. Preencha o formulário:

   **Service account details:**
   - **Service account name**: `futibas-render`
   - **Service account ID**: (será preenchido automaticamente)
   - **Description**: `Service Account para sincronização com Google Sheets no Render`
   
3. Clique em **"CREATE AND CONTINUE"** (ou "CRIAR E CONTINUAR")

## 📋 Passo 4: Atribuir Permissões (Opcional)

1. Na seção **"Grant this service account access to project"**:
   - Você pode deixar vazio (não é necessário para Google Sheets)
   - OU adicionar role "Editor" se quiser
   
2. Clique em **"CONTINUE"** (ou "CONTINUAR")

## 📋 Passo 5: Finalizar Criação

1. Na seção **"Grant users access to this service account"**:
   - Você pode deixar vazio
   
2. Clique em **"DONE"** (ou "CONCLUÍDO")

## 📋 Passo 6: Criar e Baixar Chave JSON

1. Você será redirecionado para a lista de Service Accounts
2. **Clique no Service Account que acabou de criar** (`futibas-render`)
3. Vá para a aba **"KEYS"** (ou "CHAVES") no topo
4. Clique em **"ADD KEY"** (ou "ADICIONAR CHAVE") → **"Create new key"** (ou "Criar nova chave")
5. Escolha o formato **JSON**
6. Clique em **"CREATE"** (ou "CRIAR")
7. O arquivo JSON será **baixado automaticamente** no seu computador

**⚠️ IMPORTANTE**: Guarde este arquivo com segurança! Você não poderá baixá-lo novamente.

## 📋 Passo 7: Compartilhar Planilha com Service Account

1. Abra sua planilha no Google Sheets
2. Clique no botão **"Compartilhar"** (canto superior direito)
3. No campo de email, digite o **email do Service Account**
   - O email está no arquivo JSON baixado, no campo `"client_email"`
   - Formato: `futibas-render@futsal-476923.iam.gserviceaccount.com` (ou similar)
4. Dê permissão de **"Editor"**
5. **Desmarque** "Notificar pessoas" (opcional)
6. Clique em **"Enviar"** ou **"Compartilhar"**

## 📋 Passo 8: Adicionar no Render

### Opção A: Secret File (Recomendado)

1. No Render, vá em **Settings** → **Environment**
2. Role até a seção **"Secret Files"**
3. Clique em **"+ Add"** (ou adicione uma nova linha)
4. Preencha:
   - **FILENAME**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **CONTENTS**: 
     - Abra o arquivo JSON baixado
     - Selecione TODO o conteúdo (Ctrl+A)
     - Copie (Ctrl+C)
     - Cole no campo CONTENTS
5. Clique em **"Save, rebuild, and deploy"**

### Opção B: Variável de Ambiente + Secret File

1. Adicione variável de ambiente:
   - **KEY**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **VALUE**: `/opt/render/project/src/sheets/service-account.json`
2. Adicione Secret File:
   - **FILENAME**: `service-account.json`
   - **CONTENTS**: Cole o conteúdo do JSON
3. Salve

## ✅ Verificação

Após o deploy, o código vai:
1. Detectar que está no Render
2. Procurar por `GOOGLE_APPLICATION_CREDENTIALS`
3. Usar Service Account automaticamente
4. Sincronizar com Google Sheets! 🎉

## 🆘 Problemas Comuns

### Erro: "Permission denied" ou "Access denied"
- **Solução**: Certifique-se de que compartilhou a planilha com o email do Service Account
- Verifique se deu permissão de **"Editor"**

### Erro: "File not found"
- **Solução**: Verifique se o Secret File foi criado corretamente no Render
- Certifique-se de que o nome está correto: `GOOGLE_APPLICATION_CREDENTIALS`

### Erro: "Invalid credentials"
- **Solução**: Verifique se copiou TODO o conteúdo do JSON (incluindo chaves `{` e `}`)
- Certifique-se de que não há espaços extras ou quebras de linha incorretas

---

## 📝 Resumo Rápido

1. ✅ Criar Service Account no Google Cloud Console
2. ✅ Baixar chave JSON
3. ✅ Compartilhar planilha com email do Service Account
4. ✅ Adicionar JSON como Secret File no Render
5. ✅ Redeploy automático

**Pronto!** A sincronização deve funcionar! 🚀
