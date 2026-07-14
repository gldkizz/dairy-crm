import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(1, "Укажите название компании"),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  statusId: z.string().min(1),
  boardId: z.string().min(1),
  managerId: z.string().min(1),
  extraContacts: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      }),
    )
    .optional()
    .nullable(),
});

export const callHistorySchema = z.object({
  clientId: z.string().min(1),
  callDate: z.coerce.date(),
  content: z.string().min(1, "Заполните заметку"),
  result: z.string().optional().nullable(),
  nextStep: z.string().optional().nullable(),
});

export const statusSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1, "Укажите название статуса"),
  color: z.string().optional(),
});

export const factorySchema = z.object({
  name: z.string().min(1, "Укажите название завода"),
  region: z.string().optional().nullable(),
  lpr: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  hasContract: z.boolean().optional(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  description: z.string().optional().nullable(),
});

export const factoryProductSchema = z.object({
  factoryId: z.string().min(1),
  name: z.string().min(1, "Укажите название продукции"),
  fatContent: z.string().optional().nullable(),
  packaging: z.string().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  minBatch: z.string().optional().nullable(),
});
