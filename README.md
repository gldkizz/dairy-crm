# Dairy CRM

CRM для менеджеров по продажам молочной продукции.

## Стек

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM 7
- Tailwind CSS
- NextAuth (credentials)
- dnd-kit, TipTap, TanStack Table, React Hook Form, Zod
- Docker Compose

## Запуск (локальная разработка, без rebuild Docker)

Только Postgres в Docker, Next.js на хосте с hot reload:

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env   # при необходимости
npm install
npx prisma migrate deploy
npm run db:seed        # один раз
npm run dev
```

Открыть: http://localhost:3000

Демо-логин:

- Email: `manager@dairy.local`
- Password: `password123`

## Docker (полный прод-стек)

```bash
docker compose up -d --build
```

На сервере с host-nginx сайт обычно на `:8080` — см. `nginx/dairy-crm.conf` и `APP_URL` в `.env`.

## Разделы

1. **Продажа** — Kanban: Холодные / Теплые / Горячие
2. **Клиент** — реквизиты, TipTap, история звонков
3. **Закупка** — заводы + продукция

Подробнее: [ARCHITECTURE.md](./ARCHITECTURE.md)
