# 📸 Commit Automático de Fotos no Git

## 🎯 Como Funciona

Por padrão, as fotos são salvas no servidor mas **NÃO são commitadas automaticamente** no Git.

## ⚠️ Problema: Render Free Tier

O Render Free Tier **não persiste arquivos** entre deploys. Isso significa:
- Fotos são salvas no servidor
- Mas são **perdidas** quando o Render faz redeploy
- Solução: Commitar as fotos no Git

## ✅ Solução: Permitir Commit de Fotos

### Opção 1: Commit Manual (Mais Simples)

1. As fotos são salvas em `uploads/players/`
2. Quando quiser, faça commit manualmente:
   ```bash
   git add uploads/players/*.jpeg uploads/players/*.png
   git commit -m "Add player photos"
   git push
   ```

### Opção 2: Commit Automático (Avançado)

Para fazer commit automático quando uma foto for enviada:

1. **No Render**, adicione variável de ambiente:
   - **KEY**: `GIT_AUTO_COMMIT`
   - **VALUE**: `true`

2. **Configure autenticação Git no Render**:
   - Adicione Personal Access Token do GitHub como variável:
   - **KEY**: `GITHUB_TOKEN`
   - **VALUE**: (seu token do GitHub)

3. **Configure Git no código** (já está implementado, mas precisa do token)

⚠️ **Nota**: Commit automático requer configuração adicional e pode ser complexo.

## 🎯 Recomendação

Para seu caso (poucas fotos, um usuário):

**Use Commit Manual:**
1. Deixe o `.gitignore` como está (permite commit de fotos)
2. Periodicamente, faça commit manual das fotos
3. Mais simples e confiável

---

## 📝 Status Atual

- ✅ Fotos são salvas em `uploads/players/`
- ✅ `.gitignore` permite commit de fotos
- ✅ Código preparado para commit automático (opcional)
- ⚠️ Commit automático requer configuração adicional

---

**Resumo**: As fotos **podem** ser commitadas no Git, mas não são commitadas **automaticamente** por padrão. Você precisa fazer commit manual quando quiser.
