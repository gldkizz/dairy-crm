import { notFound } from "next/navigation";
import { BoardType } from "@/generated/prisma/client";
import { SalesBoardView } from "@/features/kanban/ui/sales-board-view";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import {
  BOARD_LABELS,
  SLUG_TO_BOARD_TYPE,
  type BoardSlug,
} from "@/shared/config/boards";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SalesBoardPage({ params }: PageProps) {
  const { slug } = await params;
  if (!(slug in SLUG_TO_BOARD_TYPE)) notFound();

  const boardType = SLUG_TO_BOARD_TYPE[slug as BoardSlug] as BoardType;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const [board, managers] = await Promise.all([
    prisma.salesBoard.findUniqueOrThrow({
      where: { type: boardType },
      include: {
        statuses: {
          orderBy: { order: "asc" },
          include: {
            clients: {
              orderBy: { order: "asc" },
              include: {
                manager: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const cities = Array.from(
    new Set(
      board.statuses
        .flatMap((s) => s.clients.map((c) => c.city))
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort();

  return (
    <SalesBoardView
      boardId={board.id}
      boardType={board.type}
      title={BOARD_LABELS[board.type]}
      currentUserId={session.user.id}
      managers={managers}
      cities={cities}
      statuses={board.statuses.map((status) => ({
        id: status.id,
        name: status.name,
        color: status.color,
        order: status.order,
        clients: status.clients.map((client) => ({
          id: client.id,
          companyName: client.companyName,
          contactPerson: client.contactPerson,
          phone: client.phone,
          city: client.city,
          order: client.order,
          statusId: client.statusId,
          manager: {
            id: client.manager.id,
            name: client.manager.name,
          },
        })),
      }))}
    />
  );
}
