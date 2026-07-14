"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getFactoryForDrawer } from "@/features/factories/actions";
import { FactoryDetailView } from "@/features/factories/ui/factory-detail-view";
import { Drawer } from "@/shared/ui/drawer";

type FactoryDrawerProps = {
  factoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FactoryDrawer({
  factoryId,
  open,
  onOpenChange,
}: FactoryDrawerProps) {
  const [pending, startTransition] = useTransition();
  const [factory, setFactory] = useState<Awaited<
    ReturnType<typeof getFactoryForDrawer>
  > | null>(null);

  useEffect(() => {
    if (!open || !factoryId) {
      setFactory(null);
      return;
    }

    startTransition(async () => {
      try {
        const result = await getFactoryForDrawer(factoryId);
        if (!result) {
          toast.error("Завод не найден");
          onOpenChange(false);
          return;
        }
        setFactory(result);
      } catch {
        toast.error("Не удалось загрузить завод");
        onOpenChange(false);
      }
    });
  }, [open, factoryId, onOpenChange]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={factory?.name ?? "Завод"}
      description={
        factory?.region
          ? factory.region
          : pending
            ? "Загрузка..."
            : "Поставщик"
      }
      widthClassName="max-w-xl md:max-w-2xl lg:max-w-3xl"
    >
      {pending && !factory ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Загрузка карточки...
        </div>
      ) : null}

      {factory ? (
        <FactoryDetailView
          key={factory.id}
          factory={factory}
          variant="drawer"
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}
