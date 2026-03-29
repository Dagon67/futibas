# Plataforma (multi-tenant)

Código **novo** para vários clubes/instâncias deve viver aqui (ou em `backend/platform/`, `apps/tenant-*`, conforme evoluir), **sem alterar** `legacy/` nem `backend/legacy/`.

## Diretrizes

1. **Legado** — `legacy/` + `backend/legacy/`: app Jaraguá atual (Sheets, LocalStorage, mesma UX). Mudanças mínimas e só quando necessário (bugfix, ajuste de deploy).
2. **Plataforma** — novos serviços (ex.: API com `tenant_id`, regras por clube, Firestore em vez de uma planilha fixa).
3. **Firestore** — use SDK/admin no backend novo; não misture credenciais nem IDs de planilha do legado no mesmo módulo que o multi-tenant.

## Próximos passos sugeridos

- `backend/platform/` — app Flask/FastAPI ou funções com `tenant_id` no path ou header.
- `platform/firestore.rules` / índices — quando criar o projeto Firebase (fora deste repo até você adicionar).
- Frontends por tenant podem ser subpastas (`legacy` permanece o template) ou outro repositório.

Arquivo vazio `tenants/.gitkeep` reserva a pasta para modelos/schemas de tenant no futuro.
