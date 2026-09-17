import { z } from "zod";

export const vincularCodigoReduzidoSchema = z.object({
	idcontacontabil: z.string().min(1, "Selecione a conta contábil"),
	codigoreduzido: z
		.string()
		.trim()
		.min(1, "Informe o código reduzido")
		.max(20, "Código reduzido deve ter no máximo 20 caracteres"),
});

export type VincularCodigoReduzidoFormData = z.infer<
	typeof vincularCodigoReduzidoSchema
>;
