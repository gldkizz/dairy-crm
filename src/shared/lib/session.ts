import { BoardType } from "@/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { auth } from "@/shared/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getBoardByType(type: BoardType) {
  return prisma.salesBoard.findUniqueOrThrow({
    where: { type },
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
  });
}
