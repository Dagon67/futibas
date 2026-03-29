# Regras Firestore

Cole no Firebase Console → Firestore → **Regras** → **Publicar**.

Inclui: leitura do perfil `users/{uid}`, leitura do clube `tenants/{tenantId}`, e **leitura/escrita** nas subcoleções usadas pela app:

- **`trainingExports/{trainingId}`** — um doc por treino (dados agregados por export, como no Sheets).
- **`roster/current`** — plantel atual.
- **`exportEvents/{autoId}`** — histórico append-only de cada export (para dashboards / auditoria).

> Se ainda tiveres dados antigos em **`snapshot/last`**, podes manter a regra abaixo para essa subcoleção ou apagá-la.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function userTenantId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }

    function ownsTenant(tenantId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && userTenantId() == tenantId;
    }

    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    match /tenants/{tenantId} {
      allow read: if ownsTenant(tenantId);
      allow write: if false;

      match /trainingExports/{docId} {
        allow read, write: if ownsTenant(tenantId);
      }

      match /roster/{docId} {
        allow read, write: if ownsTenant(tenantId);
      }

      match /exportEvents/{docId} {
        allow read, write: if ownsTenant(tenantId);
      }

      match /snapshot/{docId} {
        allow read, write: if ownsTenant(tenantId);
      }
    }
  }
}
```

**Authentication → Authorized domains:** domínio do Render + `localhost`.
