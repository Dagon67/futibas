# ✅ Você Já Tem um Service Account!

Você já tem um Service Account configurado:
- **Email**: `futilouco@futsal-476923.iam.gserviceaccount.com`
- **Arquivo**: `futsal-476923-19e955d7ed78.json`

## 🚀 Passo a Passo Rápido

### 1. Verificar se a Planilha Está Compartilhada

1. Abra sua planilha no Google Sheets
2. Clique em **"Compartilhar"** (canto superior direito)
3. Verifique se o email `futilouco@futsal-476923.iam.gserviceaccount.com` está na lista
4. Se **NÃO estiver**, adicione:
   - Digite: `futilouco@futsal-476923.iam.gserviceaccount.com`
   - Permissão: **"Editor"**
   - Clique em **"Enviar"**

### 2. Adicionar no Render

1. No Render, vá em **Settings** → **Environment**
2. Role até **"Secret Files"**
3. Clique em **"+ Add"** (ou adicione uma nova linha)
4. Preencha:
   - **FILENAME**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **CONTENTS**: 
     - Abra o arquivo: `sheets/futsal-476923-19e955d7ed78.json`
     - Selecione TODO o conteúdo (Ctrl+A)
     - Copie (Ctrl+C)
     - Cole no campo CONTENTS do Render
5. Clique em **"Save, rebuild, and deploy"**

### 3. Aguardar Deploy

O Render fará rebuild automaticamente. Após alguns minutos, a sincronização deve funcionar!

## ✅ Verificação

Após o deploy, teste:
1. Acesse o frontend: https://futibas-frontend.onrender.com
2. Adicione ou edite um jogador
3. Verifique se aparece no Google Sheets

## 🆘 Se Não Funcionar

### Erro: "Permission denied"
- **Solução**: Compartilhe a planilha com `futilouco@futsal-476923.iam.gserviceaccount.com`

### Erro: "File not found"
- **Solução**: Verifique se o Secret File foi criado com o nome exato: `GOOGLE_APPLICATION_CREDENTIALS`

### Erro: "Invalid credentials"
- **Solução**: Certifique-se de que copiou TODO o JSON (incluindo as chaves `{` e `}`)

---

## 📝 Conteúdo do Arquivo JSON

O arquivo `futsal-476923-19e955d7ed78.json` contém:
- Email do Service Account: `futilouco@futsal-476923.iam.gserviceaccount.com`
- Chave privada para autenticação
- Informações do projeto

**⚠️ NUNCA** compartilhe este arquivo publicamente ou faça commit no GitHub!

---

**Pronto!** Após adicionar no Render, deve funcionar! 🎉
