# 🚀 Como Subir o Projeto para o GitHub

## ✅ Passo 1: Criar o Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name**: `tutem`
   - **Description**: `Sistema de Monitoramento de Treinos para Futsal`
   - **Visibility**: Escolha **Public** ou **Private**
   - **NÃO marque** "Add a README file" (já temos um)
   - **NÃO marque** "Add .gitignore" (já temos um)
   - **NÃO escolha** uma license ainda
3. Clique em **"Create repository"**

## ✅ Passo 2: Conectar e Fazer Push

Após criar o repositório, o GitHub mostrará instruções. Execute no terminal:

```powershell
cd c:\Users\Administrador\Documents\tutem

# Adicionar o remote (substitua Dagon67 se seu usuário for diferente)
git remote add origin https://github.com/Dagon67/tutem.git

# Renomear branch para main (se necessário)
git branch -M main

# Fazer push
git push -u origin main
```

## 🔐 Se pedir autenticação:

### Opção A: Personal Access Token (Recomendado)

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** > **"Generate new token (classic)"**
3. Dê um nome (ex: "tutem-push")
4. Marque a opção **"repo"** (acesso completo aos repositórios)
5. Clique em **"Generate token"**
6. **COPIE o token** (você não verá novamente!)
7. Quando o Git pedir senha, cole o token (não sua senha do GitHub)

### Opção B: GitHub CLI

```powershell
# Instalar GitHub CLI (se não tiver)
winget install GitHub.cli

# Fazer login
gh auth login

# Depois fazer push normalmente
git push -u origin main
```

## ✅ Verificar

Após o push, acesse:
https://github.com/Dagon67/tutem

Você deve ver todos os arquivos lá!

---

## 📝 Comandos Úteis para o Futuro

```powershell
# Ver status
git status

# Adicionar mudanças
git add .

# Fazer commit
git commit -m "Descrição das mudanças"

# Fazer push
git push
```

---

## ⚠️ IMPORTANTE

O arquivo `.gitignore` está configurado para **NÃO** fazer commit de:
- ✅ Credenciais JSON (`.json` exceto `package.json`)
- ✅ Tokens OAuth
- ✅ Arquivos de ambiente
- ✅ Arquivos temporários

**Nunca faça commit de arquivos com credenciais!**
