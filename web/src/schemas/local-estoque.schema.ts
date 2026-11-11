import z from "zod";

export const criarLocalEstoqueSchema = z.object({
	idempresa: z.string().optional(),
	codigo: z.string().max(5, "O código deve ter no máximo 5 caracteres").optional().nullable(),
	descricao: z.string().max(50, "A descrição deve ter no máximo 50 caracteres").optional().nullable(),
	posse: z.string().max(1).optional().nullable(),
	tipo: z.union([z.number(), z.string()]).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional().nullable(),
	padrao: z.number().int().min(0).max(1).optional().nullable(),
});

export const atualizarLocalEstoqueSchema = criarLocalEstoqueSchema.partial();

export type CriarLocalEstoqueForm = z.infer<typeof criarLocalEstoqueSchema>;
export type AtualizarLocalEstoqueForm = z.infer<typeof atualizarLocalEstoqueSchema>;
