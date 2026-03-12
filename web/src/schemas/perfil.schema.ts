import { z } from "zod";

export const atualizarPerfilSchema = z
	.object({
		nome: z
			.string({ message: "Nome é obrigatório" })
			.min(1, { message: "Nome é obrigatório" })
			.max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
		email: z
			.string({ message: "Email é obrigatório" })
			.email({ message: "Email inválido" }),
		senhaAtual: z.string().optional().or(z.literal("")),
		senha: z
			.string()
			.min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
			.max(100, { message: "Senha deve ter no máximo 100 caracteres" })
			.optional()
			.or(z.literal("")),
		confirmarSenha: z.string().optional().or(z.literal("")),
	})
	.refine(
		(data) => {
			// Se uma senha foi preenchida, todas devem ser preenchidas (senha atual, nova senha e confirmar)
			const senhaPreenchida = data.senha && data.senha.trim() !== "";
			const confirmarSenhaPreenchida =
				data.confirmarSenha && data.confirmarSenha.trim() !== "";
			const senhaAtualPreenchida =
				data.senhaAtual && data.senhaAtual.trim() !== "";

			if (senhaPreenchida) {
				// Se nova senha foi preenchida, senha atual e confirmar senha são obrigatórias
				return senhaAtualPreenchida && confirmarSenhaPreenchida;
			}
			if (confirmarSenhaPreenchida || senhaAtualPreenchida) {
				// Se confirmar senha ou senha atual foram preenchidas, todas devem ser
				return (
					senhaPreenchida && senhaAtualPreenchida && confirmarSenhaPreenchida
				);
			}
			return true;
		},
		{
			message:
				"Para alterar a senha, preencha a senha atual, nova senha e confirmação",
			path: ["senhaAtual"],
		},
	)
	.refine(
		(data) => {
			// Se ambas as senhas foram preenchidas, elas devem ser iguais
			const senhaPreenchida = data.senha && data.senha.trim() !== "";
			const confirmarSenhaPreenchida =
				data.confirmarSenha && data.confirmarSenha.trim() !== "";

			if (senhaPreenchida && confirmarSenhaPreenchida) {
				return data.senha === data.confirmarSenha;
			}
			return true;
		},
		{
			message: "As senhas não coincidem",
			path: ["confirmarSenha"],
		},
	)
	.refine(
		(data) => {
			// Se a senha foi preenchida, deve ter no mínimo 6 caracteres
			const senhaPreenchida = data.senha && data.senha.trim() !== "";
			if (senhaPreenchida) {
				return (data.senha ?? "").length >= 6;
			}
			return true;
		},
		{
			message: "Senha deve ter no mínimo 6 caracteres",
			path: ["senha"],
		},
	)
	.refine(
		(data) => {
			// Se nova senha foi preenchida, senha atual é obrigatória
			const senhaPreenchida = data.senha && data.senha.trim() !== "";
			const senhaAtualPreenchida =
				data.senhaAtual && data.senhaAtual.trim() !== "";

			if (senhaPreenchida && !senhaAtualPreenchida) {
				return false;
			}
			return true;
		},
		{
			message: "Senha atual é obrigatória para alterar a senha",
			path: ["senhaAtual"],
		},
	);

export type AtualizarPerfilFormData = z.infer<typeof atualizarPerfilSchema>;
