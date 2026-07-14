"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { createFactory } from "@/features/factories/actions";
import { FactoryDrawer } from "@/features/factories/ui/factory-drawer";
import { Button } from "@/shared/ui/button";
import { Drawer } from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";

export type FactoryRow = {
  id: string;
  name: string;
  region: string | null;
  lpr: string | null;
  phone: string | null;
  email: string | null;
  hasContract: boolean;
  updatedAt: string | Date;
  products: { id: string; name: string }[];
};

const columnHelper = createColumnHelper<FactoryRow>();

type FactoriesTableProps = {
  factories: FactoryRow[];
  regions: string[];
  productNames: string[];
};

export function FactoriesTable({
  factories,
  regions,
  productNames,
}: FactoriesTableProps) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [product, setProduct] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(
    null,
  );
  const [factoryDrawerOpen, setFactoryDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    region: "",
    lpr: "",
    phone: "",
    email: "",
    hasContract: false,
  });

  const openFactory = (id: string) => {
    setSelectedFactoryId(id);
    setFactoryDrawerOpen(true);
  };

  const filtered = useMemo(() => {
    return factories.filter((f) => {
      if (region && f.region !== region) return false;
      if (product) {
        const has = f.products.some((p) =>
          p.name.toLowerCase().includes(product.toLowerCase()),
        );
        if (!has) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const inName = f.name.toLowerCase().includes(q);
        const inLpr = (f.lpr ?? "").toLowerCase().includes(q);
        const inProducts = f.products.some((p) =>
          p.name.toLowerCase().includes(q),
        );
        if (!inName && !inLpr && !inProducts) return false;
      }
      return true;
    });
  }, [factories, region, product, search]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("hasContract", {
        header: () => <div className="text-center">Договор</div>,
        cell: (info) => {
          const has = info.getValue();
          return (
            <div
              className="flex items-center justify-center"
              title={has ? "Договор есть" : "Договора нет"}
            >
              <span
                className={
                  has
                    ? "h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                    : "h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
                }
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("name", {
        header: "Название",
        cell: (info) => (
          <span className="font-medium text-slate-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("region", {
        header: "Регион",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("products", {
        header: "Продукция",
        cell: (info) => {
          const items = info.getValue();
          if (items.length === 0) {
            return <span className="text-slate-400">—</span>;
          }
          return (
            <div className="flex max-w-md flex-wrap gap-1.5">
              {items.map((p) => (
                <span
                  key={p.id}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  {p.name}
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor("lpr", {
        header: "ЛПР",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("phone", {
        header: "Телефон",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue() || "—",
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Закупка · Заводы
          </h2>
          <p className="text-sm text-slate-500">
            Поставщики и актуальные цены на продукцию
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Завод
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Поиск по заводу, ЛПР или продукции"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-[180px]"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">Все регионы</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          className="w-[200px]"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        >
          <option value="">Вся продукция</option>
          {productNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={
                      header.column.id === "hasContract"
                        ? "px-4 py-3 text-center font-medium"
                        : "px-4 py-3 font-medium"
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Ничего не найдено
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60"
                  onClick={() => openFactory(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={
                        cell.column.id === "hasContract"
                          ? "px-4 py-3 text-center text-slate-700"
                          : "px-4 py-3 text-slate-700"
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FactoryDrawer
        factoryId={selectedFactoryId}
        open={factoryDrawerOpen}
        onOpenChange={(open) => {
          setFactoryDrawerOpen(open);
          if (!open) setSelectedFactoryId(null);
        }}
      />

      <Drawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новый завод"
        description="Добавьте поставщика в базу закупок"
        widthClassName="max-w-lg md:max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" form="create-factory-form" disabled={pending}>
              {pending ? "Сохранение..." : "Создать"}
            </Button>
          </div>
        }
      >
        <form
          id="create-factory-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await createFactory({
                  name: form.name,
                  region: form.region || null,
                  lpr: form.lpr || null,
                  phone: form.phone || null,
                  email: form.email || null,
                  hasContract: form.hasContract,
                });
                toast.success("Завод создан");
                setCreateOpen(false);
                setForm({
                  name: "",
                  region: "",
                  lpr: "",
                  phone: "",
                  email: "",
                  hasContract: false,
                });
              } catch {
                toast.error("Не удалось создать завод");
              }
            });
          }}
        >
          {(
            [
              ["name", "Название", true],
              ["region", "Регион", false],
              ["lpr", "ЛПР", false],
              ["phone", "Телефон", false],
              ["email", "Email", false],
            ] as const
          ).map(([key, label, full]) => (
            <div
              key={key}
              className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
            >
              <Label>{label}</Label>
              <Input
                required={key === "name"}
                type={key === "email" ? "email" : "text"}
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
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
                onClick={() => setForm((p) => ({ ...p, hasContract: false }))}
                className={
                  !form.hasContract
                    ? "rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm"
                    : "rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                }
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, hasContract: true }))}
                className={
                  form.hasContract
                    ? "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                    : "rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                }
              >
                Есть
              </button>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
