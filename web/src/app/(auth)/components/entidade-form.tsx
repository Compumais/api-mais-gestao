"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AddressAutocompleteInput } from "@/components/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { isGooglePlacesDisponivel } from "@/hooks/use-google-places";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import {
	type CriarEntidadeFormData,
	criarEntidadeSchema,
	criarValoresPadraoEntidadeForm,
	flagsEntidadeParaApi,
	formatarCepParaEnvio,
	type TipoEntidadePrincipal,
} from "@/schemas/entidades.schema";
import { entidadesService } from "@/services/entidades.service";
import { localidadesService } from "@/services/localidades.service";
import { planoContasService } from "@/services/plano-contas.service";

export type EntidadeFormConfig = {
	tipoPrincipal: TipoEntidadePrincipal;
	rotaListagem: string;
	queryKeyListagem: string;
	nomePlaceholder: string;
	mensagens: {
		criadoSucesso: string;
		atualizadoSucesso: string;
		erroCriar: string;
		erroAtualizar: string;
		erroIdEditar: string;
	};
};

type EntidadeFormProps = {
	config: EntidadeFormConfig;
	modo?: "criar" | "editar";
	entidadeId?: string;
	valoresIniciais?: Partial<CriarEntidadeFormData>;
};

export function EntidadeForm({
	config,
	modo = "criar",
	entidadeId,
	valoresIniciais,
}: EntidadeFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isEdicao = modo === "editar";
	const [cepConsultado, setCepConsultado] = useState(() =>
		Boolean(isEdicao && valoresIniciais?.cep),
	);
	const [buscandoCep, setBuscandoCep] = useState(false);
	const ultimoCepBuscado = useRef<string | null>(
		isEdicao && valoresIniciais?.cep
			? valoresIniciais.cep.replace(/\D/g, "")
			: null,
	);

	const valoresFormulario = useMemo(
		() =>
			criarValoresPadraoEntidadeForm({
				empresaId: empresa?.id,
				valoresIniciais,
				isEdicao,
				tipoPrincipal: config.tipoPrincipal,
			}),
		[empresa?.id, valoresIniciais, isEdicao, config.tipoPrincipal],
	);

	const form = useForm<
		z.input<typeof criarEntidadeSchema>,
		unknown,
		z.output<typeof criarEntidadeSchema>
	>({
		resolver: zodResolver(criarEntidadeSchema),
		defaultValues: criarValoresPadraoEntidadeForm({
			empresaId: empresa?.id,
			tipoPrincipal: config.tipoPrincipal,
		}),
	});

	const {
		register,
		handleSubmit,
		setValue,
		getValues,
		watch,
		control,
		reset,
		formState: { errors },
	} = form;

	const idestado = watch("idestado");
	const cep = watch("cep");
	const endereco = watch("endereco");

	useEffect(() => {
		if (!isEdicao || !valoresIniciais) return;
		reset(valoresFormulario);
	}, [isEdicao, valoresIniciais, valoresFormulario, reset]);

	const { data: estadosData, isLoading: carregandoEstados } = useQuery({
		queryKey: ["localidades", "estados"],
		queryFn: () => localidadesService.listarEstados(),
		staleTime: 24 * 60 * 60 * 1000,
	});

	useEffect(() => {
		if (!isEdicao || carregandoEstados || !estadosData?.data.length) {
			return;
		}

		const estadoSalvo = valoresFormulario.idestado;
		if (!estadoSalvo) return;

		const estadoExiste = estadosData.data.some(
			(estado) => estado.idestado === estadoSalvo,
		);

		if (estadoExiste && getValues("idestado") !== estadoSalvo) {
			setValue("idestado", estadoSalvo, { shouldValidate: true });
		}
	}, [
		isEdicao,
		carregandoEstados,
		estadosData,
		valoresFormulario.idestado,
		getValues,
		setValue,
	]);

	const { data: municipiosData, isLoading: carregandoMunicipios } = useQuery({
		queryKey: ["localidades", "municipios", idestado],
		queryFn: () => localidadesService.listarMunicipios(idestado as string),
		enabled: Boolean(idestado),
		staleTime: 24 * 60 * 60 * 1000,
	});

	useEffect(() => {
		if (!isEdicao || carregandoMunicipios || !municipiosData?.data.length) {
			return;
		}

		const cidadeSalva = valoresFormulario.idcidade;
		if (!cidadeSalva) return;

		const cidadeExiste = municipiosData.data.some(
			(municipio) => municipio.idcidade === cidadeSalva,
		);

		if (cidadeExiste && getValues("idcidade") !== cidadeSalva) {
			setValue("idcidade", cidadeSalva, { shouldValidate: true });
		}
	}, [
		isEdicao,
		carregandoMunicipios,
		municipiosData,
		valoresFormulario.idcidade,
		getValues,
		setValue,
	]);

	const { data: planoContasData, isLoading: carregandoPlanoContas } = useQuery({
		queryKey: ["plano-contas", config.queryKeyListagem, empresa?.id],
		queryFn: () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}
			return planoContasService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 1000,
				listarTudo: true,
				inativo: 0,
			});
		},
		enabled: Boolean(empresa?.id),
	});

	useEffect(() => {
		if (!isEdicao || !valoresIniciais?.cep) return;

		setCepConsultado(true);
		ultimoCepBuscado.current = valoresIniciais.cep.replace(/\D/g, "");
	}, [isEdicao, valoresIniciais?.cep]);

	const buscarCep = useCallback(
		async (valorCep: string) => {
			const cepLimpo = valorCep.replace(/\D/g, "");
			if (cepLimpo.length !== 8) return;
			if (ultimoCepBuscado.current === cepLimpo) return;

			try {
				setBuscandoCep(true);
				ultimoCepBuscado.current = cepLimpo;
				const enderecoEncontrado =
					await localidadesService.buscarEnderecoPorCep(cepLimpo);

				if (enderecoEncontrado.endereco) {
					setValue("endereco", enderecoEncontrado.endereco, {
						shouldValidate: true,
					});
				}
				if (enderecoEncontrado.bairro) {
					setValue("bairro", enderecoEncontrado.bairro, {
						shouldValidate: true,
					});
				}
				if (enderecoEncontrado.idestado) {
					setValue("idestado", enderecoEncontrado.idestado, {
						shouldValidate: true,
					});
				}
				if (enderecoEncontrado.idcidade) {
					setValue("idcidade", enderecoEncontrado.idcidade, {
						shouldValidate: true,
					});
				}
				if (!getValues("pais")) {
					setValue("pais", "Brasil");
				}

				setCepConsultado(true);
			} catch {
				toast.error("CEP não encontrado ou inválido");
				setCepConsultado(true);
				ultimoCepBuscado.current = null;
			} finally {
				setBuscandoCep(false);
			}
		},
		[getValues, setValue],
	);

	useEffect(() => {
		const cepLimpo = (cep ?? "").replace(/\D/g, "");
		if (cepLimpo.length === 8) {
			void buscarCep(cepLimpo);
		}
	}, [cep, buscarCep]);

	const invalidarListagens = () => {
		queryClient.invalidateQueries({ queryKey: ["entidades"] });
		queryClient.invalidateQueries({ queryKey: [config.queryKeyListagem] });
	};

	const { mutate: criarEntidade, isPending: isPendingCriar } = useMutation({
		mutationFn: entidadesService.criar,
		onSuccess: () => {
			invalidarListagens();
			toast.success(config.mensagens.criadoSucesso);
			router.push(config.rotaListagem);
		},
		onError: (error: Error) => {
			toast.error(error.message || config.mensagens.erroCriar);
		},
	});

	const { mutate: atualizarEntidade, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof entidadesService.atualizar>[1],
			) => {
				if (!isEdicao || !entidadeId) {
					throw new Error(config.mensagens.erroIdEditar);
				}
				return await entidadesService.atualizar(entidadeId, dados);
			},
			onSuccess: () => {
				invalidarListagens();
				toast.success(config.mensagens.atualizadoSucesso);
				router.push(config.rotaListagem);
			},
			onError: (error: Error) => {
				toast.error(error.message || config.mensagens.erroAtualizar);
			},
		});

	const montarPayloadEndereco = (data: CriarEntidadeFormData) => ({
		endereco: data.endereco || null,
		numeroendereco: data.numeroendereco || null,
		complemento: data.complemento || null,
		bairro: data.bairro || null,
		idcidade: data.idcidade || null,
		idestado: data.idestado || null,
		cep: formatarCepParaEnvio(data.cep),
		pais: data.pais || null,
	});

	const montarPayloadComum = (data: CriarEntidadeFormData) => ({
		nome: data.nome,
		cnpjcpf: data.cnpjcpf.replace(/\D/g, ""),
		razaosocial: data.razaosocial || null,
		tipopessoa: data.tipopessoa ?? null,
		inscricaoestadual: data.inscricaoestadual || null,
		rg: data.rg || null,
		email: data.email || null,
		telefone: data.telefone?.replace(/\D/g, "") || null,
		fax: data.fax?.replace(/\D/g, "") || null,
		nascimento: data.nascimento || null,
		idplanocontas: data.idplanocontas || null,
		...montarPayloadEndereco(data),
		...flagsEntidadeParaApi(data),
	});

	const onSubmit = (data: CriarEntidadeFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criarEntidade({
				idempresa: empresa.id,
				...montarPayloadComum(data),
			});
			return;
		}

		atualizarEntidade(montarPayloadComum(data));
	};

	const municipioOptions =
		municipiosData?.data.map((municipio) => ({
			value: municipio.idcidade,
			label: municipio.nome,
		})) ?? [];

	const planoContasOptions =
		planoContasData?.data.map((plano) => {
			const nivel = plano.codigo ? (plano.codigo.match(/\./g) || []).length : 0;
			const prefix = "\u00A0\u00A0".repeat(nivel);
			return {
				value: plano.id,
				label: `${prefix}${plano.codigo ? `${plano.codigo} - ` : ""}${plano.nome || plano.id}`,
			};
		}) ?? [];

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados Básicos</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome *</FieldLabel>
							<Input
								id="nome"
								placeholder={config.nomePlaceholder}
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
							<Controller
								control={control}
								name="cnpjcpf"
								render={({ field }) => (
									<Input
										id="cnpjcpf"
										placeholder="CNPJ ou CPF"
										aria-invalid={!!errors.cnpjcpf}
										aria-describedby={
											errors.cnpjcpf ? "cnpjcpf-error" : undefined
										}
										value={field.value}
										onChange={(event) =>
											field.onChange(maskCpfCnpj(event.target.value))
										}
									/>
								)}
							/>
							<FieldError errors={errors.cnpjcpf ? [errors.cnpjcpf] : []} />
						</Field>

						<Field data-invalid={!!errors.tipopessoa}>
							<FieldLabel htmlFor="tipopessoa">Tipo de Pessoa</FieldLabel>
							<Controller
								control={control}
								name="tipopessoa"
								render={({ field }) => (
									<Select
										key={`tipopessoa-${field.value ?? "vazio"}`}
										value={
											field.value !== null && field.value !== undefined
												? String(field.value)
												: undefined
										}
										onValueChange={(value) =>
											field.onChange(value ? Number(value) : null)
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
								)}
							/>
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
								disabled={form.watch("tipopessoa") !== 1}
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
							<Controller
								control={control}
								name="telefone"
								render={({ field }) => (
									<Input
										id="telefone"
										placeholder="(00) 00000-0000"
										aria-invalid={!!errors.telefone}
										aria-describedby={
											errors.telefone ? "telefone-error" : undefined
										}
										value={field.value ?? ""}
										onChange={(event) =>
											field.onChange(maskPhone(event.target.value))
										}
									/>
								)}
							/>
							<FieldError errors={errors.telefone ? [errors.telefone] : []} />
						</Field>

						<Field data-invalid={!!errors.fax}>
							<FieldLabel htmlFor="fax">Fax</FieldLabel>
							<Controller
								control={control}
								name="fax"
								render={({ field }) => (
									<Input
										id="fax"
										placeholder="Fax"
										aria-invalid={!!errors.fax}
										aria-describedby={errors.fax ? "fax-error" : undefined}
										value={field.value ?? ""}
										onChange={(event) =>
											field.onChange(maskPhone(event.target.value))
										}
									/>
								)}
							/>
							<FieldError errors={errors.fax ? [errors.fax] : []} />
						</Field>
					</div>
				</div>

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Endereço</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.cep}>
							<FieldLabel htmlFor="cep">CEP</FieldLabel>
							<Controller
								control={control}
								name="cep"
								render={({ field }) => (
									<Input
										id="cep"
										placeholder="00000-000"
										aria-invalid={!!errors.cep}
										aria-describedby={errors.cep ? "cep-error" : undefined}
										value={field.value ?? ""}
										onChange={(event) => {
											const valor = maskCep(event.target.value);
											field.onChange(valor);
											if (valor.replace(/\D/g, "").length < 8) {
												setCepConsultado(false);
												ultimoCepBuscado.current = null;
											}
										}}
										onBlur={() => {
											if (field.value) {
												void buscarCep(field.value);
											}
										}}
									/>
								)}
							/>
							{buscandoCep && (
								<p className="text-xs text-muted-foreground mt-1">
									Buscando CEP...
								</p>
							)}
							<FieldError errors={errors.cep ? [errors.cep] : []} />
						</Field>

						<Field data-invalid={!!errors.idestado}>
							<FieldLabel htmlFor="idestado">Estado</FieldLabel>
							<Controller
								control={control}
								name="idestado"
								render={({ field }) => (
									<Select
										key={`idestado-${field.value ?? "vazio"}-${estadosData?.data.length ?? 0}`}
										value={field.value ?? undefined}
										onValueChange={(value) => {
											field.onChange(value);
											if (value !== field.value) {
												setValue("idcidade", null, { shouldValidate: true });
											}
										}}
										disabled={carregandoEstados}
									>
										<SelectTrigger
											className="w-full"
											aria-invalid={!!errors.idestado}
											aria-describedby={
												errors.idestado ? "idestado-error" : undefined
											}
										>
											<SelectValue placeholder="Selecione o estado" />
										</SelectTrigger>
										<SelectContent>
											{estadosData?.data.map((estado) => (
												<SelectItem
													key={estado.idestado}
													value={estado.idestado}
												>
													{estado.nome} ({estado.idestado})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							<FieldError errors={errors.idestado ? [errors.idestado] : []} />
						</Field>

						<Field data-invalid={!!errors.idcidade}>
							<FieldLabel htmlFor="idcidade">Cidade</FieldLabel>
							<Controller
								control={control}
								name="idcidade"
								render={({ field }) => (
									<Combobox
										key={`idcidade-${idestado ?? "vazio"}-${municipiosData?.data.length ?? 0}-${field.value ?? "vazio"}`}
										options={municipioOptions}
										value={field.value ?? ""}
										onChange={field.onChange}
										placeholder={
											idestado
												? carregandoMunicipios
													? "Carregando cidades..."
													: "Selecione a cidade"
												: "Selecione o estado primeiro"
										}
										searchPlaceholder="Buscar cidade..."
										emptyMessage="Nenhuma cidade encontrada."
										disabled={!idestado || carregandoMunicipios}
									/>
								)}
							/>
							<FieldError errors={errors.idcidade ? [errors.idcidade] : []} />
						</Field>

						<Field data-invalid={!!errors.endereco}>
							<FieldLabel htmlFor="endereco">Endereço</FieldLabel>
							{isGooglePlacesDisponivel() ? (
								<AddressAutocompleteInput
									id="endereco"
									value={endereco ?? ""}
									onChange={(valor) =>
										setValue("endereco", valor, { shouldValidate: true })
									}
									onEnderecoSelecionado={(enderecoSelecionado) => {
										if (enderecoSelecionado.bairro) {
											setValue("bairro", enderecoSelecionado.bairro, {
												shouldValidate: true,
											});
										}
										if (enderecoSelecionado.idestado) {
											setValue("idestado", enderecoSelecionado.idestado, {
												shouldValidate: true,
											});
										}
										if (enderecoSelecionado.cep) {
											setValue("cep", maskCep(enderecoSelecionado.cep), {
												shouldValidate: true,
											});
										}
									}}
									idestado={idestado}
									cepConsultado={cepConsultado}
									aria-invalid={!!errors.endereco}
									aria-describedby={
										errors.endereco ? "endereco-error" : undefined
									}
								/>
							) : (
								<Input
									id="endereco"
									placeholder="Rua, Avenida, etc."
									aria-invalid={!!errors.endereco}
									aria-describedby={
										errors.endereco ? "endereco-error" : undefined
									}
									{...register("endereco")}
								/>
							)}
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

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Classificação</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{(
							[
								["cliente", "Cliente"],
								["fornecedor", "Fornecedor"],
								["transportador", "Transportador"],
								["representante", "Representante"],
							] as const
						).map(([campo, label]) => (
							<Field key={campo}>
								<div className="flex items-center gap-2">
									<Controller
										control={control}
										name={campo}
										render={({ field }) => (
											<Checkbox
												id={campo}
												checked={field.value === true}
												onCheckedChange={(checked) =>
													field.onChange(checked === true)
												}
											/>
										)}
									/>
									<FieldLabel htmlFor={campo} className="mb-0">
										{label}
									</FieldLabel>
								</div>
							</Field>
						))}
					</div>
				</div>

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
							<FieldLabel htmlFor="idplanocontas">Plano de Contas</FieldLabel>
							<Controller
								control={control}
								name="idplanocontas"
								render={({ field }) => (
									<Combobox
										options={planoContasOptions}
										value={field.value ?? ""}
										onChange={field.onChange}
										placeholder={
											carregandoPlanoContas
												? "Carregando planos..."
												: "Selecione o plano de contas"
										}
										searchPlaceholder="Buscar plano de contas..."
										emptyMessage="Nenhum plano de contas encontrado."
										disabled={carregandoPlanoContas}
									/>
								)}
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
