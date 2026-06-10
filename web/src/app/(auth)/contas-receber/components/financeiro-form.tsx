"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CriarFinanceiroFormData,
	criarFinanceiroSchema,
	type AtualizarFinanceiroFormData,
	atualizarFinanceiroSchema,
	TIPO_DOCUMENTO_OPTIONS,
} from "@/schemas/financeiro.schema";
import { bancosService } from "@/services/bancos.service";
import { entidadesService } from "@/services/entidades.service";
import {
	type AtualizarFinanceiroData,
	type CriarFinanceiroData,
	financeiroService,
} from "@/services/financeiro.service";
import { planoContasService } from "@/services/plano-contas.service";
import { useRouter } from "next/navigation";

const formatDateForInput = (date?: string | null): string => {
	if (!date) {
		return "";
	}
	try {
		const d = new Date(date);
		return d.toISOString().split("T")[0];
	} catch {
		return "";
	}
};

// Função auxiliar para mapear tipo documento string para idtipodocumentofinanceiro
// Por enquanto, vamos usar um mapeamento simples. Isso pode ser ajustado conforme necessário
const mapTipoDocumentoToId = (tipoDocumento: string): number | null => {
	// Mapeamento básico - pode ser ajustado conforme a tabela tipodocumentofinanceiro
	const mapping: Record<string, number> = {
		"Cartão crédito": 1,
		"Cartão débito": 2,
		Cheque: 3,
		"Cheque 3o": 4,
		"Cheque a vista": 5,
		Crediario: 6,
		Duplicata: 7,
		"Duplicata 3o": 8,
	};
	return mapping[tipoDocumento] || null;
};

// Função auxiliar para verificar se é tipo cheque
const isTipoCheque = (tipoDocumento: string | undefined): boolean => {
	if (!tipoDocumento) return false;
	return ["Cheque", "Cheque 3o", "Cheque a vista"].includes(tipoDocumento);
};

// Função auxiliar para verificar se é tipo cartão
const isTipoCartao = (tipoDocumento: string | undefined): boolean => {
	if (!tipoDocumento) return false;
	return ["Cartão crédito", "Cartão débito"].includes(tipoDocumento);
};

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

	const form = useForm<CriarFinanceiroFormData | AtualizarFinanceiroFormData>({
		resolver: zodResolver(
			isEdicao ? atualizarFinanceiroSchema : criarFinanceiroSchema,
		),
		defaultValues: {
			idempresa: empresa?.id || "",
			documento: "",
			pagamentoRecorrente: false,
			tipoDocumento: undefined,
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

	const tipoDocumento = watch("tipoDocumento");
	const showCamposCheque = isTipoCheque(tipoDocumento);
	const showCamposCartao = isTipoCartao(tipoDocumento);

	// Carregar dados para edição
	const { data: financeiroData, isLoading: isLoadingFinanceiro } = useQuery({
		queryKey: ["financeiro", financeiroId],
		queryFn: () => financeiroService.buscar(financeiroId!),
		enabled: isEdicao && !!financeiroId,
	});

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

	// Preencher formulário com dados existentes na edição
	useEffect(() => {
		if (isEdicao && financeiroData) {
			// Mapear tipo documento de volta (precisaria de uma função reversa)
			// Por enquanto, vamos deixar null e o usuário pode selecionar novamente
			form.reset({
				documento: financeiroData.documento || "",
				pagamentoRecorrente: false, // Não temos esse campo no banco ainda
				tipoDocumento: undefined, // Precisa mapear de idtipodocumentofinanceiro
				meses: null,
				tipoCobranca: financeiroData.idtipocobranca || null,
				entrada: formatDateForInput(financeiroData.entrada),
				referencia: formatDateForInput(financeiroData.datareferencia),
				emissao: formatDateForInput(financeiroData.emissao),
				vencimento: formatDateForInput(financeiroData.vencimento),
				idbanco: financeiroData.idbanco || undefined,
				identidade: financeiroData.identidade || undefined,
				idplanocontas: financeiroData.idcodigocontabil?.toString() || undefined,
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
				idadministradora: financeiroData.idadministradora || null,
				idbandeira: financeiroData.idbandeira || null,
			});
		} else if (valoresIniciais) {
			form.reset({
				...form.getValues(),
				...valoresIniciais,
				idempresa: valoresIniciais.idempresa || empresa?.id || "",
			});
		}
	}, [isEdicao, financeiroData, valoresIniciais, empresa?.id, form]);

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

			const payload: CriarFinanceiroData = {
				idempresa: empresa.id,
				identidade: data.identidade || null,
				tipo: data.tipo || tipo,
				documento: data.documento || null,
				idtipodocumentofinanceiro: data.tipoDocumento
					? mapTipoDocumentoToId(data.tipoDocumento)
					: null,
				emissao: data.emissao || null,
				vencimento: data.vencimento || null,
				entrada: data.entrada || null,
				datareferencia: data.referencia || null,
				idbanco: data.idbanco ?? null,
				idcodigocontabil: data.idplanocontas
					? Number(data.idplanocontas)
					: null,
				valor: data.valor || "0.00",
				saldo: data.valor || "0.00",
				historico: data.observacoes || null,
				idtipocobranca: data.tipoCobranca || null,
				idportador: data.idportador || null,
				iddependente: data.iddependente || null,
				status: "A", // Aberto por padrão
				// Campos condicionais para cheque
				agencia: showCamposCheque ? data.agencia || null : null,
				numerocontacorrente: showCamposCheque ? data.conta || null : null,
				emitente: showCamposCheque ? data.emitente || null : null,
				cnpjcpfemitente: showCamposCheque ? data.cnpjcpfemitente || null : null,
				// Campos condicionais para cartão
				nomeadministradora: showCamposCartao
					? data.nomeadministradora || null
					: null,
				idadministradora: showCamposCartao
					? data.idadministradora || null
					: null,
				nomebandeira: showCamposCartao ? data.nomebandeira || null : null,
				idbandeira: showCamposCartao ? data.idbandeira || null : null,
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

			const payload: AtualizarFinanceiroData = {
				identidade: data.identidade || null,
				documento: data.documento || null,
				idtipodocumentofinanceiro: data.tipoDocumento
					? mapTipoDocumentoToId(data.tipoDocumento)
					: null,
				emissao: data.emissao || null,
				vencimento: data.vencimento || null,
				entrada: data.entrada || null,
				datareferencia: data.referencia || null,
				idbanco: data.idbanco ?? null,
				idcodigocontabil: data.idplanocontas
					? Number(data.idplanocontas)
					: null,
				valor: data.valor || undefined,
				saldo: data.valor || undefined,
				historico: data.observacoes || null,
				idtipocobranca: data.tipoCobranca || null,
				idportador: data.idportador || null,
				iddependente: data.iddependente || null,
				// Campos condicionais para cheque
				agencia: showCamposCheque ? data.agencia || null : null,
				numerocontacorrente: showCamposCheque ? data.conta || null : null,
				emitente: showCamposCheque ? data.emitente || null : null,
				cnpjcpfemitente: showCamposCheque ? data.cnpjcpfemitente || null : null,
				// Campos condicionais para cartão
				nomeadministradora: showCamposCartao
					? data.nomeadministradora || null
					: null,
				idadministradora: showCamposCartao
					? data.idadministradora || null
					: null,
				nomebandeira: showCamposCartao ? data.nomebandeira || null : null,
				idbandeira: showCamposCartao ? data.idbandeira || null : null,
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

						<Field data-invalid={!!errors.tipoDocumento}>
							<FieldLabel htmlFor="tipoDocumento">
								Tipo de Documento *
							</FieldLabel>
							<Select
								value={tipoDocumento || undefined}
								onValueChange={(value) =>
									setValue("tipoDocumento", value as any)
								}
							>
								<SelectTrigger
									id="tipoDocumento"
									aria-invalid={!!errors.tipoDocumento}
									aria-describedby={
										errors.tipoDocumento ? "tipoDocumento-error" : undefined
									}
								>
									<SelectValue placeholder="Selecione o tipo de documento" />
								</SelectTrigger>
								<SelectContent>
									{TIPO_DOCUMENTO_OPTIONS.map((tipo) => (
										<SelectItem key={tipo} value={tipo}>
											{tipo}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError
								errors={errors.tipoDocumento ? [errors.tipoDocumento] : []}
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
							<Input
								id="tipoCobranca"
								type="number"
								placeholder="Tipo de cobrança"
								aria-invalid={!!errors.tipoCobranca}
								aria-describedby={
									errors.tipoCobranca ? "tipoCobranca-error" : undefined
								}
								{...register("tipoCobranca", { valueAsNumber: true })}
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

				{/* Campos condicionais para Cartão */}
				{showCamposCartao && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Dados do Cartão</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field data-invalid={!!errors.nomeadministradora}>
								<FieldLabel htmlFor="nomeadministradora">
									Administradora
								</FieldLabel>
								<Input
									id="nomeadministradora"
									placeholder="Nome da administradora"
									maxLength={50}
									aria-invalid={!!errors.nomeadministradora}
									aria-describedby={
										errors.nomeadministradora
											? "nomeadministradora-error"
											: undefined
									}
									{...register("nomeadministradora")}
								/>
								<FieldError
									errors={
										errors.nomeadministradora ? [errors.nomeadministradora] : []
									}
								/>
							</Field>

							<Field data-invalid={!!errors.nomebandeira}>
								<FieldLabel htmlFor="nomebandeira">Bandeira</FieldLabel>
								<Input
									id="nomebandeira"
									placeholder="Nome da bandeira"
									maxLength={50}
									aria-invalid={!!errors.nomebandeira}
									aria-describedby={
										errors.nomebandeira ? "nomebandeira-error" : undefined
									}
									{...register("nomebandeira")}
								/>
								<FieldError
									errors={errors.nomebandeira ? [errors.nomebandeira] : []}
								/>
							</Field>

							<Field data-invalid={!!errors.idadministradora}>
								<FieldLabel htmlFor="idadministradora">
									ID Administradora
								</FieldLabel>
								<Input
									id="idadministradora"
									type="number"
									placeholder="ID da administradora"
									aria-invalid={!!errors.idadministradora}
									aria-describedby={
										errors.idadministradora
											? "idadministradora-error"
											: undefined
									}
									{...register("idadministradora", { valueAsNumber: true })}
								/>
								<FieldError
									errors={
										errors.idadministradora ? [errors.idadministradora] : []
									}
								/>
							</Field>

							<Field data-invalid={!!errors.idbandeira}>
								<FieldLabel htmlFor="idbandeira">ID Bandeira</FieldLabel>
								<Input
									id="idbandeira"
									type="number"
									placeholder="ID da bandeira"
									aria-invalid={!!errors.idbandeira}
									aria-describedby={
										errors.idbandeira ? "idbandeira-error" : undefined
									}
									{...register("idbandeira", { valueAsNumber: true })}
								/>
								<FieldError
									errors={errors.idbandeira ? [errors.idbandeira] : []}
								/>
							</Field>
						</div>
					</div>
				)}

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
