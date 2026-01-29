"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CriarEntidadeFormData,
	criarEntidadeSchema,
} from "@/schemas/entidades.schema";
import { entidadesService } from "@/services/entidades.service";

type ClientFormProps = {
	modo?: "criar" | "editar";
	entidadeId?: string;
	valoresIniciais?: Partial<CriarEntidadeFormData>;
};

export function ClientForm(props: ClientFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<CriarEntidadeFormData>({
		resolver: zodResolver(criarEntidadeSchema),
		defaultValues: {
			idempresa: empresa?.id || "",
			nome: "",
			cnpjcpf: "",
			razaosocial: null,
			tipopessoa: null,
			inscricaoestadual: null,
			rg: null,
			email: null,
			telefone: null,
			endereco: null,
			numeroendereco: null,
			complemento: null,
			bairro: null,
			idcidade: null,
			idestado: null,
			cep: null,
			fax: null,
			nascimento: null,
			idplanocontas: null,
			pais: null,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const tipopessoa = watch("tipopessoa");

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
			idempresa: props.valoresIniciais.idempresa ?? empresa?.id ?? "",
		});
	}, [isEdicao, props.valoresIniciais, empresa?.id, form]);

	const { mutate: criarEntidade, isPending: isPendingCriar } = useMutation({
		mutationFn: entidadesService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entidades"] });
			toast.success("Cliente cadastrado com sucesso!");
			router.push("/clientes");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar cliente");
		},
	});

	const { mutate: atualizarEntidade, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof entidadesService.atualizar>[1],
			) => {
				if (!isEdicao || !props.entidadeId) {
					throw new Error("ID do cliente é obrigatório para editar");
				}
				return await entidadesService.atualizar(props.entidadeId, dados);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["entidades"] });
				toast.success("Cliente atualizado com sucesso!");
				router.push("/clientes");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar cliente");
			},
		});

	const onSubmit = (data: CriarEntidadeFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			const payload = {
				idempresa: empresa.id,
				nome: data.nome,
				cnpjcpf: data.cnpjcpf,
				razaosocial: data.razaosocial || null,
				tipopessoa: data.tipopessoa || null,
				inscricaoestadual: data.inscricaoestadual || null,
				rg: data.rg || null,
				email: data.email || null,
				telefone: data.telefone || null,
				endereco: data.endereco || null,
				numeroendereco: data.numeroendereco || null,
				complemento: data.complemento || null,
				bairro: data.bairro || null,
				idcidade: data.idcidade || null,
				idestado: data.idestado || null,
				cep: data.cep || null,
				fax: data.fax || null,
				nascimento: data.nascimento || null,
				idplanocontas: data.idplanocontas || null,
				pais: data.pais || null,
			};

			criarEntidade(payload);
			return;
		}

		const payloadAtualizacao = {
			nome: data.nome,
			cnpjcpf: data.cnpjcpf,
			razaosocial: data.razaosocial || null,
			tipopessoa: data.tipopessoa || null,
			inscricaoestadual: data.inscricaoestadual || null,
			rg: data.rg || null,
			email: data.email || null,
			telefone: data.telefone || null,
			endereco: data.endereco || null,
			numeroendereco: data.numeroendereco || null,
			complemento: data.complemento || null,
			bairro: data.bairro || null,
			idcidade: data.idcidade || null,
			idestado: data.idestado || null,
			cep: data.cep || null,
			fax: data.fax || null,
			nascimento: data.nascimento || null,
			idplanocontas: data.idplanocontas || null,
			pais: data.pais || null,
		} satisfies Parameters<typeof entidadesService.atualizar>[1];

		atualizarEntidade(payloadAtualizacao);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				{/* Dados Básicos */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados Básicos</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome *</FieldLabel>
							<Input
								id="nome"
								placeholder="Nome do cliente"
								aria-invalid={!!errors.nome}
								aria-describedby={errors.nome ? "nome-error" : undefined}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
						</Field>

						<Field data-invalid={!!errors.razaosocial}>
							<FieldLabel htmlFor="razaosocial">Razão Social</FieldLabel>
							<Input
								id="razaosocial"
								placeholder="Razão social"
								aria-invalid={!!errors.razaosocial}
								aria-describedby={
									errors.razaosocial ? "razaosocial-error" : undefined
								}
								{...register("razaosocial")}
							/>
							<FieldError
								errors={errors.razaosocial ? [errors.razaosocial] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.cnpjcpf}>
							<FieldLabel htmlFor="cnpjcpf">CNPJ/CPF *</FieldLabel>
							<Input
								id="cnpjcpf"
								placeholder="CNPJ ou CPF"
								aria-invalid={!!errors.cnpjcpf}
								aria-describedby={errors.cnpjcpf ? "cnpjcpf-error" : undefined}
								{...register("cnpjcpf")}
							/>
							<FieldError errors={errors.cnpjcpf ? [errors.cnpjcpf] : []} />
						</Field>

						<Field data-invalid={!!errors.tipopessoa}>
							<FieldLabel htmlFor="tipopessoa">Tipo de Pessoa</FieldLabel>
							<Select
								value={tipopessoa?.toString() || ""}
								onValueChange={(value) =>
									setValue("tipopessoa", value ? Number(value) : null)
								}
							>
								<SelectTrigger
									className="w-full"
									aria-invalid={!!errors.tipopessoa}
									aria-describedby={
										errors.tipopessoa ? "tipopessoa-error" : undefined
									}
								>
									<SelectValue placeholder="Selecione o tipo" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">Física</SelectItem>
									<SelectItem value="1">Jurídica</SelectItem>
								</SelectContent>
							</Select>
							<FieldError
								errors={errors.tipopessoa ? [errors.tipopessoa] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.inscricaoestadual}>
							<FieldLabel htmlFor="inscricaoestadual">
								Inscrição Estadual
							</FieldLabel>
							<Input
								id="inscricaoestadual"
								placeholder="Inscrição estadual"
								aria-invalid={!!errors.inscricaoestadual}
								aria-describedby={
									errors.inscricaoestadual
										? "inscricaoestadual-error"
										: undefined
								}
								{...register("inscricaoestadual")}
							/>
							<FieldError
								errors={
									errors.inscricaoestadual ? [errors.inscricaoestadual] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.rg}>
							<FieldLabel htmlFor="rg">RG</FieldLabel>
							<Input
								id="rg"
								placeholder="RG"
								aria-invalid={!!errors.rg}
								aria-describedby={errors.rg ? "rg-error" : undefined}
								{...register("rg")}
							/>
							<FieldError errors={errors.rg ? [errors.rg] : []} />
						</Field>
					</div>
				</div>

				{/* Contato */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Contato</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.email}>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder="email@exemplo.com"
								aria-invalid={!!errors.email}
								aria-describedby={errors.email ? "email-error" : undefined}
								{...register("email")}
							/>
							<FieldError errors={errors.email ? [errors.email] : []} />
						</Field>

						<Field data-invalid={!!errors.telefone}>
							<FieldLabel htmlFor="telefone">Telefone</FieldLabel>
							<Input
								id="telefone"
								placeholder="(00) 00000-0000"
								aria-invalid={!!errors.telefone}
								aria-describedby={
									errors.telefone ? "telefone-error" : undefined
								}
								{...register("telefone")}
							/>
							<FieldError errors={errors.telefone ? [errors.telefone] : []} />
						</Field>

						<Field data-invalid={!!errors.fax}>
							<FieldLabel htmlFor="fax">Fax</FieldLabel>
							<Input
								id="fax"
								placeholder="Fax"
								aria-invalid={!!errors.fax}
								aria-describedby={errors.fax ? "fax-error" : undefined}
								{...register("fax")}
							/>
							<FieldError errors={errors.fax ? [errors.fax] : []} />
						</Field>
					</div>
				</div>

				{/* Endereço */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Endereço</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.endereco}>
							<FieldLabel htmlFor="endereco">Endereço</FieldLabel>
							<Input
								id="endereco"
								placeholder="Rua, Avenida, etc."
								aria-invalid={!!errors.endereco}
								aria-describedby={
									errors.endereco ? "endereco-error" : undefined
								}
								{...register("endereco")}
							/>
							<FieldError errors={errors.endereco ? [errors.endereco] : []} />
						</Field>

						<Field data-invalid={!!errors.numeroendereco}>
							<FieldLabel htmlFor="numeroendereco">Número</FieldLabel>
							<Input
								id="numeroendereco"
								placeholder="Número"
								aria-invalid={!!errors.numeroendereco}
								aria-describedby={
									errors.numeroendereco ? "numeroendereco-error" : undefined
								}
								{...register("numeroendereco")}
							/>
							<FieldError
								errors={errors.numeroendereco ? [errors.numeroendereco] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.complemento}>
							<FieldLabel htmlFor="complemento">Complemento</FieldLabel>
							<Input
								id="complemento"
								placeholder="Complemento"
								aria-invalid={!!errors.complemento}
								aria-describedby={
									errors.complemento ? "complemento-error" : undefined
								}
								{...register("complemento")}
							/>
							<FieldError
								errors={errors.complemento ? [errors.complemento] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.bairro}>
							<FieldLabel htmlFor="bairro">Bairro</FieldLabel>
							<Input
								id="bairro"
								placeholder="Bairro"
								aria-invalid={!!errors.bairro}
								aria-describedby={errors.bairro ? "bairro-error" : undefined}
								{...register("bairro")}
							/>
							<FieldError errors={errors.bairro ? [errors.bairro] : []} />
						</Field>

						<Field data-invalid={!!errors.cep}>
							<FieldLabel htmlFor="cep">CEP</FieldLabel>
							<Input
								id="cep"
								placeholder="CEP"
								aria-invalid={!!errors.cep}
								aria-describedby={errors.cep ? "cep-error" : undefined}
								{...register("cep")}
							/>
							<FieldError errors={errors.cep ? [errors.cep] : []} />
						</Field>

						<Field data-invalid={!!errors.idcidade}>
							<FieldLabel htmlFor="idcidade">Cidade</FieldLabel>
							<Input
								id="idcidade"
								placeholder="Cidade"
								aria-invalid={!!errors.idcidade}
								aria-describedby={
									errors.idcidade ? "idcidade-error" : undefined
								}
								{...register("idcidade")}
							/>
							<FieldError errors={errors.idcidade ? [errors.idcidade] : []} />
						</Field>

						<Field data-invalid={!!errors.idestado}>
							<FieldLabel htmlFor="idestado">Estado</FieldLabel>
							<Input
								id="idestado"
								placeholder="Estado"
								aria-invalid={!!errors.idestado}
								aria-describedby={
									errors.idestado ? "idestado-error" : undefined
								}
								{...register("idestado")}
							/>
							<FieldError errors={errors.idestado ? [errors.idestado] : []} />
						</Field>

						<Field data-invalid={!!errors.pais}>
							<FieldLabel htmlFor="pais">País</FieldLabel>
							<Input
								id="pais"
								placeholder="País"
								aria-invalid={!!errors.pais}
								aria-describedby={errors.pais ? "pais-error" : undefined}
								{...register("pais")}
							/>
							<FieldError errors={errors.pais ? [errors.pais] : []} />
						</Field>
					</div>
				</div>

				{/* Outros */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Outros</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.nascimento}>
							<FieldLabel htmlFor="nascimento">Data de Nascimento</FieldLabel>
							<Input
								id="nascimento"
								type="date"
								aria-invalid={!!errors.nascimento}
								aria-describedby={
									errors.nascimento ? "nascimento-error" : undefined
								}
								{...register("nascimento")}
							/>
							<FieldError
								errors={errors.nascimento ? [errors.nascimento] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.idplanocontas}>
							<FieldLabel htmlFor="idplanocontas">
								ID Plano de Contas
							</FieldLabel>
							<Input
								id="idplanocontas"
								placeholder="ID do plano de contas"
								aria-invalid={!!errors.idplanocontas}
								aria-describedby={
									errors.idplanocontas ? "idplanocontas-error" : undefined
								}
								{...register("idplanocontas")}
							/>
							<FieldError
								errors={errors.idplanocontas ? [errors.idplanocontas] : []}
							/>
						</Field>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPendingCriar || isPendingAtualizar}>
						{modo === "editar"
							? isPendingAtualizar
								? "Salvando..."
								: "Salvar"
							: isPendingCriar
								? "Cadastrando..."
								: "Cadastrar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
