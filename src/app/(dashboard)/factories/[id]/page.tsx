import { notFound } from "next/navigation";
import { FactoryDetailView } from "@/features/factories/ui/factory-detail-view";
import { prisma } from "@/shared/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FactoryPage({ params }: PageProps) {
  const { id } = await params;

  const factory = await prisma.factory.findUnique({
    where: { id },
    include: {
      products: { orderBy: { name: "asc" } },
    },
  });

  if (!factory) notFound();

  return (
    <FactoryDetailView
      factory={{
        ...factory,
        products: factory.products.map((p) => ({
          ...p,
          price: p.price != null ? p.price.toString() : null,
        })),
      }}
    />
  );
}
