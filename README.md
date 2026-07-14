# Dairy CRM

CRM для менеджеров по продажам молочной продукции.

## Стек

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM 7
- Tailwind CSS
- NextAuth (credentials)
- dnd-kit, TipTap, TanStack Table, React Hook Form, Zod
- Docker Compose

## Запуск (локально)

```bash
docker compose up -d db
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Открыть: http://localhost:3000

Демо-логин:

- Email: `manager@dairy.local`
- Password: `password123`

## Docker (полный стек)

```bash
docker compose up --build
```

## Разделы

1. **Продажа** — Kanban: Холодные / Теплые / Горячие
2. **Клиент** — реквизиты, TipTap, история звонков
3. **Закупка** — заводы + продукция

Подробнее: [ARCHITECTURE.md](./ARCHITECTURE.md)
