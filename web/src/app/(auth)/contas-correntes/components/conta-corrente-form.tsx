"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type AtualizarContaCorrenteFormData,
	atualizarContaCorrenteSchema,
	type CriarContaCorrenteFormData,
	criarContaCorrenteSchema,
} from "@/schemas/contas-correntes.schema";
import { bancosService } from "@/services/bancos.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";

type ContaCorrenteFormProps = {
	modo?: "criar" | "editar";
	contaCorrenteId?: string;
	valoresIniciais?: Partial<
		CriarContaCorrenteFormData | AtualizarContaCorrenteFormData
	>;
};

export function ContaCorrenteForm(props: ContaCorrenteFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: contaCorrente } = useQuery({
		queryKey: ["conta-corrente", props.contaCorrenteId],
		queryFn: async () => {
			if (!props.contaCorrenteId) {
				throw new Error("ID da conta corrente é obrigatório");
			}
			return await contasCorrentesService.buscar(props.contaCorrenteId);
		},
		enabled: !!props.contaCorrenteId,
	});

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		CriarContaCorrenteFormData | AtualizarContaCorrenteFormData
	>({
		resolver: zodResolver(
			isEdicao ? atualizarContaCorrenteSchema : criarContaCorrenteSchema,
		),
		defaultValues: isEdicao
			? {}
			: {
					idempresa: empresa?.id || "",
					descricao: contaCorrente?.descricao || "",
					agencia: contaCorrente?.agencia || "",
					numeroconta: contaCorrente?.numeroconta || "",
					abertura: contaCorrente?.abertura || "",
					observacao: "",
					nometitular: contaCorrente?.nometitular || "",
					cnpjcpftitular: contaCorrente?.cnpjcpftitular || "",
					gerente: contaCorrente?.gerente || "",
					telefonegerente: contaCorrente?.telefonegerente || "",
					codigo: contaCorrente?.codigo || undefined,
					idbanco: contaCorrente?.idbanco || undefined,
				},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		getValues,
		formState: { errors },
	} = form;

	const idbanco = watch("idbanco");
	const codigo = watch("codigo");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: !isEdicao,
		fetchFn: contasCorrentesService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	const [bancoSearch, setBancoSearch] = useState("");
	const [showBancoSuggestions, setShowBancoSuggestions] = useState(false);
	const bancoInputRef = useRef<HTMLInputElement>(null);
	const bancoSuggestionsRef = useRef<HTMLDivElement>(null);
	const bancoInicializadoRef = useRef(false);

	// Buscar todos os bancos da empresa (sem filtro para ter acesso completo na edição)
	const { data: bancosDataAll } = useQuery({
		queryKey: ["bancos-all", empresa?.id],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await bancosService.listar({
				idempresa: empresa.id,
				limit: 900,
			});
		},
		enabled: !!empresa,
	});

	// Buscar lista de bancos filtrada para sugestões
	const { data: bancosData } = useQuery({
		queryKey: ["bancos", empresa?.id, bancoSearch],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}

			return await bancosService.listar({
				nome: bancoSearch || undefined,
				idempresa: empresa.id,
				limit: 10,
			});
		},
		enabled: !!empresa && bancoSearch.length > 0,
	});

	// Filtrar bancos baseado na busca (usar dados filtrados se houver busca, senão usar todos)
	const bancosParaFiltrar =
		bancoSearch.length > 0 ? bancosData?.data || [] : bancosDataAll?.data || [];

	const filteredBancos = bancosParaFiltrar.filter(
		(banco) =>
			banco.nome.toLowerCase().includes(bancoSearch.toLowerCase()) ||
			banco.codigo.toLowerCase().includes(bancoSearch.toLowerCase()),
	);

	// Fechar sugestões ao clicar fora
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				bancoInputRef.current &&
				!bancoInputRef.current.contains(event.target as Node) &&
				bancoSuggestionsRef.current &&
				!bancoSuggestionsRef.current.contains(event.target as Node)
			) {
				setShowBancoSuggestions(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		if (!isEdicao) return;
		// Prioriza usar contaCorrente se disponível, senão usa valoresIniciais
		const dadosParaReset = contaCorrente
			? {
					descricao: contaCorrente.descricao || "",
					agencia: contaCorrente.agencia || "",
					numeroconta: contaCorrente.numeroconta || "",
					abertura: contaCorrente.abertura || "",
					observacao: contaCorrente.observacao || "",
					nometitular: contaCorrente.nometitular || "",
					cnpjcpftitular: contaCorrente.cnpjcpftitular || "",
					gerente: contaCorrente.gerente || "",
					telefonegerente: contaCorrente.telefonegerente || "",
					codigo: contaCorrente.codigo || undefined,
					idbanco: contaCorrente.idbanco || undefined,
				}
			: props.valoresIniciais;

		if (!dadosParaReset) return;

		form.reset({
			...form.getValues(),
			...dadosParaReset,
		});
	}, [isEdicao, contaCorrente, props.valoresIniciais, form]);

	// Atualizar o campo de busca quando o banco for carregado na edição (apenas na primeira carga)
	useEffect(() => {
		if (!isEdicao) {
			bancoInicializadoRef.current = false;
			return;
		}
		if (!contaCorrente?.idbanco) {
			bancoInicializadoRef.current = false;
			return;
		}
		if (!bancosDataAll?.data) return;
		// Só atualizar uma vez na primeira carga para não sobrescrever edição do usuário
		if (bancoInicializadoRef.current) return;

		// Buscar o banco pelo idbanco da conta corrente
		const bancoInicial = bancosDataAll.data.find(
			(banco) => banco.id === contaCorrente.idbanco,
		);

		if (bancoInicial) {
			const textoBanco = `${bancoInicial.codigo} - ${bancoInicial.nome}`;
			setBancoSearch(textoBanco);
			// Garantir que o idbanco está setado no form
			setValue("idbanco", bancoInicial.id, { shouldValidate: true });
			bancoInicializadoRef.current = true;
		}
	}, [isEdicao, contaCorrente?.idbanco, bancosDataAll, setValue]);

	const { mutate: criarContaCorrente, isPending: isPendingCriar } = useMutation(
		{
			mutationFn: contasCorrentesService.criar,
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["contas-correntes"] });
				toast.success("Conta corrente cadastrada com sucesso!");
				router.push("/contas-correntes");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao cadastrar conta corrente");
			},
		},
	);

	const { mutate: atualizarContaCorrente, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (dados: AtualizarContaCorrenteFormData) => {
				if (!isEdicao || !props.contaCorrenteId) {
					throw new Error("ID da conta corrente é obrigatório para editar");
				}
				return await contasCorrentesService.atualizar(
					props.contaCorrenteId,
					dados,
				);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["contas-correntes"] });
				toast.success("Conta corrente atualizada com sucesso!");
				router.push("/contas-correntes");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar conta corrente");
			},
		});

	const onSubmit = (
		data: CriarContaCorrenteFormData | AtualizarContaCorrenteFormData,
	) => {
		if (!empresa && !isEdicao) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			if (!empresa) {
				toast.error("Empresa não selecionada");
				return;
			}
			const payload = {
				idempresa: empresa.id,
				descricao: (data as CriarContaCorrenteFormData).descricao,
				agencia: (data as CriarContaCorrenteFormData).agencia,
				numeroconta: (data as CriarContaCorrenteFormData).numeroconta,
				abertura: (data as CriarContaCorrenteFormData).abertura,
				observacao: (data as CriarContaCorrenteFormData).observacao,
				nometitular: (data as CriarContaCorrenteFormData).nometitular,
				cnpjcpftitular: (data as CriarContaCorrenteFormData).cnpjcpftitular,
				gerente: (data as CriarContaCorrenteFormData).gerente,
				telefonegerente: (data as CriarContaCorrenteFormData).telefonegerente,
				codigo: (data as CriarContaCorrenteFormData).codigo,
				idbanco: (data as CriarContaCorrenteFormData).idbanco,
			};

			criarContaCorrente(payload);
			return;
		}

		// Usar getValues() para garantir que pegamos o valor mais atual do form
		const valoresAtuais = getValues();
		const payloadAtualizacao: AtualizarContaCorrenteFormData = {
			descricao: valoresAtuais.descricao,
			agencia: valoresAtuais.agencia,
			numeroconta: valoresAtuais.numeroconta,
			abertura: valoresAtuais.abertura,
			observacao: valoresAtuais.observacao,
			nometitular: valoresAtuais.nometitular,
			cnpjcpftitular: valoresAtuais.cnpjcpftitular,
			gerente: valoresAtuais.gerente,
			telefonegerente: valoresAtuais.telefonegerente,
			codigo: valoresAtuais.codigo,
			// Garantir que idbanco seja enviado como string ou null, nunca undefined
			idbanco: valoresAtuais.idbanco ?? null,
		};
		atualizarContaCorrente(payloadAtualizacao);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados da Conta Corrente</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.descricao}>
							<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
							<Input
								id="descricao"
								placeholder="Descrição da conta corrente"
								aria-invalid={!!errors.descricao}
								aria-describedby={
									errors.descricao ? "descricao-error" : undefined
								}
								{...register("descricao")}
							/>
							<FieldError errors={errors.descricao ? [errors.descricao] : []} />
						</Field>

						<Field data-invalid={!!errors.agencia}>
							<FieldLabel htmlFor="agencia">Agência</FieldLabel>
							<Input
								id="agencia"
								placeholder="Número da agência"
								aria-invalid={!!errors.agencia}
								aria-describedby={errors.agencia ? "agencia-error" : undefined}
								{...register("agencia")}
							/>
							<FieldError errors={errors.agencia ? [errors.agencia] : []} />
						</Field>

						<Field data-invalid={!!errors.numeroconta}>
							<FieldLabel htmlFor="numeroconta">Número da Conta</FieldLabel>
							<Input
								id="numeroconta"
								placeholder="Número da conta bancária"
								aria-invalid={!!errors.numeroconta}
								aria-describedby={
									errors.numeroconta ? "numeroconta-error" : undefined
								}
								{...register("numeroconta")}
							/>
							<FieldError
								errors={errors.numeroconta ? [errors.numeroconta] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.abertura}>
							<FieldLabel htmlFor="abertura">Data de Abertura</FieldLabel>
							<Input
								id="abertura"
								type="date"
								aria-invalid={!!errors.abertura}
								aria-describedby={
									errors.abertura ? "abertura-error" : undefined
								}
								{...register("abertura")}
							/>
							<FieldError errors={errors.abertura ? [errors.abertura] : []} />
						</Field>

						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								type="number"
								placeholder="Código interno"
								aria-invalid={!!errors.codigo}
								aria-describedby={errors.codigo ? "codigo-error" : undefined}
								{...register("codigo", { valueAsNumber: true })}
							/>
							<p className="text-sm text-muted-foreground">
								Preenchido automaticamente; pode ser alterado.
							</p>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.idbanco}>
							<FieldLabel htmlFor="idbanco">Banco (Opcional)</FieldLabel>
							<div className="relative" ref={bancoInputRef}>
								<Input
									id="idbanco"
									type="text"
									placeholder="Digite o nome ou código do banco"
									value={bancoSearch}
									onChange={(e) => {
										const novoValor = e.target.value;
										setBancoSearch(novoValor);
										setShowBancoSuggestions(novoValor.length > 0);

										// Se o campo foi apagado, limpar o idbanco
										if (novoValor.length === 0) {
											setValue("idbanco", undefined, { shouldValidate: true });
										} else {
											// Se o usuário está digitando algo diferente do banco atual, limpar idbanco
											// para permitir selecionar um novo banco
											const bancoAtual = bancosDataAll?.data.find(
												(b) => b.id === idbanco,
											);
											if (bancoAtual) {
												const textoBancoAtual = `${bancoAtual.codigo} - ${bancoAtual.nome}`;
												if (novoValor !== textoBancoAtual) {
													setValue("idbanco", undefined, {
														shouldValidate: true,
													});
												}
											} else if (idbanco) {
												// Se há idbanco mas não corresponde ao texto digitado, limpar
												setValue("idbanco", undefined, {
													shouldValidate: true,
												});
											}
										}
									}}
									onFocus={() => setShowBancoSuggestions(true)}
									aria-invalid={!!errors.idbanco}
									aria-describedby={
										errors.idbanco ? "idbanco-error" : undefined
									}
									autoComplete="off"
								/>
								{showBancoSuggestions &&
									bancoSearch.length > 0 &&
									filteredBancos.length > 0 && (
										<div
											ref={bancoSuggestionsRef}
											className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
											role="listbox"
										>
											<ul className="p-1">
												{filteredBancos.map((banco) => (
													<li key={banco.id}>
														<button
															type="button"
															className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
															onClick={() => {
																setBancoSearch(
																	`${banco.codigo} - ${banco.nome}`,
																);
																// Garantir que o idbanco seja setado corretamente
																setValue("idbanco", banco.id, {
																	shouldValidate: true,
																	shouldDirty: true,
																	shouldTouch: true,
																});
																setShowBancoSuggestions(false);
															}}
															role="option"
															aria-selected={false}
														>
															<div className="font-medium">
																{banco.codigo} - {banco.nome}
															</div>
														</button>
													</li>
												))}
											</ul>
										</div>
									)}
								{showBancoSuggestions &&
									bancoSearch.length > 0 &&
									filteredBancos.length === 0 && (
										<div
											ref={bancoSuggestionsRef}
											className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md"
										>
											Nenhum banco encontrado
										</div>
									)}
							</div>
							<FieldError errors={errors.idbanco ? [errors.idbanco] : []} />
						</Field>

						<Field data-invalid={!!errors.nometitular}>
							<FieldLabel htmlFor="nometitular">Nome do Titular</FieldLabel>
							<Input
								id="nometitular"
								placeholder="Nome do titular da conta"
								aria-invalid={!!errors.nometitular}
								aria-describedby={
									errors.nometitular ? "nometitular-error" : undefined
								}
								{...register("nometitular")}
							/>
							<FieldError
								errors={errors.nometitular ? [errors.nometitular] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.cnpjcpftitular}>
							<FieldLabel htmlFor="cnpjcpftitular">
								CNPJ/CPF do Titular
							</FieldLabel>
							<Input
								id="cnpjcpftitular"
								placeholder="CNPJ ou CPF do titular"
								aria-invalid={!!errors.cnpjcpftitular}
								aria-describedby={
									errors.cnpjcpftitular ? "cnpjcpftitular-error" : undefined
								}
								{...register("cnpjcpftitular")}
							/>
							<FieldError
								errors={errors.cnpjcpftitular ? [errors.cnpjcpftitular] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.gerente}>
							<FieldLabel htmlFor="gerente">Gerente (Opcional)</FieldLabel>
							<Input
								id="gerente"
								placeholder="Nome do gerente"
								aria-invalid={!!errors.gerente}
								aria-describedby={errors.gerente ? "gerente-error" : undefined}
								{...register("gerente")}
							/>
							<FieldError errors={errors.gerente ? [errors.gerente] : []} />
						</Field>

						<Field data-invalid={!!errors.telefonegerente}>
							<FieldLabel htmlFor="telefonegerente">
								Telefone do Gerente (Opcional)
							</FieldLabel>
							<Input
								id="telefonegerente"
								placeholder="Telefone do gerente"
								aria-invalid={!!errors.telefonegerente}
								aria-describedby={
									errors.telefonegerente ? "telefonegerente-error" : undefined
								}
								{...register("telefonegerente")}
							/>
							<FieldError
								errors={errors.telefonegerente ? [errors.telefonegerente] : []}
							/>
						</Field>
					</div>

					<Field data-invalid={!!errors.observacao}>
						<FieldLabel htmlFor="observacao">Observação</FieldLabel>
						<Textarea
							id="observacao"
							placeholder="Observações adicionais"
							aria-invalid={!!errors.observacao}
							aria-describedby={
								errors.observacao ? "observacao-error" : undefined
							}
							{...register("observacao")}
							className="min-h-24"
						/>
						<FieldError errors={errors.observacao ? [errors.observacao] : []} />
					</Field>
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
