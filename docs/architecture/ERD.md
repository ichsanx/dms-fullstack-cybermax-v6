# ERD (Entity Relationship Diagram)

Below is a minimal ERD to explain core data relationships.  
(Your implementation may add fields like `tenantId`, `department`, `audit`, `outbox`, etc.)

```mermaid
erDiagram
  USER ||--o{ DOCUMENT : creates
  USER ||--o{ APPROVAL : requests
  USER ||--o{ NOTIFICATION : receives

  DOCUMENT ||--o{ APPROVAL : has

  USER {
    uuid id
    string email
    string passwordHash
    string role
    datetime createdAt
  }

  DOCUMENT {
    uuid id
    string title
    string description
    string documentType
    string fileKey
    int version
    string status
    uuid createdBy
    datetime createdAt
    datetime updatedAt
  }

  APPROVAL {
    uuid id
    string type
    string status
    uuid documentId
    uuid requestedBy
    uuid decidedBy
    string reason
    datetime createdAt
    datetime decidedAt
    datetime executedAt
  }

  NOTIFICATION {
    uuid id
    uuid userId
    string type
    string message
    boolean isRead
    datetime createdAt
  }
```

---

## Indexing Recommendations (PostgreSQL)

- `Document(createdBy, createdAt DESC)` → list
- `Document(title)` + trigram index (optional) → search
- `Approval(status, createdAt DESC)` → admin queue
- `Approval(documentId, status)` → enforce single pending per document
- `Notification(userId, createdAt DESC)` → notification feed
