# Regras Firestore

Cole no Firebase Console → Firestore → **Regras** → **Publicar**.

Inclui: leitura do perfil `users/{uid}`, leitura do documento do clube `tenants/{tenantId}`, e **leitura/escrita** em `tenants/{tenantId}/snapshot/{docId}` (o app grava `snapshot/last` após sync ao Sheets).

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

      match /snapshot/{docId} {
        allow read, write: if ownsTenant(tenantId);
      }
    }
  }
}
```

**Authentication → Authorized domains:** domínio do Render + `localhost`.
