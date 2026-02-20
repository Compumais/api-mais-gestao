import { z } from "zod";

export const criarContaContabilSchema = z.object({
    idempresa: z.string().min(1, "ID da empresa é obrigatório"),
    descricao: z
        .string()
        .min(1, "Descrição é obrigatória")
        .min(3, "Descrição deve ter no mínimo 3 caracteres")
        .max(100, "Descrição deve ter no máximo 100 caracteres"),
    natureza: z.enum(["D", "C"]).optional().nullable(),
    tipocontacontabil: z.enum(["S", "A"]).optional().nullable(),
    codigoreduzido: z.string().max(20).optional().nullable(),
    codigocontareferencial: z.string().max(60).optional().nullable(),
    codigoextenso: z.string().max(85).optional().nullable(),
    contaglutinadora: z.number().int().optional().nullable(),
    nivelconta: z.number().int().optional().nullable(),
    idcontapai: z.string().optional().nullable(),
    inativo: z.number().int().min(0).max(1).optional(),
});

export type CriarContaContabilFormData = z.infer<
    typeof criarContaContabilSchema
>;
