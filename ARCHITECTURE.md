# Architecture overview for Dairy CRM

## Layers (FSD)

- `app/` — Next.js routes, layouts, API auth
- `features/` — use-cases: auth, kanban, clients, calls, statuses, factories
- `widgets/` — sidebar shell
- `shared/` — UI kit, prisma, auth, validators, config
- `entities/` — reserved for shared domain types as the product grows

## Data model

```
User ──────────────< Client >──────── SalesStatus
                       │                   │
                       │                   │
               ClientDescription      SalesBoard
                       │
                       │
                 CallHistory

Factory ───────────< FactoryProduct
```

### Sales boards

| type | UI label   | Route          |
|------|------------|----------------|
| COLD | Холодные   | /sales/cold    |
| WARM | Теплые     | /sales/warm    |
| HOT  | Горячие    | /sales/hot     |

Statuses (`SalesStatus`) belong to a board, are ordered, and are fully CRUD + DnD.

Clients belong to one board + one status + one manager. Card order is stored per status.

### Purchase

Factories with nested products (fat content, packaging, price, min batch).

## Key flows

1. Auth (NextAuth credentials JWT) → Dashboard
2. Kanban DnD → `moveClient` / `reorderStatuses` server actions → PostgreSQL
3. Client page → TipTap description + call history feed (newest first)
4. Purchase table (TanStack Table) → factory card → product CRUD
