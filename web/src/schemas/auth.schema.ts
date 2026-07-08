import { z } from "zod";

export const registerSchema = z
	.object({
		name: z
			.string({ message: "Nome é obrigatório" })
			.min(1, { message: "Nome é obrigatório" }),
		email: z
			.email({ message: "Email inválido" })
			.min(1, { message: "Email é obrigatório" }),
		password: z
			.string({ message: "Senha é obrigatória" })
			.min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
		confirmPassword: z
			.string({ message: "Confirmação de senha é obrigatória" })
			.min(1, { message: "Confirmação de senha é obrigatória" }),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas não coincidem",
		path: ["confirmPassword"],
	});

export type RegisterFormData = z.infer<typeof registerSchema>;
