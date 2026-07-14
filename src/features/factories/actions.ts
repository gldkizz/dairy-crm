"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/session";
import { factoryProductSchema, factorySchema } from "@/shared/lib/validators";

export async function createFactory(input: unknown) {
  await requireUser();
  const data = factorySchema.parse(input);

  const factory = await prisma.factory.create({
    data: {
      name: data.name,
      region: data.region || null,
      lpr: data.lpr || null,
      phone: data.phone || null,
      email: data.email || null,
      hasContract: data.hasContract ?? false,
      address: data.address || null,
      website: data.website || null,
      rating: data.rating ?? 0,
      description: data.description || null,
    },
  });

  revalidatePath("/purchase");
  return factory;
}

export async function updateFactory(id: string, input: unknown) {
  await requireUser();
  const data = factorySchema.partial().parse(input);

  const factory = await prisma.factory.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.region !== undefined && { region: data.region || null }),
      ...(data.lpr !== undefined && { lpr: data.lpr || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.hasContract !== undefined && { hasContract: data.hasContract }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.rating !== undefined && { rating: data.rating }),
      ...(data.description !== undefined && {
        description: data.description || null,
      }),
    },
  });

  revalidatePath("/purchase");
  revalidatePath(`/factories/${id}`);
  return factory;
}

export async function deleteFactory(id: string) {
  await requireUser();
  await prisma.factory.delete({ where: { id } });
  revalidatePath("/purchase");
}

export async function createFactoryProduct(input: unknown) {
  await requireUser();
  const data = factoryProductSchema.parse(input);

  const product = await prisma.factoryProduct.create({
    data: {
      factoryId: data.factoryId,
      name: data.name,
      fatContent: data.fatContent || null,
      packaging: data.packaging || null,
      price: data.price ?? null,
      minBatch: data.minBatch || null,
      priceUpdatedAt: data.price != null ? new Date() : null,
    },
  });

  revalidatePath(`/factories/${data.factoryId}`);
  revalidatePath("/purchase");
  return product;
}

export async function updateFactoryProduct(id: string, input: unknown) {
  await requireUser();
  const data = factoryProductSchema.partial().omit({ factoryId: true }).parse(input);

  const existing = await prisma.factoryProduct.findUniqueOrThrow({
    where: { id },
  });

  const product = await prisma.factoryProduct.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.fatContent !== undefined && {
        fatContent: data.fatContent || null,
      }),
      ...(data.packaging !== undefined && {
        packaging: data.packaging || null,
      }),
      ...(data.price !== undefined && {
        price: data.price,
        priceUpdatedAt: new Date(),
      }),
      ...(data.minBatch !== undefined && { minBatch: data.minBatch || null }),
    },
  });

  revalidatePath(`/factories/${existing.factoryId}`);
  revalidatePath("/purchase");
  return product;
}

export async function deleteFactoryProduct(id: string) {
  await requireUser();
  const product = await prisma.factoryProduct.delete({ where: { id } });
  revalidatePath(`/factories/${product.factoryId}`);
  revalidatePath("/purchase");
}

export async function getFactoryForDrawer(id: string) {
  await requireUser();

  const factory = await prisma.factory.findUnique({
    where: { id },
    include: {
      products: { orderBy: { name: "asc" } },
    },
  });

  if (!factory) return null;

  return {
    ...factory,
    products: factory.products.map((p) => ({
      ...p,
      price: p.price != null ? p.price.toString() : null,
    })),
  };
}
