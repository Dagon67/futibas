# 🔧 Como Corrigir Erro 403: access_denied

## ❌ Erro:
```
Erro 403: access_denied
futsal não concluiu o processo de verificação do Google. 
Ele está em fase de testes e só pode ser acessado por testadores aprovados.
```

## ✅ Solução: Adicionar seu email como testador

O app OAuth está em modo de teste. Você precisa adicionar seu email na lista de testadores.

### Passo 1: Acesse a Tela de Consentimento OAuth

1. Acesse: https://console.cloud.google.com/apis/credentials/consent?project=futsal-476923

2. Ou navegue manualmente:
   - Acesse: https://console.cloud.google.com/
   - Selecione o projeto: **futsal-476923**
   - Vá em **"APIs & Services"** > **"OAuth consent screen"**

### Passo 2: Adicione seu email como testador

1. Na seção **"Test users"** (Usuários de teste), clique em **"+ ADD USERS"**

2. Digite seu **email do Google** (o mesmo que você usa para acessar o Google Sheets)

3. Clique em **"ADD"**

4. **Salve** as alterações

### Passo 3: Teste novamente

Execute novamente:
```bash
python teste_oauth.py
```

Agora deve funcionar! 🎉

## 📋 Checklist:

- [ ] Acessou a tela de consentimento OAuth
- [ ] Adicionou seu email na lista de "Test users"
- [ ] Salvou as alterações
- [ ] Testou novamente

## ⚠️ Importante:

- Use o **mesmo email** que você usa para acessar o Google Sheets
- O email deve ser uma conta Google válida
- Pode levar alguns minutos para as alterações serem aplicadas

## 🔄 Alternativa: Publicar o App (Não recomendado para testes)

Se quiser que qualquer pessoa use (não recomendado para desenvolvimento):
1. Na tela de consentimento, mude o "Publishing status" para "In production"
2. Isso requer verificação do Google (processo mais longo)

**Para desenvolvimento, é melhor usar "Test users"!**
