import { notFound } from "next/navigation";
import { ClientDetailView } from "@/features/clients/ui/client-detail-view";
import { prisma } from "@/shared/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientPage({ params }: PageProps) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      board: true,
      status: true,
      manager: true,
      description: true,
      callHistory: { orderBy: { callDate: "desc" } },
    },
  });

  if (!client) notFound();

  const [boards, managers] = await Promise.all([
    prisma.salesBoard.findMany({
      orderBy: { type: "asc" },
      include: {
        statuses: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, color: true },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statuses =
    boards
      .find((b) => b.id === client.boardId)
      ?.statuses.map((s) => ({ id: s.id, name: s.name })) ?? [];

  return (
    <ClientDetailView
      client={{
        ...client,
        extraContacts: (client.extraContacts as
          | { name?: string; phone?: string; email?: string }[]
          | null) ?? null,
      }}
      statuses={statuses}
      managers={managers}
      boards={boards.map((b) => ({
        id: b.id,
        type: b.type,
        name: b.name,
        statuses: b.statuses,
      }))}
    />
  );
}
