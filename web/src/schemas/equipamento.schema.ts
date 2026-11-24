import { z } from "zod";

export const equipamentoFormSchema = z.object({
	codigo: z.string().trim().min(1, "Informe o código").max(40),
	descricao: z.string().trim().min(1, "Informe a descrição").max(120),
	numeroserie: z.string().max(60).optional(),
	situacao: z.enum(["disponivel", "inativo", "alocado"]),
	precodiaria: z.number().min(0, "Preço inválido"),
	precosemanal: z.number().min(0, "Preço inválido"),
	precoquinzenal: z.number().min(0, "Preço inválido"),
	precomensal: z.number().min(0, "Preço inválido"),
	observacao: z.string().optional(),
});

export type EquipamentoFormData = z.infer<typeof equipamentoFormSchema>;
