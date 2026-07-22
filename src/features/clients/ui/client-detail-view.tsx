"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  deleteClient,
  transferClientToBoard,
  updateClient,
  updateClientDescription,
} from "@/features/clients/actions";
import { createCall, deleteCall, updateCall } from "@/features/calls/actions";
import { RichTextEditor } from "@/shared/ui/rich-text-editor";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";

type ExtraContact = {
  name?: string;
  phone?: string;
  email?: string;
};

type BoardOption = {
  id: string;
  type: string;
  name: string;
  statuses: { id: string; name: string; color?: string }[];
};

type FormState = {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  boardId: string;
  statusId: string;
  managerId: string;
  extraContactsText: string;
};

type ClientPageProps = {
  client: {
    id: string;
    companyName: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    address: string | null;
    extraContacts: ExtraContact[] | null;
    boardId: string;
    statusId: string;
    managerId: string;
    board: { name: string; type: string };
    status: { id: string; name: string; color: string };
    manager: { id: string; name: string };
    description: { content: string } | null;
    callHistory: Array<{
      id: string;
      callDate: string | Date;
      content: string;
      result: string | null;
      nextStep: string | null;
    }>;
  };
  statuses: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  boards?: BoardOption[];
  variant?: "page" | "drawer";
  onClose?: () => void;
  onTransferred?: () => void;
};

function buildForm(client: ClientPageProps["client"]): FormState {
  return {
    companyName: client.companyName,
    contactPerson: client.contactPerson ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    city: client.city ?? "",
    address: client.address ?? "",
    boardId: client.boardId,
    statusId: client.statusId,
    managerId: client.managerId,
    extraContactsText: JSON.stringify(client.extraContacts ?? [], null, 2),
  };
}

export function ClientDetailView({
  client,
  statuses,
  managers,
  boards = [],
  variant = "page",
  onClose,
  onTransferred,
}: ClientPageProps) {
  const router = useRouter();
  const embedded = variant === "drawer";
  const [pending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [description, setDescription] = useState(
    client.description?.content ?? "",
  );
  const [form, setForm] = useState<FormState>(() => buildForm(client));
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ form, description, clientId: client.id });
  const hydratedRef = useRef(false);

  latestRef.current = { form, description, clientId: client.id };

  useEffect(() => {
    setDescription(client.description?.content ?? "");
    setForm(buildForm(client));
    hydratedRef.current = false;
    const t = setTimeout(() => {
      hydratedRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [client]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(e.target as Node)
      ) {
        setStatusMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [statusMenuOpen]);

  const boardOptions =
    boards.length > 0
      ? boards
      : [
          {
            id: client.boardId,
            type: client.board.type,
            name: client.board.name,
            statuses: statuses.map((s) => ({ ...s, color: client.status.color })),
          },
        ];

  const activeBoard =
    boardOptions.find((b) => b.id === form.boardId) ?? boardOptions[0]!;

  const persist = useCallback(
    (nextForm: FormState, nextDescription: string) => {
      let extraContacts: ExtraContact[] | null = null;
      try {
        extraContacts = JSON.parse(nextForm.extraContactsText || "[]");
      } catch {
        toast.error("Доп. контакты: некорректный JSON");
        return;
      }

      setSaveState("saving");
      startTransition(async () => {
        try {
          const boardChanged = nextForm.boardId !== client.boardId;
          const statusChanged = nextForm.statusId !== client.statusId;

          if (boardChanged || statusChanged) {
            await transferClientToBoard({
              clientId: client.id,
              boardId: nextForm.boardId,
              statusId: nextForm.statusId,
            });
          }

          await updateClient(client.id, {
            companyName: nextForm.companyName,
            contactPerson: nextForm.contactPerson,
            phone: nextForm.phone,
            email: nextForm.email,
            city: nextForm.city,
            address: nextForm.address,
            statusId: nextForm.statusId,
            boardId: nextForm.boardId,
            managerId: nextForm.managerId,
            extraContacts,
          });
          await updateClientDescription(client.id, nextDescription);
          setSaveState("saved");
          router.refresh();
          if (boardChanged) {
            onTransferred?.();
            if (embedded) onClose?.();
          }
        } catch {
          setSaveState("idle");
          toast.error("Ошибка сохранения");
        }
      });
    },
    [client, embedded, onClose, onTransferred, router],
  );

  const scheduleSave = useCallback(
    (nextForm: FormState, nextDescription: string) => {
      if (!hydratedRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persist(nextForm, nextDescription);
      }, 550);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const patchForm = (patch: Partial<FormState>, immediate = false) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      latestRef.current.form = next;
      if (immediate) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        persist(next, latestRef.current.description);
      } else {
        scheduleSave(next, latestRef.current.description);
      }
      return next;
    });
  };

  const onDescriptionChange = (html: string) => {
    setDescription(html);
    latestRef.current.description = html;
    scheduleSave(latestRef.current.form, html);
  };

  const selectBoard = (board: BoardOption) => {
    setStatusMenuOpen(false);
    if (board.id === form.boardId) return;

    const nextStatusId = board.statuses[0]?.id ?? form.statusId;
    const next = { ...form, boardId: board.id, statusId: nextStatusId };
    setForm(next);
    latestRef.current.form = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    persist(next, latestRef.current.description);
  };

  const boardAccent: Record<string, string> = {
    COLD: "#3b82f6",
    WARM: "#f59e0b",
    HOT: "#ef4444",
  };
  const accent = boardAccent[activeBoard.type] ?? "#64748b";

  const [callOpen, setCallOpen] = useState(false);
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [callForm, setCallForm] = useState({
    callDate: format(new Date(), "yyyy-MM-dd"),
    content: "",
    result: "",
    nextStep: "",
  });

  const openNewCall = () => {
    setEditingCallId(null);
    setCallForm({
      callDate: format(new Date(), "yyyy-MM-dd"),
      content: "",
      result: "",
      nextStep: "",
    });
    setCallOpen(true);
  };

  const openEditCall = (call: ClientPageProps["client"]["callHistory"][number]) => {
    setEditingCallId(call.id);
    setCallForm({
      callDate: format(new Date(call.callDate), "yyyy-MM-dd"),
      content: call.content.replace(/<[^>]+>/g, ""),
      result: call.result ?? "",
      nextStep: call.nextStep ?? "",
    });
    setCallOpen(true);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6",
        embedded ? "max-w-none" : "mx-auto max-w-6xl",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="relative mb-3 inline-block max-w-full" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((v) => !v)}
              className="inline-flex max-w-full items-center gap-3 rounded-2xl border px-5 py-3 text-left text-lg font-semibold transition hover:shadow-sm"
              style={{
                backgroundColor: `${accent}18`,
                borderColor: accent,
                color: "#0f172a",
              }}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span className="truncate">{activeBoard.name}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 opacity-60 transition-transform",
                  statusMenuOpen && "rotate-180",
                )}
              />
            </button>

            {statusMenuOpen ? (
              <div className="absolute left-0 top-full z-40 mt-1.5 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {boardOptions.map((board) => {
                  const selected = board.id === form.boardId;
                  const color = boardAccent[board.type] ?? "#64748b";
                  return (
                    <button
                      key={board.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold transition",
                        selected
                          ? "bg-slate-900 text-white"
                          : "text-slate-800 hover:bg-slate-50",
                      )}
                      onClick={() => selectBoard(board)}
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {board.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {!embedded ? (
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {client.companyName}
            </h1>
          ) : null}
          <p className={cn("text-sm text-slate-500", !embedded && "mt-1")}>
            Менеджер: {client.manager.name}
            <span className="ml-2 text-slate-400">
              {saveState === "saving"
                ? "· сохранение…"
                : saveState === "saved"
                  ? "· сохранено"
                  : ""}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {!embedded ? (
            <Button variant="outline" onClick={() => router.back()}>
              Назад
            </Button>
          ) : null}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Удалить клиента?")) return;
              startTransition(async () => {
                await deleteClient(client.id);
                if (embedded) {
                  onClose?.();
                  router.refresh();
                } else {
                  router.push("/");
                }
              });
            }}
          >
            Удалить
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6",
          embedded ? "grid-cols-1" : "lg:grid-cols-[1.1fr_0.9fr]",
        )}
      >
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["companyName", "Компания"],
                ["contactPerson", "Контактное лицо"],
                ["phone", "Телефон"],
                ["email", "Email"],
                ["city", "Город"],
                ["address", "Адрес"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => patchForm({ [key]: e.target.value })}
                  onBlur={() => {
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    persist(
                      latestRef.current.form,
                      latestRef.current.description,
                    );
                  }}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Менеджер</Label>
              <Select
                value={form.managerId}
                onChange={(e) =>
                  patchForm({ managerId: e.target.value }, true)
                }
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Дополнительные контакты (JSON)</Label>
              <Textarea
                rows={4}
                value={form.extraContactsText}
                onChange={(e) =>
                  patchForm({ extraContactsText: e.target.value })
                }
                onBlur={() => {
                  if (saveTimer.current) clearTimeout(saveTimer.current);
                  persist(
                    latestRef.current.form,
                    latestRef.current.description,
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Общее описание</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              content={description}
              onChange={onDescriptionChange}
              placeholder="Заметки по клиенту, договорённости, нюансы..."
              minHeight="280px"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>История звонков</CardTitle>
          <Button onClick={openNewCall}>Новая запись</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.callHistory.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет записей</p>
          ) : (
            client.callHistory.map((call) => (
              <div
                key={call.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {format(new Date(call.callDate), "d MMMM yyyy", {
                      locale: ru,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditCall(call)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm("Удалить запись?")) return;
                        startTransition(async () => {
                          await deleteCall(call.id);
                          toast.success("Удалено");
                          router.refresh();
                        });
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: call.content }}
                />
                {call.result ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Результат:</span> {call.result}
                  </p>
                ) : null}
                {call.nextStep ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Следующий шаг:</span>{" "}
                    {call.nextStep}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent
          title={editingCallId ? "Редактировать звонок" : "Новый звонок"}
          className="max-w-lg"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  const payload = {
                    clientId: client.id,
                    callDate: new Date(callForm.callDate),
                    content: `<p>${callForm.content}</p>`,
                    result: callForm.result || null,
                    nextStep: callForm.nextStep || null,
                  };
                  if (editingCallId) {
                    await updateCall(editingCallId, payload);
                  } else {
                    await createCall(payload);
                  }
                  setCallOpen(false);
                  toast.success("Сохранено");
                  router.refresh();
                } catch {
                  toast.error("Ошибка сохранения звонка");
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Дата звонка</Label>
              <Input
                type="date"
                value={callForm.callDate}
                onChange={(e) =>
                  setCallForm((p) => ({ ...p, callDate: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Заметка</Label>
              <Textarea
                value={callForm.content}
                onChange={(e) =>
                  setCallForm((p) => ({ ...p, content: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Результат</Label>
              <Input
                value={callForm.result}
                onChange={(e) =>
                  setCallForm((p) => ({ ...p, result: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Следующий шаг</Label>
              <Input
                value={callForm.nextStep}
                onChange={(e) =>
                  setCallForm((p) => ({ ...p, nextStep: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCallOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
