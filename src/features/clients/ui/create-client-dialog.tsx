"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/features/clients/actions";
import { Button } from "@/shared/ui/button";
import { Drawer } from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";

const formSchema = z.object({
  companyName: z.string().min(1, "Обязательное поле"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  statusId: z.string().min(1),
  managerId: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

type CreateClientDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  defaultStatusId: string;
  statuses: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  currentUserId: string;
};

export function CreateClientDrawer({
  open,
  onOpenChange,
  boardId,
  defaultStatusId,
  statuses,
  managers,
  currentUserId,
}: CreateClientDrawerProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      city: "",
      address: "",
      statusId: defaultStatusId,
      managerId: currentUserId,
    },
  });

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Новый клиент"
      description="Карточка появится на доске сразу после создания"
      widthClassName="max-w-lg md:max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-client-form"
            disabled={pending}
          >
            {pending ? "Сохранение..." : "Создать"}
          </Button>
        </div>
      }
    >
      <form
        id="create-client-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            try {
              await createClient({
                ...values,
                boardId,
                email: values.email || null,
              });
              toast.success("Клиент создан");
              onOpenChange(false);
              form.reset();
            } catch {
              toast.error("Не удалось создать клиента");
            }
          });
        })}
      >
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="companyName">Компания</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPerson">Контактное лицо</Label>
          <Input id="contactPerson" {...form.register("contactPerson")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Город</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Адрес</Label>
          <Input id="address" {...form.register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="statusId">Статус</Label>
          <Select id="statusId" {...form.register("statusId")}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="managerId">Менеджер</Label>
          <Select id="managerId" {...form.register("managerId")}>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Drawer>
  );
}

/** @deprecated use CreateClientDrawer */
export const CreateClientDialog = CreateClientDrawer;
