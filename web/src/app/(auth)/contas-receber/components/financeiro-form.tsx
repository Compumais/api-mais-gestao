"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	ApropriacaoCentroCustoField,
	type ApropriacaoCentroCustoFieldValue,
	mapApropriacaoParaApi,
} from "@/components/apropriacao-centro-custo-field";
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
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ADMINISTRADORAS_CARTAO } from "@/constants/administradoras-cartao";
import { useEmpresa } from "@/hooks/use-empresa";
import { useTituloAba } from "@/hooks/use-titulo-aba";
import { extractDateOnly } from "@/lib/date";
import {
	type AtualizarFinanceiroFormData,
	atualizarFinanceiroSchema,
	type CriarFinanceiroFormData,
	criarFinanceiroSchema,
	isTipoDocumentoCartao,
	isTipoDocumentoCheque,
} from "@/schemas/financeiro.schema";
import { apropriacaoCentroCustoService } from "@/services/apropriacao-centro-custo.service";
import { bancosService } from "@/services/bancos.service";
import { bandeiraCartaoService } from "@/services/bandeira-cartao.service";
import { entidadesService } from "@/services/entidades.service";
import {
	type AtualizarFinanceiroData,
	type CriarFinanceiroData,
	financeiroService,
} from "@/services/financeiro.service";
import { planoContasService } from "@/services/plano-contas.service";
import { tipoCobrancaService } from "@/services/tipo-cobranca.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

const apropriacaoCentroCustoInicial: ApropriacaoCentroCustoFieldValue = {
	modo: "unico",
	idcriteriorateio: null,
	linhas: [{ idcentrocusto: "" }],
};

const formatDateForInput = (date?: string | null): string =>
	extractDateOnly(date) ?? "";

interface FinanceiroFormProps {
	modo?: "criar" | "editar";
	financeiroId?: string;
	tipo: "P" | "R"; // P = Pagar, R = Receber
	valoresIniciais?: Partial<CriarFinanceiroFormData>;
	onSuccess?: () => void;
}

export function FinanceiroForm({
	modo = "criar",
	financeiroId,
	tipo,
	valoresIniciais,
	onSuccess,
}: FinanceiroFormProps) {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const formRef = useRef<HTMLFormElement>(null);
	const isEdicao = modo === "editar";
	const [apropriacaoCentroCusto, setApropriacaoCentroCusto] =
		useState<ApropriacaoCentroCustoFieldValue>(apropriacaoCentroCustoInicial);

	const form = useForm<CriarFinanceiroFormData | AtualizarFinanceiroFormData>({
		resolver: zodResolver(
			isEdicao ? atualizarFinanceiroSchema : criarFinanceiroSchema,
		),
		defaultValues: {
			idempresa: empresa?.id || "",
			documento: "",
			pagamentoRecorrente: false,
			idtipodocumentofinanceiro: undefined,
			meses: null,
			tipoCobranca: null,
			entrada: null,
			referencia: null,
			emissao: formatDateForInput(),
			vencimento: formatDateForInput(),
			idbanco: undefined,
			identidade: undefined,
			idplanocontas: undefined,
			valor: "",
			observacoes: null,
			iddependente: null,
			idportador: null,
			agencia: null,
			conta: null,
			emitente: null,
			cnpjcpfemitente: null,
			nomeadministradora: null,
			nomebandeira: null,
			idadministradora: null,
			idbandeira: null,
			tipo,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		control,
		formState: { errors },
	} = form;

	const idtipodocumentofinanceiro = watch("idtipodocumentofinanceiro");
	const valorTitulo = watch("valor");
	const idadministradoraAtual = watch("idadministradora");
	const nomeadministradoraAtual = watch("nomeadministradora");
	const idbandeiraAtual = watch("idbandeira");
	const nomebandeiraAtual = watch("nomebandeira");

	const valorTotalNumerico = useMemo(() => {
		const n = Number(valorTitulo);
		return Number.isNaN(n) ? 0 : n;
	}, [valorTitulo]);

	// Carregar dados para edição
	const { data: financeiroData, isLoading: isLoadingFinanceiro } = useQuery({
		queryKey: ["financeiro", financeiroId],
		queryFn: () => financeiroService.buscar(financeiroId!),
		enabled: isEdicao && !!financeiroId,
	});

	const { data: apropriacoesExistentes } = useQuery({
		queryKey: [
			"apropriacoes-centro-custo",
			"financeiro",
			empresa?.id,
			financeiroId,
		],
		queryFn: async () => {
			if (!empresa?.id || !financeiroId) {
				throw new Error("Dados insuficientes");
			}
			return apropriacaoCentroCustoService.listarPorOrigem({
				idempresa: empresa.id,
				origemtipo: "financeiro",
				origemid: financeiroId,
				regime: "competencia",
			});
		},
		enabled: isEdicao && !!financeiroId && !!empresa?.id,
	});

	useTituloAba(
		isEdicao
			? financeiroData?.historico ?? financeiroData?.documento ?? undefined
			: undefined,
	);

	// Carregar bancos
	const { data: bancosData } = useQuery({
		queryKey: ["bancos", empresa?.id],
		queryFn: () =>
			bancosService.listar({
				idempresa: empresa?.id!,
				limit: 100,
			}),
		enabled: !!empresa?.id,
	});

	// Carregar entidades (clientes)
	const { data: entidadesData } = useQuery({
		queryKey: ["entidades", empresa?.id],
		queryFn: () =>
			entidadesService.listar({
				idempresa: empresa?.id!,
				limit: 100,
				page: 1,
			}),
		enabled: !!empresa?.id,
	});

	// Carregar planos de contas
	const { data: planoContasData } = useQuery({
		queryKey: ["plano-contas", empresa?.id, tipo],
		queryFn: () => {
			// Determinar o tipo de movimento baseado no tipo de operação
			// R (Receber) = Entrada (E), P (Pagar) = Saída (S)
			const tipomovimento: "E" | "S" = tipo === "R" ? "E" : "S";

			return planoContasService.listar({
				idempresa: empresa?.id!,
				page: 1,
				limit: 100,
				listarTudo: true,
				tipomovimento,
			});
		},
		enabled: !!empresa?.id,
	});

	const { data: tiposCobranca = [] } = useQuery({
		queryKey: ["tipos-cobranca", empresa?.id, "form-financeiro"],
		queryFn: async () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}
			return await tipoCobrancaService.listarTodos({
				idempresa: empresa.id,
			});
		},
		enabled: !!empresa?.id,
	});

	const { data: tiposDocumento = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id, "form-financeiro"],
		queryFn: async () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}
			return tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa?.id,
	});

	const { data: bandeirasCartao = [] } = useQuery({
		queryKey: ["bandeiras-cartao", empresa?.id, "form-financeiro"],
		queryFn: async () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}
			return bandeiraCartaoService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa?.id,
	});

	const opcoesTipoCobranca = useMemo(
		() =>
			tiposCobranca.map((tipoCobranca) => ({
				value: tipoCobranca.id,
				label: tipoCobranca.descricao,
			})),
		[tiposCobranca],
	);

	const opcoesTipoDocumento = useMemo(
		() =>
			tiposDocumento.map((tipoDoc) => ({
				value: tipoDoc.id,
				label: tipoDoc.descricao,
			})),
		[tiposDocumento],
	);

	const opcoesBandeira = useMemo(() => {
		const opcoes = bandeirasCartao.map((bandeira) => ({
			value: bandeira.id,
			label: bandeira.codigo
				? `${bandeira.descricao} (${bandeira.codigo})`
				: bandeira.descricao,
		}));
		if (
			idbandeiraAtual &&
			!opcoes.some((opcao) => opcao.value === idbandeiraAtual)
		) {
			opcoes.unshift({
				value: idbandeiraAtual,
				label: nomebandeiraAtual || idbandeiraAtual,
			});
		}
		return opcoes;
	}, [bandeirasCartao, idbandeiraAtual, nomebandeiraAtual]);

	const opcoesAdministradora = useMemo(() => {
		const opcoes = ADMINISTRADORAS_CARTAO.map((admin) => ({
			value: admin.id,
			label: admin.nome,
		}));
		if (
			idadministradoraAtual &&
			!opcoes.some((opcao) => opcao.value === idadministradoraAtual)
		) {
			opcoes.unshift({
				value: idadministradoraAtual,
				label: nomeadministradoraAtual || idadministradoraAtual,
			});
		}
		return opcoes;
	}, [idadministradoraAtual, nomeadministradoraAtual]);

	const tipoDocumentoSelecionado = useMemo(
		() =>
			tiposDocumento.find((item) => item.id === idtipodocumentofinanceiro) ??
			null,
		[tiposDocumento, idtipodocumentofinanceiro],
	);

	const showCamposCheque = isTipoDocumentoCheque(
		tipoDocumentoSelecionado?.descricao,
		tipoDocumentoSelecionado?.formapagamentonfe,
	);
	const showCamposCartao = isTipoDocumentoCartao(
		tipoDocumentoSelecionado?.descricao,
		tipoDocumentoSelecionado?.formapagamentonfe,
	);

	useEffect(() => {
		// Só limpa depois que o tipo selecionado estiver resolvido na lista.
		if (!idtipodocumentofinanceiro || !tipoDocumentoSelecionado) return;
		if (!showCamposCartao) {
			setValue("idadministradora", null);
			setValue("nomeadministradora", null);
			setValue("idbandeira", null);
			setValue("nomebandeira", null);
		}
		if (!showCamposCheque) {
			setValue("agencia", null);
			setValue("conta", null);
			setValue("emitente", null);
			setValue("cnpjcpfemitente", null);
		}
	}, [
		idtipodocumentofinanceiro,
		tipoDocumentoSelecionado,
		showCamposCartao,
		showCamposCheque,
		setValue,
	]);

	// Preencher formulário com dados existentes na edição
	useEffect(() => {
		if (isEdicao && financeiroData) {
			// Mapear tipo documento de volta (precisaria de uma função reversa)
			// Por enquanto, vamos deixar null e o usuário pode selecionar novamente
			form.reset({
				documento: financeiroData.documento || "",
				pagamentoRecorrente: false,
				idtipodocumentofinanceiro:
					financeiroData.idtipodocumentofinanceiro || undefined,
				meses: null,
				tipoCobranca: financeiroData.idtipocobranca || null,
				entrada: formatDateForInput(financeiroData.entrada),
				referencia: formatDateForInput(financeiroData.datareferencia),
				emissao: formatDateForInput(financeiroData.emissao),
				vencimento: formatDateForInput(financeiroData.vencimento),
				idbanco: financeiroData.idbanco || undefined,
				identidade: financeiroData.identidade || undefined,
				idplanocontas:
					financeiroData.idplanocontas ||
					financeiroData.idcodigocontabil?.toString() ||
					undefined,
				valor: financeiroData.valor || "",
				observacoes: financeiroData.historico || null,
				iddependente: financeiroData.iddependente || null,
				idportador: financeiroData.idportador || null,
				agencia: financeiroData.agencia || null,
				conta: financeiroData.numerocontacorrente || null,
				emitente: financeiroData.emitente || null,
				cnpjcpfemitente: financeiroData.cnpjcpfemitente || null,
				nomeadministradora: financeiroData.nomeadministradora || null,
				nomebandeira: financeiroData.nomebandeira || null,
				idadministradora: financeiroData.idadministradora
					? String(financeiroData.idadministradora)
					: null,
				idbandeira: financeiroData.idbandeira
					? String(financeiroData.idbandeira)
					: null,
			});
		} else if (valoresIniciais) {
			form.reset({
				...form.getValues(),
				...valoresIniciais,
				idempresa: valoresIniciais.idempresa || empresa?.id || "",
			});
		}
	}, [isEdicao, financeiroData, valoresIniciais, empresa?.id, form]);

	useEffect(() => {
		const linhas = apropriacoesExistentes?.data ?? [];
		if (!linhas.length) return;

		if (linhas.length === 1) {
			setApropriacaoCentroCusto({
				modo: "unico",
				idcriteriorateio: null,
				linhas: [
					{
						idcentrocusto: linhas[0].idcentrocusto,
						valor: Number(linhas[0].valor),
					},
				],
			});
			return;
		}

		setApropriacaoCentroCusto({
			modo: "rateio_manual",
			idcriteriorateio: null,
			linhas: linhas.map((l) => ({
				idcentrocusto: l.idcentrocusto,
				valor: Number(l.valor),
				percentual: l.percentual ? Number(l.percentual) : null,
			})),
		});
	}, [apropriacoesExistentes]);

	// Atalho F10 para salvar
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused && event.key === "F10") {
				event.preventDefault();
				if (formRef.current) {
					formRef.current.requestSubmit();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const criarMutation = useMutation({
		mutationFn: async (data: CriarFinanceiroFormData) => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}

			const temApropriacaoCentroCusto =
				apropriacaoCentroCusto.modo === "rateio_criterio"
					? !!apropriacaoCentroCusto.idcriteriorateio
					: apropriacaoCentroCusto.linhas.some((l) => l.idcentrocusto);

			const apropriacaoPayload = temApropriacaoCentroCusto
				? mapApropriacaoParaApi(apropriacaoCentroCusto, valorTotalNumerico)
				: {};

			const payload: CriarFinanceiroData = {
				idempresa: empresa.id,
				identidade: data.identidade || null,
				tipo: data.tipo || tipo,
				documento: data.documento || null,
				idtipodocumentofinanceiro: data.idtipodocumentofinanceiro || null,
				emissao: data.emissao || null,
				vencimento: data.vencimento || null,
				entrada: data.entrada || null,
				datareferencia: data.referencia || null,
				idbanco: data.idbanco ?? null,
				idplanocontas: data.idplanocontas || null,
				valor: data.valor || "0.00",
				saldo: data.valor || "0.00",
				historico: data.observacoes || null,
				idtipocobranca: data.tipoCobranca || null,
				idportador: data.idportador || null,
				iddependente: data.iddependente || null,
				status: "A",
				agencia: showCamposCheque ? data.agencia || null : null,
				numerocontacorrente: showCamposCheque ? data.conta || null : null,
				emitente: showCamposCheque ? data.emitente || null : null,
				cnpjcpfemitente: showCamposCheque ? data.cnpjcpfemitente || null : null,
				nomeadministradora: showCamposCartao
					? data.nomeadministradora || null
					: null,
				idadministradora: showCamposCartao
					? data.idadministradora || null
					: null,
				nomebandeira: showCamposCartao ? data.nomebandeira || null : null,
				idbandeira: showCamposCartao ? data.idbandeira || null : null,
				...apropriacaoPayload,
			};

			return await financeiroService.criar(payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			toast.success(
				`Conta ${tipo === "R" ? "a receber" : "a pagar"} cadastrada com sucesso!`,
			);
			onSuccess?.();
		},
		onError: (error: Error) => {
			toast.error(
				error.message ||
					`Erro ao cadastrar conta ${tipo === "R" ? "a receber" : "a pagar"}`,
			);
		},
	});

	const atualizarMutation = useMutation({
		mutationFn: async (data: AtualizarFinanceiroFormData) => {
			if (!financeiroId) {
				throw new Error("ID do financeiro é obrigatório para editar");
			}

			const temApropriacaoCentroCusto =
				apropriacaoCentroCusto.modo === "rateio_criterio"
					? !!apropriacaoCentroCusto.idcriteriorateio
					: apropriacaoCentroCusto.linhas.some((l) => l.idcentrocusto);

			const apropriacaoPayload = temApropriacaoCentroCusto
				? mapApropriacaoParaApi(apropriacaoCentroCusto, valorTotalNumerico)
				: {};

			const payload: AtualizarFinanceiroData = {
				identidade: data.identidade || null,
				documento: data.documento || null,
				idtipodocumentofinanceiro: data.idtipodocumentofinanceiro || null,
				emissao: data.emissao || null,
				vencimento: data.vencimento || null,
				entrada: data.entrada || null,
				datareferencia: data.referencia || null,
				idbanco: data.idbanco ?? null,
				idplanocontas: data.idplanocontas || null,
				valor: data.valor || undefined,
				saldo: data.valor || undefined,
				historico: data.observacoes || null,
				idtipocobranca: data.tipoCobranca || null,
				idportador: data.idportador || null,
				iddependente: data.iddependente || null,
				agencia: showCamposCheque ? data.agencia || null : null,
				numerocontacorrente: showCamposCheque ? data.conta || null : null,
				emitente: showCamposCheque ? data.emitente || null : null,
				cnpjcpfemitente: showCamposCheque ? data.cnpjcpfemitente || null : null,
				nomeadministradora: showCamposCartao
					? data.nomeadministradora || null
					: null,
				idadministradora: showCamposCartao
					? data.idadministradora || null
					: null,
				nomebandeira: showCamposCartao ? data.nomebandeira || null : null,
				idbandeira: showCamposCartao ? data.idbandeira || null : null,
				...apropriacaoPayload,
			};

			return await financeiroService.atualizar(financeiroId, payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			toast.success(
				`Conta ${tipo === "R" ? "a receber" : "a pagar"} atualizada com sucesso!`,
			);
			onSuccess?.();
		},
		onError: (error: Error) => {
			toast.error(
				error.message ||
					`Erro ao atualizar conta ${tipo === "R" ? "a receber" : "a pagar"}`,
			);
		},
	});

	const onSubmit = (
		data: CriarFinanceiroFormData | AtualizarFinanceiroFormData,
	) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (isEdicao) {
			atualizarMutation.mutate(data as AtualizarFinanceiroFormData);
		} else {
			criarMutation.mutate(data as CriarFinanceiroFormData);
		}
	};

	if (isEdicao && isLoadingFinanceiro) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados Básicos</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.documento}>
							<FieldLabel htmlFor="documento">Documento</FieldLabel>
							<Input
								id="documento"
								placeholder="Número do documento"
								aria-invalid={!!errors.documento}
								aria-describedby={
									errors.documento ? "documento-error" : undefined
								}
								{...register("documento")}
							/>
							<FieldError errors={errors.documento ? [errors.documento] : []} />
						</Field>

						<Field data-invalid={!!errors.pagamentoRecorrente}>
							<div className="flex items-center space-x-2 pt-6">
								<Checkbox
									id="pagamentoRecorrente"
									checked={watch("pagamentoRecorrente")}
									onCheckedChange={(checked) =>
										setValue("pagamentoRecorrente", checked === true)
									}
								/>
								<FieldLabel
									htmlFor="pagamentoRecorrente"
									className="cursor-pointer"
								>
									Pagamento recorrente
								</FieldLabel>
							</div>
							<FieldError
								errors={
									errors.pagamentoRecorrente ? [errors.pagamentoRecorrente] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.idtipodocumentofinanceiro}>
							<FieldLabel htmlFor="idtipodocumentofinanceiro">
								Tipo de Documento *
							</FieldLabel>
							<Controller
								control={control}
								name="idtipodocumentofinanceiro"
								render={({ field }) => (
									<Combobox
										options={opcoesTipoDocumento}
										value={field.value ?? ""}
										onChange={(value) => {
											field.onChange(value || undefined);
											if (!value) {
												setValue("idadministradora", null);
												setValue("nomeadministradora", null);
												setValue("idbandeira", null);
												setValue("nomebandeira", null);
											}
										}}
										placeholder="Selecione o tipo de documento"
										searchPlaceholder="Buscar tipo de documento..."
										emptyMessage="Nenhum tipo de documento encontrado."
										disabled={!empresa?.id}
									/>
								)}
							/>
							<FieldError
								errors={
									errors.idtipodocumentofinanceiro
										? [errors.idtipodocumentofinanceiro]
										: []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.meses}>
							<FieldLabel htmlFor="meses">Meses</FieldLabel>
							<Input
								id="meses"
								type="number"
								placeholder="Número de meses"
								aria-invalid={!!errors.meses}
								aria-describedby={errors.meses ? "meses-error" : undefined}
								{...register("meses", { valueAsNumber: true })}
							/>
							<FieldError errors={errors.meses ? [errors.meses] : []} />
						</Field>

						<Field data-invalid={!!errors.tipoCobranca}>
							<FieldLabel htmlFor="tipoCobranca">Tipo de Cobrança</FieldLabel>
							<Controller
								control={control}
								name="tipoCobranca"
								render={({ field }) => (
									<Combobox
										options={opcoesTipoCobranca}
										value={field.value ?? ""}
										onChange={(value) => field.onChange(value || null)}
										placeholder="Selecione o tipo de cobrança"
										searchPlaceholder="Buscar tipo de cobrança..."
										emptyMessage="Nenhum tipo de cobrança encontrado."
										disabled={!empresa?.id}
									/>
								)}
							/>
							<FieldError
								errors={errors.tipoCobranca ? [errors.tipoCobranca] : []}
							/>
						</Field>
					</div>
				</div>

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Datas</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.entrada}>
							<FieldLabel htmlFor="entrada">Entrada</FieldLabel>
							<Input
								id="entrada"
								type="date"
								aria-invalid={!!errors.entrada}
								aria-describedby={errors.entrada ? "entrada-error" : undefined}
								{...register("entrada")}
							/>
							<FieldError errors={errors.entrada ? [errors.entrada] : []} />
						</Field>

						<Field data-invalid={!!errors.referencia}>
							<FieldLabel htmlFor="referencia">Referência</FieldLabel>
							<Input
								id="referencia"
								type="date"
								aria-invalid={!!errors.referencia}
								aria-describedby={
									errors.referencia ? "referencia-error" : undefined
								}
								{...register("referencia")}
							/>
							<FieldError
								errors={errors.referencia ? [errors.referencia] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.emissao}>
							<FieldLabel htmlFor="emissao">Emissão *</FieldLabel>
							<Input
								id="emissao"
								type="date"
								aria-invalid={!!errors.emissao}
								aria-describedby={errors.emissao ? "emissao-error" : undefined}
								{...register("emissao")}
							/>
							<FieldError errors={errors.emissao ? [errors.emissao] : []} />
						</Field>

						<Field data-invalid={!!errors.vencimento}>
							<FieldLabel htmlFor="vencimento">Vencimento *</FieldLabel>
							<Input
								id="vencimento"
								type="date"
								aria-invalid={!!errors.vencimento}
								aria-describedby={
									errors.vencimento ? "vencimento-error" : undefined
								}
								{...register("vencimento")}
							/>
							<FieldError
								errors={errors.vencimento ? [errors.vencimento] : []}
							/>
						</Field>
					</div>
				</div>

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Informações Principais</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.idbanco}>
							<FieldLabel htmlFor="idbanco">Banco *</FieldLabel>
							<Select
								value={watch("idbanco") ?? undefined}
								onValueChange={(value) => setValue("idbanco", value)}
							>
								<SelectTrigger
									id="idbanco"
									aria-invalid={!!errors.idbanco}
									aria-describedby={
										errors.idbanco ? "idbanco-error" : undefined
									}
								>
									<SelectValue placeholder="Selecione o banco" />
								</SelectTrigger>
								<SelectContent>
									{bancosData?.data.map((banco) => (
										<SelectItem key={banco.id} value={banco.id}>
											{banco.codigo} - {banco.nome}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={errors.idbanco ? [errors.idbanco] : []} />
						</Field>

						<Field data-invalid={!!errors.identidade}>
							<FieldLabel htmlFor="identidade">Cliente *</FieldLabel>
							<Controller
								control={control}
								name="identidade"
								render={({ field }) => (
									<Combobox
										options={
											entidadesData?.data.map((entidade) => ({
												value: entidade.id,
												label: entidade.nome,
											})) || []
										}
										value={field.value || ""}
										onChange={field.onChange}
										placeholder="Selecione o cliente"
										searchPlaceholder="Buscar cliente..."
										emptyMessage="Nenhum cliente encontrado."
									/>
								)}
							/>
							<FieldError
								errors={errors.identidade ? [errors.identidade] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.idplanocontas}>
							<FieldLabel htmlFor="idplanocontas">Plano de Contas *</FieldLabel>
							<Controller
								control={control}
								name="idplanocontas"
								render={({ field }) => (
									<Combobox
										options={
											planoContasData?.data.map((plano) => {
												const nivel = plano.codigo
													? (plano.codigo.match(/\./g) || []).length
													: 0;
												const prefix = "\u00A0\u00A0".repeat(nivel);
												return {
													value: plano.id,
													label: `${prefix}${plano.codigo ? `${plano.codigo} - ` : ""}${plano.nome || plano.id}`,
												};
											}) || []
										}
										value={field.value || ""}
										onChange={field.onChange}
										placeholder="Selecione o plano de contas"
										searchPlaceholder="Buscar plano de contas..."
										emptyMessage="Nenhum plano de contas encontrado."
									/>
								)}
							/>
							<FieldError
								errors={errors.idplanocontas ? [errors.idplanocontas] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.valor}>
							<FieldLabel htmlFor="valor">Valor *</FieldLabel>
							<Controller
								control={control}
								name="valor"
								render={({ field }) => (
									<MoneyInput
										id="valor"
										placeholder="0,00"
										aria-invalid={!!errors.valor}
										aria-describedby={errors.valor ? "valor-error" : undefined}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
							<FieldError errors={errors.valor ? [errors.valor] : []} />
						</Field>
					</div>
				</div>

				{/* Campos condicionais para Cheque */}
				{showCamposCheque && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Dados do Cheque</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field data-invalid={!!errors.agencia}>
								<FieldLabel htmlFor="agencia">Agência *</FieldLabel>
								<Input
									id="agencia"
									placeholder="Agência"
									maxLength={15}
									aria-invalid={!!errors.agencia}
									aria-describedby={
										errors.agencia ? "agencia-error" : undefined
									}
									{...register("agencia")}
								/>
								<FieldError errors={errors.agencia ? [errors.agencia] : []} />
							</Field>

							<Field data-invalid={!!errors.conta}>
								<FieldLabel htmlFor="conta">Conta *</FieldLabel>
								<Input
									id="conta"
									placeholder="Número da conta"
									maxLength={40}
									aria-invalid={!!errors.conta}
									aria-describedby={errors.conta ? "conta-error" : undefined}
									{...register("conta")}
								/>
								<FieldError errors={errors.conta ? [errors.conta] : []} />
							</Field>

							<Field data-invalid={!!errors.emitente}>
								<FieldLabel htmlFor="emitente">Emitente</FieldLabel>
								<Input
									id="emitente"
									placeholder="Nome do emitente"
									maxLength={60}
									aria-invalid={!!errors.emitente}
									aria-describedby={
										errors.emitente ? "emitente-error" : undefined
									}
									{...register("emitente")}
								/>
								<FieldError errors={errors.emitente ? [errors.emitente] : []} />
							</Field>

							<Field data-invalid={!!errors.cnpjcpfemitente}>
								<FieldLabel htmlFor="cnpjcpfemitente">CPF/CNPJ</FieldLabel>
								<Input
									id="cnpjcpfemitente"
									placeholder="CPF ou CNPJ do emitente"
									maxLength={30}
									aria-invalid={!!errors.cnpjcpfemitente}
									aria-describedby={
										errors.cnpjcpfemitente ? "cnpjcpfemitente-error" : undefined
									}
									{...register("cnpjcpfemitente")}
								/>
								<FieldError
									errors={
										errors.cnpjcpfemitente ? [errors.cnpjcpfemitente] : []
									}
								/>
							</Field>
						</div>
					</div>
				)}

				{showCamposCartao && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Dados do Cartão</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field data-invalid={!!errors.idadministradora}>
								<FieldLabel htmlFor="idadministradora">
									Administradora
								</FieldLabel>
								<Controller
									control={control}
									name="idadministradora"
									render={({ field }) => (
										<Select
											value={field.value ?? undefined}
											onValueChange={(value) => {
												const admin = opcoesAdministradora.find(
													(item) => item.value === value,
												);
												field.onChange(value);
												setValue(
													"nomeadministradora",
													admin?.label ?? null,
												);
											}}
										>
											<SelectTrigger
												id="idadministradora"
												aria-invalid={!!errors.idadministradora}
											>
												<SelectValue placeholder="Selecione a administradora" />
											</SelectTrigger>
											<SelectContent>
												{opcoesAdministradora.map((admin) => (
													<SelectItem key={admin.value} value={admin.value}>
														{admin.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FieldError
									errors={
										errors.idadministradora ? [errors.idadministradora] : []
									}
								/>
							</Field>

							<Field data-invalid={!!errors.idbandeira}>
								<FieldLabel htmlFor="idbandeira">Bandeira</FieldLabel>
								<Controller
									control={control}
									name="idbandeira"
									render={({ field }) => (
										<Select
											value={field.value ?? undefined}
											onValueChange={(value) => {
												const bandeira = bandeirasCartao.find(
													(item) => item.id === value,
												);
												field.onChange(value);
												setValue(
													"nomebandeira",
													bandeira?.descricao ?? null,
												);
											}}
										>
											<SelectTrigger
												id="idbandeira"
												aria-invalid={!!errors.idbandeira}
											>
												<SelectValue placeholder="Selecione a bandeira" />
											</SelectTrigger>
											<SelectContent>
												{opcoesBandeira.map((bandeira) => (
													<SelectItem
														key={bandeira.value}
														value={bandeira.value}
													>
														{bandeira.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FieldError
									errors={errors.idbandeira ? [errors.idbandeira] : []}
								/>
							</Field>
						</div>
					</div>
				)}

				<ApropriacaoCentroCustoField
					valorTotal={valorTotalNumerico}
					value={apropriacaoCentroCusto}
					onChange={setApropriacaoCentroCusto}
				/>

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Observações</h2>
					<Field data-invalid={!!errors.observacoes}>
						<FieldLabel htmlFor="observacoes">Observações</FieldLabel>
						<Textarea
							id="observacoes"
							placeholder="Observações adicionais"
							aria-invalid={!!errors.observacoes}
							aria-describedby={
								errors.observacoes ? "observacoes-error" : undefined
							}
							{...register("observacoes")}
							rows={4}
						/>
						<FieldError
							errors={errors.observacoes ? [errors.observacoes] : []}
						/>
					</Field>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button variant="outline" type="button" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={criarMutation.isPending || atualizarMutation.isPending}
					>
						{isEdicao
							? atualizarMutation.isPending
								? "Salvando..."
								: "Salvar (F10)"
							: criarMutation.isPending
								? "Cadastrando..."
								: "Cadastrar (F10)"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
