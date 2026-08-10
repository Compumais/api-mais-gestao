"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/use-auth";
import { useConsultaCnpjEntidade } from "@/hooks/use-consulta-cnpj-entidade";
import { useEmpresa } from "@/hooks/use-empresa";
import { EMPRESAS_USUARIO_QUERY_KEY } from "@/hooks/use-empresas-usuario";
import { useEntitlements } from "@/hooks/use-plano";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import {
	type CriarEmpresaFormData,
	criarEmpresaSchema,
	valoresPadraoCriarEmpresa,
} from "@/schemas/empresa.schema";
import { localidadesService } from "@/services/localidades.service";
import { preencherEmpresaConsultaCnpj } from "@/util/preencher-empresa-consulta-cnpj";
import { PageContainer } from "../../components/page-container";

export default function NovaEmpresaPage() {
	const { user, refetchUser } = useAuth();
	const { createCompany, selecionarEmpresa, listarEmpresas } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { limites } = useEntitlements();
	const { consultar: consultarCnpj, isPending: buscandoCnpj } =
		useConsultaCnpjEntidade();

	const [buscandoCep, setBuscandoCep] = useState(false);
	const ultimoCnpjBuscado = useRef<string | null>(null);
	const ultimoCepBuscado = useRef<string | null>(null);

	const { data: empresasDoUsuario } = useQuery({
		queryKey: ["empresas-proprietario", user?.id],
		queryFn: () => listarEmpresas({ idproprietario: user?.id }),
		enabled: !!user?.id,
	});

	const form = useForm<CriarEmpresaFormData>({
		resolver: zodResolver(criarEmpresaSchema),
		defaultValues: valoresPadraoCriarEmpresa,
	});

	const {
		control,
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = form;

	const cnpj = watch("cnpj");
	const cep = watch("cep");
	const idestado = watch("idestado");

	const { data: estadosData, isLoading: carregandoEstados } = useQuery({
		queryKey: ["localidades", "estados"],
		queryFn: () => localidadesService.listarEstados(),
	});

	const { data: municipiosData, isLoading: carregandoMunicipios } = useQuery({
		queryKey: ["localidades", "municipios", idestado],
		queryFn: () => localidadesService.listarMunicipios(idestado),
		enabled: !!idestado,
	});

	const municipioOptions = useMemo(
		() =>
			(municipiosData?.data ?? []).map((municipio) => ({
				value: municipio.idcidade,
				label: municipio.nome,
			})),
		[municipiosData?.data],
	);

	const buscarCnpj = useCallback(
		async (valorCnpj: string, forcar = false) => {
			const cnpjLimpo = valorCnpj.replace(/\D/g, "");
			if (cnpjLimpo.length !== 14) return;
			if (!forcar && ultimoCnpjBuscado.current === cnpjLimpo) return;

			try {
				ultimoCnpjBuscado.current = cnpjLimpo;
				const resposta = await consultarCnpj({ cnpj: cnpjLimpo });

				preencherEmpresaConsultaCnpj({
					entidade: resposta.entidade,
					setValue,
					onCepPreenchido: (cepLimpo) => {
						ultimoCepBuscado.current = cepLimpo;
					},
				});

				toast.success("Dados do CNPJ carregados");

				if (
					resposta.extras.situacaoCadastral.trim().toLowerCase() !== "ativa"
				) {
					toast.warning(
						`Situação cadastral: ${resposta.extras.situacaoCadastral}`,
					);
				}
			} catch (error) {
				ultimoCnpjBuscado.current = null;
				toast.error(
					error instanceof Error
						? error.message
						: "Não foi possível consultar CNPJ",
				);
			}
		},
		[consultarCnpj, setValue],
	);

	useEffect(() => {
		const cnpjLimpo = (cnpj ?? "").replace(/\D/g, "");
		if (cnpjLimpo.length < 14) {
			if (cnpjLimpo.length === 0) {
				ultimoCnpjBuscado.current = null;
			}
			return;
		}

		void buscarCnpj(cnpjLimpo);
	}, [cnpj, buscarCnpj]);

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
			} catch {
				toast.error("CEP não encontrado ou inválido");
				ultimoCepBuscado.current = null;
			} finally {
				setBuscandoCep(false);
			}
		},
		[setValue],
	);

	useEffect(() => {
		const cepLimpo = (cep ?? "").replace(/\D/g, "");
		if (cepLimpo.length === 8) {
			void buscarCep(cepLimpo);
		}
	}, [cep, buscarCep]);

	const { mutate: criarEmpresa, isPending } = useMutation({
		mutationFn: async (data: CriarEmpresaFormData) => {
			if (!user?.id) throw new Error("Usuário não identificado");

			return createCompany({
				...data,
				complemento: data.complemento ?? "",
				idproprietario: user.id,
			});
		},
		onSuccess: async (empresa) => {
			toast.success("Empresa criada com sucesso!");

			if (empresa) {
				selecionarEmpresa(empresa);
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			await queryClient.invalidateQueries({
				queryKey: [EMPRESAS_USUARIO_QUERY_KEY, user?.id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["empresas-proprietario", user?.id],
			});

			await new Promise((resolve) => setTimeout(resolve, 100));
			await refetchUser();
			router.push("/dashboard");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar empresa");
		},
	});

	const onSubmit = (data: CriarEmpresaFormData) => {
		if (
			limites.maxempresas > 0 &&
			(empresasDoUsuario?.length ?? 0) >= limites.maxempresas
		) {
			toast.error(
				"Limite de empresas atingido. Faça upgrade do plano para continuar.",
				{
					action: {
						label: "Ver planos",
						onClick: () => router.push("/meus-planos"),
					},
				},
			);
			return;
		}
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
										<div className="flex gap-2">
											<Controller
												control={control}
												name="cnpj"
												render={({ field }) => (
													<Input
														id="cnpj"
														className="flex-1"
														placeholder="00.000.000/0000-00"
														aria-invalid={!!errors.cnpj}
														aria-describedby={
															errors.cnpj ? "cnpj-error" : undefined
														}
														value={field.value}
														onChange={(event) => {
															const valor = maskCpfCnpj(event.target.value);
															field.onChange(valor);
															const digitos = valor.replace(/\D/g, "");
															if (digitos.length < 14) {
																if (digitos.length === 0) {
																	ultimoCnpjBuscado.current = null;
																}
															}
														}}
														onBlur={() => {
															if (field.value) {
																void buscarCnpj(field.value);
															}
														}}
													/>
												)}
											/>
											<Button
												type="button"
												variant="outline"
												disabled={
													buscandoCnpj ||
													(cnpj ?? "").replace(/\D/g, "").length !== 14
												}
												onClick={() => {
													if (cnpj) {
														void buscarCnpj(cnpj, true);
													}
												}}
												aria-label="Consultar CNPJ"
											>
												<Search className="size-4" aria-hidden="true" />
												Consultar
											</Button>
										</div>
										{buscandoCnpj ? (
											<p className="text-xs text-muted-foreground mt-1">
												Buscando CNPJ...
											</p>
										) : null}
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
													value={field.value}
													onChange={(event) =>
														field.onChange(maskPhone(event.target.value))
													}
												/>
											)}
										/>
										<FieldError
											errors={errors.telefone ? [errors.telefone] : []}
										/>
									</Field>
								</div>

								<div className="space-y-4 pt-2">
									<h2 className="text-lg font-semibold">Endereço</h2>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<Field data-invalid={!!errors.cep}>
											<FieldLabel htmlFor="cep">CEP *</FieldLabel>
											<Controller
												control={control}
												name="cep"
												render={({ field }) => (
													<Input
														id="cep"
														placeholder="00000-000"
														aria-invalid={!!errors.cep}
														aria-describedby={
															errors.cep ? "cep-error" : undefined
														}
														value={field.value}
														onChange={(event) => {
															const valor = maskCep(event.target.value);
															field.onChange(valor);
															if (valor.replace(/\D/g, "").length < 8) {
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
											{buscandoCep ? (
												<p className="text-xs text-muted-foreground mt-1">
													Buscando CEP...
												</p>
											) : null}
											<FieldError errors={errors.cep ? [errors.cep] : []} />
										</Field>

										<Field data-invalid={!!errors.idestado}>
											<FieldLabel htmlFor="idestado">Estado *</FieldLabel>
											<Controller
												control={control}
												name="idestado"
												render={({ field }) => (
													<Select
														key={`idestado-${field.value ?? "vazio"}-${estadosData?.data.length ?? 0}`}
														value={field.value || undefined}
														onValueChange={(value) => {
															field.onChange(value);
															if (value !== field.value) {
																setValue("idcidade", "", {
																	shouldValidate: true,
																});
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
											<FieldError
												errors={errors.idestado ? [errors.idestado] : []}
											/>
										</Field>

										<Field data-invalid={!!errors.idcidade}>
											<FieldLabel htmlFor="idcidade">Cidade *</FieldLabel>
											<Controller
												control={control}
												name="idcidade"
												render={({ field }) => (
													<Combobox
														key={`idcidade-${idestado || "vazio"}-${municipiosData?.data.length ?? 0}-${field.value || "vazio"}`}
														options={municipioOptions}
														value={field.value}
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
											<FieldError
												errors={errors.idcidade ? [errors.idcidade] : []}
											/>
										</Field>

										<Field data-invalid={!!errors.endereco}>
											<FieldLabel htmlFor="endereco">Rua *</FieldLabel>
											<Input
												id="endereco"
												placeholder="Rua, Avenida, etc."
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

										<Field data-invalid={!!errors.numero}>
											<FieldLabel htmlFor="numero">Número *</FieldLabel>
											<Input
												id="numero"
												placeholder="Número"
												aria-invalid={!!errors.numero}
												aria-describedby={
													errors.numero ? "numero-error" : undefined
												}
												{...register("numero")}
											/>
											<FieldError
												errors={errors.numero ? [errors.numero] : []}
											/>
										</Field>

										<Field data-invalid={!!errors.complemento}>
											<FieldLabel htmlFor="complemento">Complemento</FieldLabel>
											<Input
												id="complemento"
												placeholder="Apto, sala, etc."
												aria-invalid={!!errors.complemento}
												aria-describedby={
													errors.complemento ? "complemento-error" : undefined
												}
												{...register("complemento")}
											/>
											<FieldError
												errors={
													errors.complemento ? [errors.complemento] : []
												}
											/>
										</Field>

										<Field data-invalid={!!errors.bairro}>
											<FieldLabel htmlFor="bairro">Bairro *</FieldLabel>
											<Input
												id="bairro"
												placeholder="Bairro"
												aria-invalid={!!errors.bairro}
												aria-describedby={
													errors.bairro ? "bairro-error" : undefined
												}
												{...register("bairro")}
											/>
											<FieldError
												errors={errors.bairro ? [errors.bairro] : []}
											/>
										</Field>
									</div>
								</div>
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
