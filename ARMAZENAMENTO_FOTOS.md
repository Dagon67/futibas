# 📸 Como Funciona o Armazenamento de Fotos

## 🎯 Sistema Implementado

As fotos dos jogadores agora são armazenadas no **backend (Render)** como arquivos, não mais como Base64 no localStorage.

## 📋 Como Funciona

### 1. Upload da Foto
- Usuário seleciona a foto no formulário
- Foto é redimensionada para 200x200px
- Convertida para Base64 temporariamente
- **Enviada para o backend** via `POST /upload/player-photo`

### 2. Armazenamento no Backend
- Backend recebe a foto em Base64
- Decodifica e salva como arquivo em `uploads/players/`
- Nome do arquivo: `{playerId}_{timestamp}.{formato}`
- Retorna URL: `/uploads/players/{filename}`

### 3. Armazenamento no Frontend
- Frontend salva apenas a **URL da foto** no localStorage
- Exemplo: `https://futibas.onrender.com/uploads/players/abc123_20260127_120000.jpeg`
- **NÃO salva mais Base64** (economiza espaço!)

### 4. Exibição
- Frontend usa a URL para exibir a foto
- Se a URL começar com `http`, usa diretamente
- Se for relativa (`/uploads/...`), adiciona URL do backend

## 📁 Estrutura de Arquivos

```
tutem/
├── uploads/
│   └── players/
│       ├── .gitkeep
│       ├── abc123_20260127_120000.jpeg
│       ├── def456_20260127_120500.png
│       └── ...
└── sheets/
    └── app.py (endpoint de upload)
```

## 🔄 Fallback Automático

Se o upload falhar (backend offline, etc):
- Sistema usa **Base64 local** como fallback
- Funciona mesmo sem backend
- Quando backend voltar, pode fazer upload depois

## 💾 Commitar Fotos no Git (Opcional)

Se você quiser que as fotos sejam commitadas no repositório:

1. Edite `.gitignore` e **comente** a linha:
   ```gitignore
   # uploads/players/*
   # !uploads/players/.gitkeep
   ```

2. Faça commit:
   ```bash
   git add uploads/players/*.jpeg uploads/players/*.png
   git commit -m "Add player photos"
   git push
   ```

## ⚠️ Importante sobre Render

**Render Free Tier** não persiste arquivos entre deploys! 

### Soluções:

1. **Usar Persistent Disk** (pago - $0.25/GB/mês)
2. **Commitar fotos no Git** (gratuito, mas aumenta tamanho do repo)
3. **Usar serviço externo** (Cloudinary, Imgur, etc) - gratuito até certo limite

## 🎯 Recomendação

Para seu caso (poucas fotos, um usuário):
- **Commite as fotos no Git** (mais simples)
- Ou use **Persistent Disk** no Render (se quiser pagar)

---

## 📝 Endpoints Criados

- `POST /upload/player-photo` - Upload de foto
- `GET /uploads/players/<filename>` - Servir foto

---

**Pronto!** As fotos agora são armazenadas no servidor! 🚀
