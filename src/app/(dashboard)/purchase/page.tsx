import { FactoriesTable } from "@/features/factories/ui/factories-table";
import { prisma } from "@/shared/lib/prisma";

export default async function PurchasePage() {
  const factories = await prisma.factory.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      products: { select: { id: true, name: true } },
    },
  });

  const regions = Array.from(
    new Set(factories.map((f) => f.region).filter((r): r is string => Boolean(r))),
  ).sort();

  const productNames = Array.from(
    new Set(factories.flatMap((f) => f.products.map((p) => p.name))),
  ).sort();

  return (
    <FactoriesTable
      factories={factories}
      regions={regions}
      productNames={productNames}
    />
  );
}
