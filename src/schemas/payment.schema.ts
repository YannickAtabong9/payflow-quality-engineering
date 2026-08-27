import { z } from "zod";

export const createPaymentSchema = z.object({
  amount: z
    .number()
    .int()
    .positive(),

  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .refine(
      (currency) => ["NGN", "USD", "GHS", "ZAR"].includes(currency),
      {
        message: "Unsupported currency",
      }
    ),

  customerEmail: z
    .string()
    .email(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
