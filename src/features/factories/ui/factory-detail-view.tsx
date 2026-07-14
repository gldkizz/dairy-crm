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
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  createFactoryProduct,
  deleteFactory,
  deleteFactoryProduct,
  updateFactory,
  updateFactoryProduct,
} from "@/features/factories/actions";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

type Product = {
  id: string;
  name: string;
  fatContent: string | null;
  packaging: string | null;
  price: string | number | null;
  minBatch: string | null;
  priceUpdatedAt: string | Date | null;
};

type FormState = {
  name: string;
  region: string;
  lpr: string;
  phone: string;
  email: string;
  hasContract: boolean;
};

type FactoryDetailProps = {
  factory: {
    id: string;
    name: string;
    region: string | null;
    lpr: string | null;
    phone: string | null;
    email: string | null;
    hasContract: boolean;
    products: Product[];
  };
  variant?: "page" | "drawer";
  onClose?: () => void;
};

function buildForm(factory: FactoryDetailProps["factory"]): FormState {
  return {
    name: factory.name,
    region: factory.region ?? "",
    lpr: factory.lpr ?? "",
    phone: factory.phone ?? "",
    email: factory.email ?? "",
    hasContract: factory.hasContract,
  };
}

export function FactoryDetailView({
  factory,
  variant = "page",
  onClose,
}: FactoryDetailProps) {
  const router = useRouter();
  const embedded = variant === "drawer";
  const [pending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [form, setForm] = useState<FormState>(() => buildForm(factory));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestForm = useRef(form);
  const hydratedRef = useRef(false);

  latestForm.current = form;

  useEffect(() => {
    setForm(buildForm(factory));
    hydratedRef.current = false;
    const t = setTimeout(() => {
      hydratedRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [factory]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback(
    (next: FormState) => {
      if (!next.name.trim()) return;

      setSaveState("saving");
      startTransition(async () => {
        try {
          await updateFactory(factory.id, {
            name: next.name,
            region: next.region || null,
            lpr: next.lpr || null,
            phone: next.phone || null,
            email: next.email || null,
            hasContract: next.hasContract,
          });
          setSaveState("saved");
          router.refresh();
        } catch {
          setSaveState("idle");
          toast.error("Ошибка сохранения");
        }
      });
    },
    [factory.id, router],
  );

  const scheduleSave = useCallback(
    (next: FormState) => {
      if (!hydratedRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 550);
    },
    [persist],
  );

  const patchForm = (patch: Partial<FormState>, immediate = false) => {
    const next = { ...latestForm.current, ...patch };
    latestForm.current = next;
    setForm(next);
    if (immediate) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persist(next);
    } else {
      scheduleSave(next);
    }
  };

  const flushSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    persist(latestForm.current);
  };

  const toggleContract = () => {
    patchForm({ hasContract: !latestForm.current.hasContract }, true);
  };

  const [productOpen, setProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    volume: "",
  });

  const openProductEditor = (product?: Product) => {
    if (product) {
      setEditingProductId(product.id);
      setProductForm({
        name: product.name,
        price: product.price != null ? String(product.price) : "",
        volume: product.minBatch ?? "",
      });
    } else {
      setEditingProductId(null);
      setProductForm({ name: "", price: "", volume: "" });
    }
    setConfirmDeleteId(null);
    setProductOpen(true);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6",
        embedded ? "max-w-none" : "mx-auto max-w-6xl",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!embedded ? (
            <>
              <p className="text-sm text-slate-500">Закупка · Карточка завода</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {factory.name}
              </h1>
            </>
          ) : (
            <p className="text-sm text-slate-500">Карточка завода</p>
          )}
          <p className="mt-1 text-sm text-slate-400">
            {saveState === "saving"
              ? "Сохранение…"
              : saveState === "saved"
                ? "Сохранено"
                : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!embedded ? (
            <Button variant="outline" onClick={() => router.push("/purchase")}>
              Назад
            </Button>
          ) : null}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Удалить завод?")) return;
              startTransition(async () => {
                await deleteFactory(factory.id);
                if (embedded) {
                  onClose?.();
                  router.refresh();
                } else {
                  router.push("/purchase");
                }
              });
            }}
          >
            Удалить
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Продукция</CardTitle>
          <Button onClick={() => openProductEditor()}>Добавить</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Цена</th>
                  <th className="px-3 py-2 font-medium">Объем</th>
                  <th className="px-3 py-2 font-medium">Дата</th>
                  <th className="w-28 px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {factory.products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Нет продукции
                    </td>
                  </tr>
                ) : (
                  factory.products.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80"
                      onClick={() => openProductEditor(p)}
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {p.name}
                      </td>
                      <td className="px-3 py-2.5">
                        {p.price != null ? `${p.price} ₽` : "—"}
                      </td>
                      <td className="px-3 py-2.5">{p.minBatch || "—"}</td>
                      <td className="px-3 py-2.5">
                        {p.priceUpdatedAt
                          ? format(new Date(p.priceUpdatedAt), "dd.MM.yyyy")
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end">
                          {confirmDeleteId === p.id ? (
                            <button
                              type="button"
                              className="min-h-10 min-w-[88px] rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                              onClick={() => {
                                startTransition(async () => {
                                  await deleteFactoryProduct(p.id);
                                  setConfirmDeleteId(null);
                                  toast.success("Удалено");
                                  router.refresh();
                                });
                              }}
                            >
                              Удалить
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label="Удалить продукцию"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
                              onClick={() => setConfirmDeleteId(p.id)}
                            >
                              <X className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Общая информация</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Название"],
              ["region", "Регион"],
              ["lpr", "ЛПР"],
              ["phone", "Телефон"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className={cn("space-y-1.5", key === "name" && "sm:col-span-2")}
            >
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChange={(e) => patchForm({ [key]: e.target.value })}
                onBlur={flushSave}
              />
            </div>
          ))}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Договор</Label>
            <div
              role="group"
              aria-label="Статус договора"
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              <button
                type="button"
                onClick={() => {
                  if (form.hasContract) toggleContract();
                }}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition",
                  !form.hasContract
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!form.hasContract) toggleContract();
                }}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition",
                  form.hasContract
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Есть
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent
          title={editingProductId ? "Редактировать продукцию" : "Новая продукция"}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  const payload = {
                    factoryId: factory.id,
                    name: productForm.name,
                    price: productForm.price
                      ? Number(productForm.price)
                      : null,
                    minBatch: productForm.volume || null,
                  };
                  if (editingProductId) {
                    await updateFactoryProduct(editingProductId, payload);
                  } else {
                    await createFactoryProduct(payload);
                  }
                  setProductOpen(false);
                  toast.success("Сохранено");
                  router.refresh();
                } catch {
                  toast.error("Ошибка сохранения");
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input
                required
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Цена</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, price: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Объем</Label>
              <Input
                value={productForm.volume}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, volume: e.target.value }))
                }
                placeholder="например, 200 кг"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProductOpen(false)}
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
