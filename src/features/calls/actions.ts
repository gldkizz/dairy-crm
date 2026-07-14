"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/session";
import { callHistorySchema } from "@/shared/lib/validators";

export async function createCall(input: unknown) {
  await requireUser();
  const data = callHistorySchema.parse(input);

  const call = await prisma.callHistory.create({
    data: {
      clientId: data.clientId,
      callDate: data.callDate,
      content: data.content,
      result: data.result || null,
      nextStep: data.nextStep || null,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  return call;
}

export async function updateCall(id: string, input: unknown) {
  await requireUser();
  const data = callHistorySchema.partial().omit({ clientId: true }).parse(input);

  const call = await prisma.callHistory.update({
    where: { id },
    data: {
      ...(data.callDate !== undefined && { callDate: data.callDate }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.result !== undefined && { result: data.result || null }),
      ...(data.nextStep !== undefined && { nextStep: data.nextStep || null }),
    },
  });

  revalidatePath(`/clients/${call.clientId}`);
  return call;
}

export async function deleteCall(id: string) {
  await requireUser();
  const call = await prisma.callHistory.delete({ where: { id } });
  revalidatePath(`/clients/${call.clientId}`);
  return call;
}
