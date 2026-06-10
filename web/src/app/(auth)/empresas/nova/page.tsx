"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { PageContainer } from "../../components/page-container";

const criarEmpresaSchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
	cnpj: z.string().min(14, "CNPJ inválido"),
	email: z.string().email("E-mail inválido"),
	telefone: z.string().min(10, "Telefone inválido"),
	endereco: z.string().min(10, "Endereço completo é obrigatório"),
});

type CriarEmpresaFormData = z.infer<typeof criarEmpresaSchema>;

export default function NovaEmpresaPage() {
	const { user, refetchUser } = useAuth();
	const { createCompany, selecionarEmpresa, listarEmpresas } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();

	// Buscar empresas do usuário (onde ele é proprietário) para verificar se é a primeira empresa
	const { data: empresasDoUsuario } = useQuery({
		queryKey: ["empresas-proprietario", user?.id],
		queryFn: () => listarEmpresas({ idproprietario: user?.id }),
		enabled: !!user?.id,
	});

	const form = useForm<CriarEmpresaFormData>({
		resolver: zodResolver(criarEmpresaSchema),
		defaultValues: {
			nome: "",
			cnpj: "",
			email: "",
			telefone: "",
			endereco: "",
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = form;

	const { mutate: criarEmpresa, isPending } = useMutation({
		mutationFn: async (data: CriarEmpresaFormData) => {
			if (!user?.id) throw new Error("Usuário não identificado");

			const payload = {
				...data,
				idproprietario: user.id,
			};

			return createCompany(payload);
		},
		onSuccess: async (empresa) => {
			toast.success("Empresa criada com sucesso!");

			// Selecionar a nova empresa PRIMEIRO (antes de invalidar queries)
			if (empresa) {
				selecionarEmpresa(empresa);
				// Aguardar um pouco para garantir que o localStorage seja atualizado
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			// Invalidar queries de empresas para forçar refetch
			await queryClient.invalidateQueries({
				queryKey: ["empresas-usuario", user?.id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["empresas-proprietario", user?.id],
			});

			// Aguardar um pouco mais para garantir que as queries sejam refetchadas
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Atualizar o perfil do usuário para refletir a nova role
			await refetchUser();

			// Verificar se é a primeira empresa do usuário
			const totalEmpresasAntes = empresasDoUsuario?.length ?? 0;
			const isPrimeiraEmpresa = totalEmpresasAntes === 0;

			// Se for a primeira empresa e não tiver plano, redirecionar para página de assinatura
			if (
				isPrimeiraEmpresa &&
				(user?.plano === null || user?.plano === undefined)
			) {
				router.push("/assinatura");
			} else if (isPrimeiraEmpresa) {
				// Se já tiver plano, ir para meus-planos
				router.push("/meus-planos");
			} else {
				// Caso contrário, redirecionar para dashboard
				router.push("/dashboard");
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar empresa");
		},
	});

	const onSubmit = (data: CriarEmpresaFormData) => {
		criarEmpresa(data);
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Nova empresa</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<form onSubmit={handleSubmit(onSubmit)}>
						<FieldGroup>
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field data-invalid={!!errors.nome}>
										<FieldLabel htmlFor="nome">Nome *</FieldLabel>
										<Input
											id="nome"
											placeholder="Nome da empresa"
											aria-invalid={!!errors.nome}
											aria-describedby={errors.nome ? "nome-error" : undefined}
											{...register("nome")}
										/>
										<FieldError errors={errors.nome ? [errors.nome] : []} />
									</Field>

									<Field data-invalid={!!errors.cnpj}>
										<FieldLabel htmlFor="cnpj">CNPJ *</FieldLabel>
										<Input
											id="cnpj"
											placeholder="CNPJ da empresa"
											aria-invalid={!!errors.cnpj}
											aria-describedby={errors.cnpj ? "cnpj-error" : undefined}
											{...register("cnpj")}
										/>
										<FieldError errors={errors.cnpj ? [errors.cnpj] : []} />
									</Field>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field data-invalid={!!errors.email}>
										<FieldLabel htmlFor="email">E-mail *</FieldLabel>
										<Input
											id="email"
											type="email"
											placeholder="E-mail da empresa"
											aria-invalid={!!errors.email}
											aria-describedby={
												errors.email ? "email-error" : undefined
											}
											{...register("email")}
										/>
										<FieldError errors={errors.email ? [errors.email] : []} />
									</Field>

									<Field data-invalid={!!errors.telefone}>
										<FieldLabel htmlFor="telefone">Telefone *</FieldLabel>
										<Input
											id="telefone"
											placeholder="Telefone da empresa"
											aria-invalid={!!errors.telefone}
											aria-describedby={
												errors.telefone ? "telefone-error" : undefined
											}
											{...register("telefone")}
										/>
										<FieldError
											errors={errors.telefone ? [errors.telefone] : []}
										/>
									</Field>
								</div>

								<Field data-invalid={!!errors.endereco} className="w-full">
									<FieldLabel htmlFor="endereco">
										Endereço Completo *
									</FieldLabel>
									<Input
										id="endereco"
										placeholder="Endereço completo da empresa"
										aria-invalid={!!errors.endereco}
										aria-describedby={
											errors.endereco ? "endereco-error" : undefined
										}
										{...register("endereco")}
									/>
									<FieldError
										errors={errors.endereco ? [errors.endereco] : []}
									/>
								</Field>
							</div>

							<div className="flex justify-end gap-2 mt-6">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.back()}
									disabled={isPending}
								>
									Cancelar
								</Button>
								<Button type="submit" disabled={isPending}>
									{isPending ? "Criando..." : "Criar empresa"}
								</Button>
							</div>
						</FieldGroup>
					</form>
				</div>
			</div>
		</PageContainer>
	);
}
