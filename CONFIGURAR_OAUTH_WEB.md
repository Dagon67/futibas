# 🔐 Como Preencher a Tela de OAuth - Aplicativo da Web

## 📋 Campos para Preencher

### 1. **Tipo de aplicativo** ✅
- Já está selecionado: **"Aplicativo da Web"**

### 2. **Nome** ✅
- Já está preenchido: **"danet"** (ou você pode mudar se quiser)

### 3. **Origens JavaScript autorizadas** 🌐

Clique em **"+ Adicionar URI"** e adicione:

**Para desenvolvimento local:**
```
http://localhost
http://localhost:5000
http://127.0.0.1
http://127.0.0.1:5000
```

**Para produção (após fazer deploy no Render):**
```
https://tutem-frontend.onrender.com
```
*(Substitua pela URL real do seu frontend no Render)*

**Total de origens a adicionar:**
- `http://localhost`
- `http://localhost:5000`
- `http://127.0.0.1`
- `http://127.0.0.1:5000`
- `https://tutem-frontend.onrender.com` (adicione depois do deploy)

---

### 4. **URIs de redirecionamento autorizados** 🔄

Clique em **"+ Adicionar URI"** e adicione:

**Para desenvolvimento local:**
```
http://localhost
http://localhost:5000
http://127.0.0.1
http://127.0.0.1:5000
```

**Para produção (após fazer deploy no Render):**
```
https://tutem-backend.onrender.com
https://tutem-backend.onrender.com/callback
```
*(Substitua pela URL real do seu backend no Render)*

**Total de URIs a adicionar:**
- `http://localhost`
- `http://localhost:5000`
- `http://127.0.0.1`
- `http://127.0.0.1:5000`
- `https://tutem-backend.onrender.com` (adicione depois do deploy)
- `https://tutem-backend.onrender.com/callback` (adicione depois do deploy)

---

## ⚠️ IMPORTANTE

### Observação sobre o código atual:

Seu código atual usa `run_local_server()` que é para **Desktop apps**. Se você configurar como **"Aplicativo da Web"**, pode precisar ajustar o código depois.

**Duas opções:**

#### Opção A: Continuar com "Aplicativo da Web" (Recomendado para produção)
- Configure as URLs acima
- Depois, podemos adaptar o código para usar OAuth web flow

#### Opção B: Mudar para "Desktop app" (Mais simples agora)
- Se você cancelar e criar um novo OAuth Client como "Desktop app", não precisa preencher essas URLs
- O Google configura automaticamente
- Mas não funcionará bem em produção (só local)

---

## 📝 Passo a Passo Visual

1. **Origens JavaScript autorizadas:**
   - Clique em **"+ Adicionar URI"**
   - Digite: `http://localhost`
   - Clique em **"+ Adicionar URI"** novamente
   - Digite: `http://localhost:5000`
   - Repita para `http://127.0.0.1` e `http://127.0.0.1:5000`

2. **URIs de redirecionamento autorizados:**
   - Clique em **"+ Adicionar URI"**
   - Digite: `http://localhost`
   - Clique em **"+ Adicionar URI"** novamente
   - Digite: `http://localhost:5000`
   - Repita para `http://127.0.0.1` e `http://127.0.0.1:5000`

3. **Clique em "CRIAR"** (ou "SAVE" se estiver editando)

4. **Depois do deploy no Render**, volte aqui e adicione as URLs de produção

---

## ✅ Após Preencher

1. Clique em **"CRIAR"** (ou **"SALVAR"**)
2. Baixe o arquivo JSON das credenciais
3. Salve como `credentials_oauth.json` na pasta `sheets/`
4. Teste localmente primeiro
5. Depois do deploy, adicione as URLs de produção

---

## 🆘 Se der erro depois

Se você receber erro de `redirect_uri_mismatch`, verifique:
- Se todas as URLs foram adicionadas corretamente
- Se não há espaços extras nas URLs
- Se está usando `http://` para localhost e `https://` para produção
