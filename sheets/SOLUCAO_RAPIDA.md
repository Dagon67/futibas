# 🚀 Solução Rápida - Erro redirect_uri_mismatch

## ⚡ Solução Mais Rápida:

O código agora tenta automaticamente um método alternativo se der erro de redirect_uri. 

**Execute novamente:**
```bash
python teste_oauth.py
```

Se ainda der erro, o código tentará usar o método console (você copia e cola o código).

## 🔧 Solução Definitiva (Recomendada):

### Opção 1: Configurar Redirect URI no Google Cloud Console

1. **Acesse:** https://console.cloud.google.com/apis/credentials?project=futsal-476923

2. **Encontre o OAuth Client:** `680015352457-ntglrepqltp9ifuuhmtrbmrggha9nusn.apps.googleusercontent.com`

3. **Clique para editar**

4. **Adicione em "Authorized redirect URIs":**
   ```
   http://localhost
   http://localhost:8080
   ```

5. **Salve** e teste novamente

### Opção 2: Criar NOVO OAuth Client como Desktop App (Melhor)

1. **Acesse:** https://console.cloud.google.com/apis/credentials?project=futsal-476923

2. **Clique em:** "+ CREATE CREDENTIALS" > "OAuth client ID"

3. **IMPORTANTE:** Escolha **"Desktop app"** (NÃO "Web application")

4. **Dê um nome:** "Sheets Editor Desktop"

5. **Clique em "CREATE"**

6. **Baixe o arquivo JSON**

7. **Substitua o conteúdo de `credentials_oauth.json`** pelo novo arquivo

8. **Teste novamente:**
   ```bash
   python teste_oauth.py
   ```

## ✅ Por que isso acontece?

O arquivo JSON original que você tem é do tipo "web", mas para aplicações desktop Python precisamos de "installed" (Desktop app).

Quando você cria como "Desktop app" no Google Cloud Console, o Google configura automaticamente os redirect URIs corretos.

## 🎯 Teste Rápido:

Depois de configurar, execute:
```bash
python teste_oauth.py
```

Ou use o método alternativo que não precisa de redirect URI:
```bash
python teste_oauth_alternativo.py
```
