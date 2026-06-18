"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmpresa } from "@/hooks/use-empresa";
import { useAuth } from "@/hooks/use-auth";
import { empresasService } from "@/services/empresas.service";
import {
	type CriarUsuarioFormData,
	type AtualizarUsuarioFormData,
	criarUsuarioSchema,
	atualizarUsuarioSchema,
} from "@/schemas/usuarios.schema";
import { usuariosService, type Usuario } from "@/services/usuarios.service";

type UsuarioFormProps = {
	modo?: "criar" | "editar";
	usuarioId?: string;
	valoresIniciais?: Partial<CriarUsuarioFormData | AtualizarUsuarioFormData>;
};

type UsuarioFormValues = {
	idempresa: string;
	nome: string;
	email: string;
	password: string;
	perfil: string;
	empresasIds: string[];
};

export function UsuarioForm(props: UsuarioFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { user } = useAuth();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const schema = isEdicao ? atualizarUsuarioSchema : criarUsuarioSchema;
	const form = useForm<UsuarioFormValues>({
		resolver: zodResolver(schema) as any,
		defaultValues: {
			idempresa: empresa?.id || "",
			nome: "",
			email: "",
			password: "",
			perfil: "usuario",
			empresasIds: [],
		},
	});

	// Buscar empresas disponíveis (apenas onde o usuário autenticado é proprietário)
	const { data: empresasData } = useQuery({
		queryKey: ["empresas-proprietario-usuario-form", user?.id],
		queryFn: () => empresasService.listar({ idproprietario: user?.id }),
		enabled: !!user?.id,
	});

	// Buscar dados do usuário se estiver editando
	const { data: usuarioData, isLoading: isLoadingUsuario } = useQuery<Usuario>({
		queryKey: ["usuario", props.usuarioId],
		queryFn: () => usuariosService.buscar(props.usuarioId!),
		enabled: isEdicao && !!props.usuarioId,
	});

	// Preencher formulário quando os dados chegarem
	useEffect(() => {
		if (isEdicao && usuarioData) {
			form.reset({
				nome: usuarioData.nome,
				perfil: Array.isArray(usuarioData.perfil)
					? usuarioData.perfil[0] || "usuario"
					: usuarioData.perfil || "usuario",
				empresasIds: usuarioData.empresasIds || [],
				idempresa: empresa?.id || "",
			});
		}
	}, [isEdicao, usuarioData, empresa, form]);

	const { mutate: criarUsuario, isPending: isCreating } = useMutation({
		mutationFn: usuariosService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["usuarios"] });
			toast.success("Usuário criado com sucesso!");
			router.push("/usuarios");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar usuário");
		},
	});

	const { mutate: atualizarUsuario, isPending: isUpdating } = useMutation({
		mutationFn: (data: AtualizarUsuarioFormData) =>
			usuariosService.atualizar(props.usuarioId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["usuarios"] });
			toast.success("Usuário atualizado com sucesso!");
			router.push("/usuarios");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar usuário");
		},
	});

	const onSubmit = (data: UsuarioFormValues) => {
		if (isEdicao) {
			const payload: AtualizarUsuarioFormData = {
				idempresa: data.idempresa,
				nome: data.nome,
				perfil: data.perfil,
				empresasIds: data.empresasIds,
			};
			atualizarUsuario(payload);
		} else {
			const payload: CriarUsuarioFormData = {
				idempresa: data.idempresa,
				nome: data.nome,
				email: data.email,
				password: data.password,
				perfil: data.perfil,
				empresasIds: data.empresasIds,
			};
			criarUsuario(payload);
		}
	};
	if (isEdicao && isLoadingUsuario) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	const empresas = empresasData?.data || [];

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<FieldGroup>
				<Field data-invalid={!!form.formState.errors.nome}>
					<FieldLabel htmlFor="nome">Nome *</FieldLabel>
					<Input
						id="nome"
						placeholder="Nome completo"
						aria-invalid={!!form.formState.errors.nome}
						aria-describedby={
							form.formState.errors.nome ? "nome-error" : undefined
						}
						{...form.register("nome")}
					/>
					<FieldError
						errors={
							form.formState.errors.nome ? [form.formState.errors.nome] : []
						}
					/>
				</Field>

				{!isEdicao && (
					<Field data-invalid={!!form.formState.errors.email}>
						<FieldLabel htmlFor="email">Email *</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="email@exemplo.com"
							aria-invalid={!!form.formState.errors.email}
							aria-describedby={
								form.formState.errors.email ? "email-error" : undefined
							}
							{...form.register("email")}
						/>
						<FieldError
							errors={
								form.formState.errors.email ? [form.formState.errors.email] : []
							}
						/>
					</Field>
				)}

				{!isEdicao && (
					<Field data-invalid={!!form.formState.errors.password}>
						<FieldLabel htmlFor="password">Senha *</FieldLabel>
						<Input
							id="password"
							type="password"
							placeholder="Mínimo 6 caracteres"
							aria-invalid={!!form.formState.errors.password}
							aria-describedby={
								form.formState.errors.password ? "password-error" : undefined
							}
							{...form.register("password")}
						/>
						<FieldError
							errors={
								form.formState.errors.password
									? [form.formState.errors.password]
									: []
							}
						/>
					</Field>
				)}

				<Field data-invalid={!!form.formState.errors.perfil}>
					<FieldLabel htmlFor="perfil">Perfil *</FieldLabel>
					<Select
						value={form.watch("perfil") || "usuario"}
						onValueChange={(value) => form.setValue("perfil", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecione o perfil" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="usuario">Usuário</SelectItem>
							<SelectItem value="admin">Administrador</SelectItem>
							<SelectItem value="proprietario">Proprietário</SelectItem>
							<SelectItem value="garcom">Garçom</SelectItem>
						</SelectContent>
					</Select>
					<FieldError
						errors={
							form.formState.errors.perfil ? [form.formState.errors.perfil] : []
						}
					/>
				</Field>

				<Field>
					<FieldLabel>Empresas que o usuário pode ver</FieldLabel>
					<div className="space-y-2">
						{empresas.map((emp) => (
							<div key={emp.id} className="flex items-center space-x-2">
								<Checkbox
									id={`empresa-${emp.id}`}
									checked={form.watch("empresasIds")?.includes(emp.id)}
									onCheckedChange={(checked) => {
										const currentIds = form.getValues("empresasIds") || [];
										if (checked) {
											form.setValue("empresasIds", [...currentIds, emp.id]);
										} else {
											form.setValue(
												"empresasIds",
												currentIds.filter((id) => id !== emp.id),
											);
										}
									}}
								/>
								<label
									htmlFor={`empresa-${emp.id}`}
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									{emp.nome}
								</label>
							</div>
						))}
					</div>
				</Field>
			</FieldGroup>

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/usuarios")}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={isCreating || isUpdating}>
					{isCreating || isUpdating
						? "Salvando..."
						: isEdicao
							? "Atualizar"
							: "Cadastrar"}
				</Button>
			</div>
		</form>
	);
}
