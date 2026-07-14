import Link from "next/link";
import { Flame, Snowflake, SunMedium, Factory } from "lucide-react";
import { prisma } from "@/shared/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function DashboardPage() {
  const [cold, warm, hot, factories, calls] = await Promise.all([
    prisma.client.count({ where: { board: { type: "COLD" } } }),
    prisma.client.count({ where: { board: { type: "WARM" } } }),
    prisma.client.count({ where: { board: { type: "HOT" } } }),
    prisma.factory.count(),
    prisma.callHistory.count(),
  ]);

  const recentCalls = await prisma.callHistory.findMany({
    take: 5,
    orderBy: { callDate: "desc" },
    include: {
      client: { select: { id: true, companyName: true } },
    },
  });

  const cards = [
    {
      href: "/sales/cold",
      title: "Холодные",
      value: cold,
      icon: Snowflake,
      hint: "Первичные лиды",
    },
    {
      href: "/sales/warm",
      title: "Теплые",
      value: warm,
      icon: SunMedium,
      hint: "В работе / через месяц",
    },
    {
      href: "/sales/hot",
      title: "Горячие",
      value: hot,
      icon: Flame,
      hint: "Ежедневные переговоры",
    },
    {
      href: "/purchase",
      title: "Заводы",
      value: factories,
      icon: Factory,
      hint: "Поставщики",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-500">
          Сводка по продажам и закупкам. Всего звонков в истории: {calls}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние звонки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentCalls.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет записей</p>
          ) : (
            recentCalls.map((call) => (
              <Link
                key={call.id}
                href={`/clients/${call.client.id}`}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {call.client.companyName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {call.result || call.content.replace(/<[^>]+>/g, "")}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(call.callDate).toLocaleDateString("ru-RU")}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
