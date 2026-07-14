"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { moveClient, transferClientByType } from "@/features/clients/actions";
import {
  createStatus,
  deleteStatus,
  reorderStatuses,
  updateStatus,
} from "@/features/statuses/actions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

export type KanbanClient = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  city: string | null;
  order: number;
  statusId: string;
  manager: { id: string; name: string };
};

export type KanbanStatus = {
  id: string;
  name: string;
  color: string;
  order: number;
  clients: KanbanClient[];
};

type KanbanBoardProps = {
  boardId: string;
  boardType: "COLD" | "WARM" | "HOT";
  title: string;
  statuses: KanbanStatus[];
  onCreateClient: (statusId: string) => void;
  onOpenClient: (clientId: string) => void;
  filters?: {
    search?: string;
    statusId?: string;
    managerId?: string;
    city?: string;
  };
};

type BoardState = KanbanStatus[];

export function KanbanBoard({
  boardId,
  boardType,
  title,
  statuses: initialStatuses,
  onCreateClient,
  onOpenClient,
  filters,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"column" | "card" | null>(null);
  const [, startTransition] = useTransition();
  const [newStatusOpen, setNewStatusOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");

  const filtered = useMemo(() => {
    return initialStatuses
      .filter((s) => !filters?.statusId || s.id === filters.statusId)
      .map((status) => ({
        ...status,
        clients: status.clients.filter((c) => {
          if (filters?.managerId && c.manager.id !== filters.managerId) {
            return false;
          }
          if (
            filters?.city &&
            !(c.city ?? "").toLowerCase().includes(filters.city.toLowerCase())
          ) {
            return false;
          }
          if (filters?.search) {
            const q = filters.search.toLowerCase();
            const hay = `${c.companyName} ${c.phone ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        }),
      }));
  }, [initialStatuses, filters]);

  const [optimistic, setOptimistic] = useOptimistic(
    filtered,
    (_current, next: BoardState) => next,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const findContainer = (id: string, board: BoardState) => {
    if (board.some((s) => s.id === id)) return id;
    return board.find((s) => s.clients.some((c) => c.id === id))?.id;
  };

  const onDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type as "column" | "card";
    setActiveType(type);
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || activeType !== "card") return;

    const activeContainer = findContainer(String(active.id), optimistic);
    const overContainer = findContainer(String(over.id), optimistic);
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const next = optimistic.map((status) => ({
      ...status,
      clients: [...status.clients],
    }));

    const from = next.find((s) => s.id === activeContainer)!;
    const to = next.find((s) => s.id === overContainer)!;
    const activeIndex = from.clients.findIndex((c) => c.id === active.id);
    if (activeIndex < 0) return;

    const [moved] = from.clients.splice(activeIndex, 1);
    const overIndex = to.clients.findIndex((c) => c.id === over.id);
    const insertIndex = overIndex >= 0 ? overIndex : to.clients.length;
    to.clients.splice(insertIndex, 0, {
      ...moved!,
      statusId: to.id,
    });

    setOptimistic(next);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    if (!over) return;

    if (activeType === "column") {
      const oldIndex = optimistic.findIndex((s) => s.id === active.id);
      const newIndex = optimistic.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const next = arrayMove(optimistic, oldIndex, newIndex);
      setOptimistic(next);
      startTransition(async () => {
        try {
          await reorderStatuses(
            boardId,
            next.map((s) => s.id),
          );
        } catch {
          toast.error("Не удалось сохранить порядок статусов");
        }
      });
      return;
    }

    const containerId = findContainer(String(over.id), optimistic);
    if (!containerId) return;

    const status = optimistic.find((s) => s.id === containerId);
    if (!status) return;
    const order = status.clients.findIndex((c) => c.id === active.id);

    startTransition(async () => {
      try {
        await moveClient({
          clientId: String(active.id),
          statusId: containerId,
          order: Math.max(order, 0),
        });
      } catch {
        toast.error("Не удалось переместить клиента");
      }
    });
  };

  const activeCard = activeId
    ? optimistic.flatMap((s) => s.clients).find((c) => c.id === activeId)
    : null;
  const activeColumn = activeId
    ? optimistic.find((s) => s.id === activeId)
    : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="text-sm text-slate-500">
            Перетаскивайте карточки и колонки — изменения сохраняются сразу
          </p>
        </div>
        <Button onClick={() => setNewStatusOpen(true)} variant="outline">
          <Plus className="h-4 w-4" />
          Статус
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={optimistic.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {optimistic.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                boardType={boardType}
                onCreateClient={onCreateClient}
                onOpenClient={onOpenClient}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeType === "card" && activeCard ? (
            <ClientCard
              client={activeCard}
              boardType={boardType}
              dragging
              onOpenClient={() => undefined}
            />
          ) : null}
          {activeType === "column" && activeColumn ? (
            <div className="w-72 rounded-2xl border border-slate-200 bg-slate-50 p-3 opacity-90 shadow-lg">
              <p className="font-medium text-slate-800">{activeColumn.name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={newStatusOpen} onOpenChange={setNewStatusOpen}>
        <DialogContent title="Новый статус">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  await createStatus({ boardId, name: newStatusName });
                  setNewStatusName("");
                  setNewStatusOpen(false);
                  toast.success("Статус создан");
                } catch {
                  toast.error("Не удалось создать статус");
                }
              });
            }}
          >
            <Input
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              placeholder="Например: Повторный звонок"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewStatusOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Создать</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanColumn({
  status,
  boardType,
  onCreateClient,
  onOpenClient,
}: {
  status: KanbanStatus;
  boardType: "COLD" | "WARM" | "HOT";
  onCreateClient: (statusId: string) => void;
  onOpenClient: (clientId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: status.id,
    data: { type: "column" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(status.name);
  const [, startTransition] = useTransition();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-200/60 px-3 py-3">
        <button
          type="button"
          className="cursor-grab text-slate-400 hover:text-slate-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="flex-1 truncate text-sm font-semibold text-slate-800">
          {status.name}
        </h3>
        <Badge className="border-0 bg-white">{status.clients.length}</Badge>
        <div className="relative">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  startTransition(async () => {
                    try {
                      await deleteStatus(status.id);
                      toast.success("Статус удалён");
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Не удалось удалить статус",
                      );
                    }
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <SortableContext
        items={status.clients.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {status.clients.map((client) => (
            <SortableClientCard
              key={client.id}
              client={client}
              boardType={boardType}
              onOpenClient={onOpenClient}
            />
          ))}
        </div>
      </SortableContext>

      <div className="p-3 pt-0">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start text-slate-500"
          onClick={() => onCreateClient(status.id)}
        >
          <Plus className="h-4 w-4" />
          Клиент
        </Button>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent title="Переименовать статус">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  await updateStatus(status.id, { name });
                  setRenameOpen(false);
                  toast.success("Статус обновлён");
                } catch {
                  toast.error("Не удалось обновить статус");
                }
              });
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenameOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableClientCard({
  client,
  boardType,
  onOpenClient,
}: {
  client: KanbanClient;
  boardType: "COLD" | "WARM" | "HOT";
  onOpenClient: (clientId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: client.id,
    data: { type: "card" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClientCard
        client={client}
        boardType={boardType}
        dragging={isDragging}
        onOpenClient={onOpenClient}
      />
    </div>
  );
}

function ClientCard({
  client,
  boardType,
  dragging,
  onOpenClient,
}: {
  client: KanbanClient;
  boardType: "COLD" | "WARM" | "HOT";
  dragging?: boolean;
  onOpenClient: (clientId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();

  const targets = (
    [
      { type: "COLD" as const, label: "Холодные" },
      { type: "WARM" as const, label: "Теплые" },
      { type: "HOT" as const, label: "Горячие" },
    ] as const
  ).filter((t) => t.type !== boardType);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md",
        dragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => {
          if (!dragging) onOpenClient(client.id);
        }}
      >
        <p className="pr-7 font-medium text-slate-900">{client.companyName}</p>
        {client.contactPerson ? (
          <p className="mt-1 text-xs text-slate-500">{client.contactPerson}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
          {client.city ? <span>{client.city}</span> : null}
          {client.phone ? <span>{client.phone}</span> : null}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{client.manager.name}</p>
      </button>

      <div className="absolute right-1.5 top-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Перенести в
            </p>
            {targets.map((t) => (
              <button
                key={t.type}
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  startTransition(async () => {
                    try {
                      await transferClientByType(client.id, t.type);
                      toast.success(`Перенесён в «${t.label}»`);
                    } catch {
                      toast.error("Не удалось перенести");
                    }
                  });
                }}
              >
                → {t.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
