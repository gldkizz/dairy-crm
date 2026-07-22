"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  KanbanBoard,
  type KanbanStatus,
} from "@/features/kanban/ui/kanban-board";
import { CreateClientDrawer } from "@/features/clients/ui/create-client-dialog";
import { ClientDrawer } from "@/features/clients/ui/client-drawer";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

type SalesBoardViewProps = {
  boardId: string;
  boardType: "COLD" | "WARM" | "HOT";
  title: string;
  statuses: KanbanStatus[];
  managers: { id: string; name: string }[];
  cities: string[];
  currentUserId: string;
};

export function SalesBoardView({
  boardId,
  boardType,
  title,
  statuses,
  managers,
  cities,
  currentUserId,
}: SalesBoardViewProps) {
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [city, setCity] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState(
    statuses[0]?.id ?? "",
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      statusId: statusId || undefined,
      managerId: managerId || undefined,
      city: city || undefined,
    }),
    [search, statusId, managerId, city],
  );

  return (
    <div className="flex h-[calc(100dvh-5.75rem)] flex-col gap-4 md:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-55">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Поиск по названию или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-full sm:w-45"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        >
          <option value="">Все статусы</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-full sm:w-45"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        >
          <option value="">Все менеджеры</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-full sm:w-45"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-h-0 flex-1">
        <KanbanBoard
          boardId={boardId}
          boardType={boardType}
          title={title}
          statuses={statuses}
          filters={filters}
          onCreateClient={(id) => {
            setDefaultStatusId(id);
            setCreateOpen(true);
          }}
          onOpenClient={(id) => {
            setSelectedClientId(id);
            setClientDrawerOpen(true);
          }}
        />
      </div>

      <CreateClientDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        boardId={boardId}
        defaultStatusId={defaultStatusId || statuses[0]?.id || ""}
        statuses={statuses.map((s) => ({ id: s.id, name: s.name }))}
        managers={managers}
        currentUserId={currentUserId}
      />

      <ClientDrawer
        clientId={selectedClientId}
        open={clientDrawerOpen}
        onOpenChange={(open) => {
          setClientDrawerOpen(open);
          if (!open) setSelectedClientId(null);
        }}
      />
    </div>
  );
}
