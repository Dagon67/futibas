# 🔧 Como Corrigir o Erro redirect_uri_mismatch

## ❌ Erro:
```
Erro 400: redirect_uri_mismatch
```

## ✅ Solução:

O problema é que o redirect URI não está configurado no Google Cloud Console. Siga estes passos:

### Passo 1: Acesse o Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **futsal-476923**

### Passo 2: Configure o OAuth Client

1. Vá em **"APIs & Services"** > **"Credentials"**
2. Encontre o OAuth 2.0 Client ID: `680015352457-ntglrepqltp9ifuuhmtrbmrggha9nusn.apps.googleusercontent.com`
3. **Clique nele para editar**

### Passo 3: Adicione os Redirect URIs

Na seção **"Authorized redirect URIs"**, adicione:

```
http://localhost
urn:ietf:wg:oauth:2.0:oob
http://localhost:8080
http://127.0.0.1:8080
```

**OU** se você criou como "Desktop app" (não "Web application"), os redirect URIs já devem estar configurados automaticamente.

### Passo 4: Verifique o Tipo de Aplicativo

**IMPORTANTE:** Certifique-se de que o OAuth Client está configurado como **"Desktop app"**, não "Web application".

Se estiver como "Web application":
1. Você pode criar um NOVO OAuth Client como "Desktop app"
2. Ou editar o existente (mas pode não funcionar perfeitamente)

### Passo 5: Salve e Teste

1. Clique em **"Save"**
2. Execute novamente: `python teste_oauth.py`

## 🔄 Alternativa: Criar Novo OAuth Client (Desktop App)

Se continuar dando erro, crie um novo:

1. No Google Cloud Console, vá em **"APIs & Services"** > **"Credentials"**
2. Clique em **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Selecione **"Desktop app"** (NÃO "Web application")
4. Dê um nome (ex: "Sheets Editor Desktop")
5. Clique em **"CREATE"**
6. Baixe o arquivo JSON
7. Substitua o conteúdo de `credentials_oauth.json` pelo novo arquivo

## 📝 Nota Importante

O arquivo `credentials_oauth.json` que você tem é do tipo "web", mas precisa ser "installed" (desktop). 

Se você criou como "Desktop app" no Google Cloud Console, o arquivo JSON já deve ter a estrutura correta. Se não, siga o Passo 5 acima.

## ✅ Após corrigir:

Execute novamente:
```bash
python teste_oauth.py
```

Deve funcionar! 🎉
