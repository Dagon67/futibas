# Regras Firestore (mínimo para o login no painel)

Com o SDK web, o utilizador autenticado precisa de **ler** o próprio documento `users/{uid}`.

No Firebase Console → Firestore → Regras, exemplo para desenvolvimento (ajuste antes de escalar):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
    match /tenants/{tenantId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- `users`: só o dono do UID lê o seu perfil. Escrita só via Admin/Consola (como tens feito).
- `tenants`: leitura para qualquer utilizador autenticado (suficiente para listar nome do clube depois). Se quiseres restringir por `tenantId`, refine depois.

**Authentication → Authorized domains:** adiciona o domínio do teu site no Render (ex. `algo.onrender.com`) e `localhost` para testes locais.
