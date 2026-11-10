import z from "zod";

export const criarLocalEstoqueSchema = z.object({
	idempresa: z.string().min(1, "A empresa é obrigatória"),
	codigo: z.string().max(15).optional().nullable(),
	descricao: z.string().max(30).optional().nullable(),
	posse: z.string().max(1).optional().nullable(),
	tipo: z.union([z.number(), z.string()]).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional().nullable(),
	padrao: z.number().int().min(0).max(1).optional().nullable(),
});

export const atualizarLocalEstoqueSchema = criarLocalEstoqueSchema.partial();

export type CriarLocalEstoqueForm = z.infer<typeof criarLocalEstoqueSchema>;
export type AtualizarLocalEstoqueForm = z.infer<typeof atualizarLocalEstoqueSchema>;
