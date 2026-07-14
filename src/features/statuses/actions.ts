"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/session";
import { statusSchema } from "@/shared/lib/validators";
import { BOARD_TYPE_TO_SLUG } from "@/shared/config/boards";

async function revalidateBoard(boardId: string) {
  const board = await prisma.salesBoard.findUniqueOrThrow({
    where: { id: boardId },
  });
  revalidatePath(`/sales/${BOARD_TYPE_TO_SLUG[board.type]}`);
}

export async function createStatus(input: unknown) {
  await requireUser();
  const data = statusSchema.parse(input);

  const maxOrder = await prisma.salesStatus.aggregate({
    where: { boardId: data.boardId },
    _max: { order: true },
  });

  const status = await prisma.salesStatus.create({
    data: {
      boardId: data.boardId,
      name: data.name,
      color: data.color ?? "#94a3b8",
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await revalidateBoard(data.boardId);
  return status;
}

export async function updateStatus(
  id: string,
  input: { name?: string; color?: string },
) {
  await requireUser();
  const status = await prisma.salesStatus.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    },
  });
  await revalidateBoard(status.boardId);
  return status;
}

export async function deleteStatus(id: string) {
  await requireUser();
  const status = await prisma.salesStatus.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { clients: true } } },
  });

  if (status._count.clients > 0) {
    throw new Error("Нельзя удалить статус с клиентами. Сначала переместите карточки.");
  }

  await prisma.salesStatus.delete({ where: { id } });
  await revalidateBoard(status.boardId);
}

export async function reorderStatuses(boardId: string, orderedIds: string[]) {
  await requireUser();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.salesStatus.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
  await revalidateBoard(boardId);
}
