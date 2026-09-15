import z from "zod/v4";

export const periodoPresetSchema = z.enum([
	"hoje",
	"ontem",
	"7d",
	"30d",
	"mes_atual",
	"mes_anterior",
	"ano_atual",
	"personalizado",
]);

export const queryPeriodoSchema = z.object({
	idempresa: z.string().uuid().optional(),
	preset: periodoPresetSchema.optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	dias: z.coerce.number().min(1).max(366).optional(),
});

export function paramsPeriodoDeQuery(
	query: z.infer<typeof queryPeriodoSchema>,
) {
	return {
		...(query.idempresa && { idempresa: query.idempresa }),
		...(query.preset && { preset: query.preset }),
		...(query.dataInicio && { dataInicio: query.dataInicio }),
		...(query.dataFim && { dataFim: query.dataFim }),
		...(query.dias !== undefined && { dias: query.dias }),
	};
}
