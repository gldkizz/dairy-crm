"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/session";
import { clientSchema } from "@/shared/lib/validators";
import { BOARD_TYPE_TO_SLUG } from "@/shared/config/boards";

function revalidateSalesPaths() {
  revalidatePath("/sales/cold");
  revalidatePath("/sales/warm");
  revalidatePath("/sales/hot");
  revalidatePath("/");
}

export async function createClient(input: unknown) {
  await requireUser();
  const data = clientSchema.parse(input);

  const maxOrder = await prisma.client.aggregate({
    where: { statusId: data.statusId },
    _max: { order: true },
  });

  const client = await prisma.client.create({
    data: {
      companyName: data.companyName,
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      email: data.email || null,
      city: data.city || null,
      address: data.address || null,
      extraContacts: data.extraContacts ?? undefined,
      statusId: data.statusId,
      boardId: data.boardId,
      managerId: data.managerId,
      order: (maxOrder._max.order ?? -1) + 1,
      description: { create: { content: "" } },
    },
    include: { board: true },
  });

  revalidateSalesPaths();
  revalidatePath(`/clients/${client.id}`);
  return client;
}

export async function updateClient(id: string, input: unknown) {
  await requireUser();
  const data = clientSchema.partial().parse(input);

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.contactPerson !== undefined && {
        contactPerson: data.contactPerson || null,
      }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.extraContacts !== undefined && {
        extraContacts: data.extraContacts ?? undefined,
      }),
      ...(data.statusId !== undefined && { statusId: data.statusId }),
      ...(data.boardId !== undefined && { boardId: data.boardId }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
    },
    include: { board: true },
  });

  revalidateSalesPaths();
  revalidatePath(`/clients/${id}`);
  return client;
}

export async function deleteClient(id: string) {
  await requireUser();
  const client = await prisma.client.delete({
    where: { id },
    include: { board: true },
  });
  revalidateSalesPaths();
  return client;
}

export async function updateClientDescription(clientId: string, content: string) {
  await requireUser();
  await prisma.clientDescription.upsert({
    where: { clientId },
    update: { content },
    create: { clientId, content },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function moveClient(input: {
  clientId: string;
  statusId: string;
  order: number;
}) {
  await requireUser();

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: input.clientId },
    include: { board: true, status: true },
  });

  const targetStatus = await prisma.salesStatus.findUniqueOrThrow({
    where: { id: input.statusId },
    include: { board: true },
  });

  const oldStatusId = client.statusId;
  const oldBoardId = client.boardId;
  const boardChanged = targetStatus.boardId !== client.boardId;

  await prisma.$transaction(async (tx) => {
    const siblings = await tx.client.findMany({
      where: {
        statusId: input.statusId,
        id: { not: input.clientId },
      },
      orderBy: { order: "asc" },
    });

    const orderedIds = siblings.map((c) => c.id);
    const insertAt = Math.max(0, Math.min(input.order, orderedIds.length));
    orderedIds.splice(insertAt, 0, input.clientId);

    await tx.client.update({
      where: { id: input.clientId },
      data: {
        statusId: input.statusId,
        boardId: targetStatus.boardId,
        order: insertAt,
      },
    });

    await Promise.all(
      orderedIds.map((id, index) =>
        tx.client.update({
          where: { id },
          data: {
            order: index,
            statusId: input.statusId,
            boardId: targetStatus.boardId,
          },
        }),
      ),
    );

    if (oldStatusId !== input.statusId) {
      const oldSiblings = await tx.client.findMany({
        where: { statusId: oldStatusId },
        orderBy: { order: "asc" },
      });
      await Promise.all(
        oldSiblings.map((c, index) =>
          tx.client.update({
            where: { id: c.id },
            data: { order: index },
          }),
        ),
      );
    }
  });

  revalidateSalesPaths();
  revalidatePath(`/clients/${input.clientId}`);

  if (boardChanged) {
    const oldBoard = await prisma.salesBoard.findUnique({
      where: { id: oldBoardId },
    });
    if (oldBoard) {
      revalidatePath(`/sales/${BOARD_TYPE_TO_SLUG[oldBoard.type]}`);
    }
    revalidatePath(`/sales/${BOARD_TYPE_TO_SLUG[targetStatus.board.type]}`);
  }

  return {
    boardId: targetStatus.boardId,
    boardType: targetStatus.board.type,
    statusId: input.statusId,
  };
}

/** Перенос по типу доски: COLD / WARM / HOT */
export async function transferClientByType(
  clientId: string,
  type: "COLD" | "WARM" | "HOT",
) {
  await requireUser();
  const board = await prisma.salesBoard.findUniqueOrThrow({ where: { type } });
  return transferClientToBoard({ clientId, boardId: board.id });
}

/** Перенос клиента на другую доску (Холодные / Теплые / Горячие). */
export async function transferClientToBoard(input: {
  clientId: string;
  boardId: string;
  statusId?: string;
}) {
  await requireUser();

  const targetBoard = await prisma.salesBoard.findUniqueOrThrow({
    where: { id: input.boardId },
    include: { statuses: { orderBy: { order: "asc" } } },
  });

  if (targetBoard.statuses.length === 0) {
    throw new Error("На целевой доске нет статусов");
  }

  let statusId = input.statusId;
  if (statusId) {
    const belongs = targetBoard.statuses.some((s) => s.id === statusId);
    if (!belongs) {
      throw new Error("Статус не принадлежит выбранной доске");
    }
  } else {
    statusId = targetBoard.statuses[0]!.id;
  }

  const maxOrder = await prisma.client.aggregate({
    where: { statusId },
    _max: { order: true },
  });

  return moveClient({
    clientId: input.clientId,
    statusId,
    order: (maxOrder._max.order ?? -1) + 1,
  });
}

export async function reorderClientsInStatus(
  statusId: string,
  orderedIds: string[],
) {
  await requireUser();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.client.update({
        where: { id },
        data: { order: index, statusId },
      }),
    ),
  );
  revalidateSalesPaths();
}

export async function getClientForDrawer(id: string) {
  await requireUser();

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

  if (!client) return null;

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
    boards.find((b) => b.id === client.boardId)?.statuses.map((s) => ({
      id: s.id,
      name: s.name,
    })) ?? [];

  return {
    client: {
      ...client,
      extraContacts: (client.extraContacts as
        | { name?: string; phone?: string; email?: string }[]
        | null) ?? null,
    },
    statuses,
    managers,
    boards: boards.map((b) => ({
      id: b.id,
      type: b.type,
      name: b.name,
      statuses: b.statuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
      })),
    })),
  };
}
