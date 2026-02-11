"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	type AtualizarPerfilFormData,
	atualizarPerfilSchema,
} from "@/schemas/perfil.schema";
import { authService } from "@/services/auth.service";

export function MinhaContaForm() {
	const queryClient = useQueryClient();

	// Buscar dados do perfil
	const { data: perfil, isLoading } = useQuery({
		queryKey: ["perfil"],
		queryFn: () => authService.getProfile(),
	});

	const form = useForm<AtualizarPerfilFormData>({
		resolver: zodResolver(atualizarPerfilSchema),
		defaultValues: {
			nome: "",
			email: "",
			senhaAtual: "",
			senha: "",
			confirmarSenha: "",
		},
	});

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;

	// Preencher formulário quando os dados chegarem
	React.useEffect(() => {
		if (perfil) {
			reset({
				nome: perfil.nome,
				email: perfil.email,
				senhaAtual: "",
				senha: "",
				confirmarSenha: "",
			});
		}
	}, [perfil, reset]);

	const { mutate: atualizarPerfil, isPending } = useMutation({
		mutationFn: async (data: AtualizarPerfilFormData) => {
			const updateData: {
				nome: string;
				email: string;
				senhaAtual?: string;
				senha?: string;
			} = {
				nome: data.nome,
				email: data.email,
			};

			// Incluir senhas se foram preenchidas
			if (data.senha && data.senha.trim() !== "") {
				updateData.senha = data.senha;
				updateData.senhaAtual = data.senhaAtual;
			}

			return await authService.updateProfile(updateData);
		},
		onSuccess: (data) => {
			// Atualizar o cache diretamente com os novos dados
			queryClient.setQueryData(["perfil"], data);
			// Invalidar a query para garantir que todos os componentes que usam o perfil sejam atualizados
			// Isso garante que o sidebar seja atualizado imediatamente
			queryClient.invalidateQueries({ queryKey: ["perfil"] });
			toast.success("Perfil atualizado com sucesso!");
			// Limpar campos de senha após sucesso
			reset({
				...form.getValues(),
				senhaAtual: "",
				senha: "",
				confirmarSenha: "",
			});
		},
		onError: (error: Error) => {
			// Extrair mensagem de erro mais específica
			let errorMessage = "Erro ao atualizar perfil";

			if (error.message) {
				// Se a mensagem contém múltiplos erros separados por ";"
				if (error.message.includes(";")) {
					const erros = error.message.split(";").map((e) => e.trim());
					errorMessage = `Erros encontrados: ${erros.join(", ")}`;
				} else {
					errorMessage = error.message;
				}

				// Mensagens mais amigáveis para erros comuns
				if (
					error.message.includes("401") ||
					error.message.includes("Não autorizado")
				) {
					errorMessage = "Não autorizado. Verifique se você está logado.";
				} else if (
					error.message.includes("404") ||
					error.message.includes("não encontrado")
				) {
					errorMessage =
						"Rota não encontrada. O serviço pode estar temporariamente indisponível.";
				} else if (
					error.message.includes("500") ||
					error.message.includes("servidor")
				) {
					errorMessage = "Erro no servidor. Tente novamente mais tarde.";
				} else if (
					error.message.includes("senha") ||
					error.message.includes("password")
				) {
					if (
						error.message.includes("current") ||
						error.message.includes("atual") ||
						error.message.includes("incorrect") ||
						error.message.includes("inválida")
					) {
						errorMessage =
							"Senha atual incorreta. Verifique e tente novamente.";
					} else {
						errorMessage =
							"Erro ao atualizar senha. Verifique se a senha atende aos requisitos.";
					}
				} else if (
					error.message.includes("email") ||
					error.message.includes("Email") ||
					error.message.includes("cannot be updated")
				) {
					errorMessage =
						"O email não pode ser alterado diretamente. Entre em contato com o suporte se precisar alterar seu email.";
				}
			}

			toast.error(errorMessage);
		},
	});

	const onSubmit = (data: AtualizarPerfilFormData) => {
		atualizarPerfil(data);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-6">
					<div className="text-center text-muted-foreground">Carregando...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Minha Conta</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome</FieldLabel>
							<Input
								id="nome"
								placeholder="Seu nome"
								aria-invalid={!!errors.nome}
								aria-describedby={errors.nome ? "nome-error" : undefined}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
						</Field>

						<Field data-invalid={!!errors.email}>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								disabled
								placeholder="seu@email.com"
								aria-invalid={!!errors.email}
								aria-describedby={errors.email ? "email-error" : undefined}
								{...register("email")}
							/>
							<FieldError errors={errors.email ? [errors.email] : []} />
						</Field>

						<Field data-invalid={!!errors.senhaAtual}>
							<FieldLabel htmlFor="senhaAtual">
								Senha Atual{" "}
								<span className="text-muted-foreground">
									(obrigatória para alterar senha)
								</span>
							</FieldLabel>
							<Input
								id="senhaAtual"
								type="password"
								placeholder="Digite sua senha atual"
								aria-invalid={!!errors.senhaAtual}
								aria-describedby={
									errors.senhaAtual ? "senhaAtual-error" : undefined
								}
								{...register("senhaAtual")}
							/>
							<FieldError
								errors={errors.senhaAtual ? [errors.senhaAtual] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.senha}>
							<FieldLabel htmlFor="senha">
								Nova Senha{" "}
								<span className="text-muted-foreground">(opcional)</span>
							</FieldLabel>
							<Input
								id="senha"
								type="password"
								placeholder="Mínimo 6 caracteres (deixe em branco para não alterar)"
								aria-invalid={!!errors.senha}
								aria-describedby={errors.senha ? "senha-error" : undefined}
								{...register("senha")}
							/>
							<FieldError errors={errors.senha ? [errors.senha] : []} />
						</Field>

						<Field data-invalid={!!errors.confirmarSenha}>
							<FieldLabel htmlFor="confirmarSenha">
								Confirmar Nova Senha{" "}
								<span className="text-muted-foreground">(opcional)</span>
							</FieldLabel>
							<Input
								id="confirmarSenha"
								type="password"
								placeholder="Confirme a nova senha"
								aria-invalid={!!errors.confirmarSenha}
								aria-describedby={
									errors.confirmarSenha ? "confirmarSenha-error" : undefined
								}
								{...register("confirmarSenha")}
							/>
							<FieldError
								errors={errors.confirmarSenha ? [errors.confirmarSenha] : []}
							/>
						</Field>

						<div className="flex justify-end">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Salvando..." : "Salvar alterações"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
