"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getClientForDrawer } from "@/features/clients/actions";
import { ClientDetailView } from "@/features/clients/ui/client-detail-view";
import { Drawer } from "@/shared/ui/drawer";

type ClientDrawerProps = {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClientDrawer({
  clientId,
  open,
  onOpenChange,
}: ClientDrawerProps) {
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getClientForDrawer>
  > | null>(null);

  useEffect(() => {
    if (!open || !clientId) {
      setData(null);
      return;
    }

    startTransition(async () => {
      try {
        const result = await getClientForDrawer(clientId);
        if (!result) {
          toast.error("Клиент не найден");
          onOpenChange(false);
          return;
        }
        setData(result);
      } catch {
        toast.error("Не удалось загрузить клиента");
        onOpenChange(false);
      }
    });
  }, [open, clientId, onOpenChange]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={data?.client.companyName ?? "Клиент"}
      description={
        data
          ? `${data.client.board.name} · ${data.client.status.name}`
          : pending
            ? "Загрузка..."
            : undefined
      }
      widthClassName="max-w-xl md:max-w-2xl lg:max-w-3xl"
    >
      {pending && !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Загрузка карточки...
        </div>
      ) : null}

      {data ? (
        <ClientDetailView
          key={data.client.id}
          client={data.client}
          statuses={data.statuses}
          managers={data.managers}
          boards={data.boards}
          variant="drawer"
          onClose={() => onOpenChange(false)}
          onTransferred={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}
