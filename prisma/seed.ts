import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const DEFAULT_STATUSES = [
  { name: "Новый", color: "#64748b", order: 0 },
  { name: "Первый звонок", color: "#3b82f6", order: 1 },
  { name: "Отправлено КП", color: "#8b5cf6", order: 2 },
  { name: "Переговоры", color: "#f59e0b", order: 3 },
  { name: "Ожидание", color: "#06b6d4", order: 4 },
  { name: "Сделка", color: "#22c55e", order: 5 },
  { name: "Отказ", color: "#ef4444", order: 6 },
];

const BOARDS = [
  { type: "COLD" as const, name: "Холодные" },
  { type: "WARM" as const, name: "Теплые" },
  { type: "HOT" as const, name: "Горячие" },
];

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const manager = await prisma.user.upsert({
    where: { email: "manager@dairy.local" },
    update: { password, name: "Иван Менеджер" },
    create: {
      email: "manager@dairy.local",
      name: "Иван Менеджер",
      password,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: "anna@dairy.local" },
    update: { password, name: "Анна Продажи" },
    create: {
      email: "anna@dairy.local",
      name: "Анна Продажи",
      password,
    },
  });

  for (const boardDef of BOARDS) {
    const board = await prisma.salesBoard.upsert({
      where: { type: boardDef.type },
      update: { name: boardDef.name },
      create: {
        type: boardDef.type,
        name: boardDef.name,
        statuses: {
          create: DEFAULT_STATUSES,
        },
      },
      include: { statuses: { orderBy: { order: "asc" } } },
    });

    if (board.statuses.length === 0) {
      await prisma.salesStatus.createMany({
        data: DEFAULT_STATUSES.map((s) => ({ ...s, boardId: board.id })),
      });
    }
  }

  const cold = await prisma.salesBoard.findUniqueOrThrow({
    where: { type: "COLD" },
    include: { statuses: { orderBy: { order: "asc" } } },
  });
  const warm = await prisma.salesBoard.findUniqueOrThrow({
    where: { type: "WARM" },
    include: { statuses: { orderBy: { order: "asc" } } },
  });
  const hot = await prisma.salesBoard.findUniqueOrThrow({
    where: { type: "HOT" },
    include: { statuses: { orderBy: { order: "asc" } } },
  });

  const clientsCount = await prisma.client.count();
  if (clientsCount === 0) {
    const demos = [
      {
        companyName: "ООО Молочный Двор",
        contactPerson: "Пётр Сидоров",
        phone: "+7 900 111-22-33",
        email: "info@molochnydvor.ru",
        city: "Казань",
        address: "ул. Промышленная, 12",
        boardId: hot.id,
        statusId: hot.statuses[3]!.id,
        managerId: manager.id,
        order: 0,
        description:
          "<p>Крупный дистрибьютор. Интересует сыр и сливки 33%.</p>",
        calls: [
          {
            callDate: new Date(),
            content: "<p>Созвон по поставке на апрель. Ждут КП.</p>",
            result: "Запросили КП",
            nextStep: "Отправить КП до пятницы",
          },
        ],
      },
      {
        companyName: "ИП Каримов",
        contactPerson: "Руслан Каримов",
        phone: "+7 917 555-44-11",
        email: "karimov@mail.ru",
        city: "Набережные Челны",
        boardId: warm.id,
        statusId: warm.statuses[1]!.id,
        managerId: manager.id,
        order: 0,
        description: "<p>Магазин у дома. Планирует закуп через месяц.</p>",
        calls: [],
      },
      {
        companyName: "Сеть Вкусный Край",
        contactPerson: "Елена Морозова",
        phone: "+7 843 200-10-20",
        email: "purchase@vkuskray.ru",
        city: "Казань",
        boardId: cold.id,
        statusId: cold.statuses[0]!.id,
        managerId: manager2.id,
        order: 0,
        description: "<p>Холодный лид из таможенной выгрузки.</p>",
        calls: [],
      },
      {
        companyName: "ТД АгроСнаб",
        contactPerson: "Дмитрий Волков",
        phone: "+7 987 321-00-99",
        city: "Ульяновск",
        boardId: cold.id,
        statusId: cold.statuses[6]!.id,
        managerId: manager.id,
        order: 1,
        description: "<p>Отшили — работают с другим поставщиком.</p>",
        calls: [
          {
            callDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            content: "<p>Сказали, что контракт уже закрыт до конца года.</p>",
            result: "Отказ",
            nextStep: "Перезвонить в январе",
          },
        ],
      },
    ];

    for (const demo of demos) {
      const { description, calls, ...clientData } = demo;
      await prisma.client.create({
        data: {
          ...clientData,
          description: { create: { content: description } },
          callHistory: calls.length
            ? { create: calls }
            : undefined,
        },
      });
    }
  }

  const factoriesCount = await prisma.factory.count();
  if (factoriesCount === 0) {
    await prisma.factory.create({
      data: {
        name: "Завод Вамин",
        region: "Татарстан",
        lpr: "Сергей Иванович",
        phone: "+7 843 555-12-12",
        email: "sales@vamin.ru",
        address: "г. Казань, ул. Заводская, 1",
        website: "https://vamin.ru",
        rating: 5,
        description: "Основной поставщик сыров и масла.",
        products: {
          create: [
            {
              name: "Сыр Российский",
              fatContent: "50%",
              packaging: "Брус 5 кг",
              price: 520,
              minBatch: "200 кг",
              priceUpdatedAt: new Date(),
            },
            {
              name: "Масло крестьянское",
              fatContent: "72.5%",
              packaging: "Пачка 180 г",
              price: 145,
              minBatch: "50 кг",
              priceUpdatedAt: new Date(),
            },
          ],
        },
      },
    });

    await prisma.factory.create({
      data: {
        name: "Агросила Молоко",
        region: "Татарстан",
        lpr: "Марина Котова",
        phone: "+7 8555 40-00-00",
        email: "opt@agrosila.ru",
        address: "г. Набережные Челны",
        rating: 4,
        description: "Сливки и молоко.",
        products: {
          create: [
            {
              name: "Сливки 33%",
              fatContent: "33%",
              packaging: "Пакет 1 кг",
              price: 280,
              minBatch: "100 кг",
              priceUpdatedAt: new Date(),
            },
          ],
        },
      },
    });
  }

  console.log("Seed completed.");
  console.log("Login: manager@dairy.local / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
