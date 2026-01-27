# ⚡ Solução Rápida - Erro 403: access_denied

## 🎯 O Problema:

O app OAuth está em **modo de teste** e seu email não está na lista de testadores aprovados.

## ✅ Solução em 3 Passos:

### 1️⃣ Acesse a Tela de Consentimento

**Link direto:**
https://console.cloud.google.com/apis/credentials/consent?project=futsal-476923

### 2️⃣ Adicione seu Email

1. Role até a seção **"Test users"** (Usuários de teste)
2. Clique em **"+ ADD USERS"**
3. Digite seu **email do Google** (o mesmo que você usa para acessar Google Sheets)
4. Clique em **"ADD"**

### 3️⃣ Salve e Teste

1. Clique em **"SAVE"** (Salvar)
2. Execute novamente:
   ```bash
   python teste_oauth.py
   ```

## 📧 Qual email usar?

Use o **mesmo email** que você usa para:
- Acessar o Google Sheets
- Fazer login no Google
- Acessar a planilha "tester"

## ⏱️ Quanto tempo leva?

Geralmente funciona imediatamente, mas pode levar até 5 minutos para propagar.

## ✅ Depois de adicionar:

Execute:
```bash
python teste_oauth.py
```

Deve funcionar! 🎉

---

**Dica:** Se ainda não funcionar, verifique se você está usando o email correto (o mesmo do Google Sheets).
