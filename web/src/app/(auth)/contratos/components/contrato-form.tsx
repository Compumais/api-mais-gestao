"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type ContratoFormData,
	contratoFormSchema,
} from "@/schemas/contrato.schema";
import {
	type Contrato,
	contratoService,
} from "@/services/contrato.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import { entidadesService } from "@/services/entidades.service";
import { tipoContratoService } from "@/services/tipo-contrato.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

function codigoEstaVazio(valor: unknown): boolean {
	if (valor == null) return true;
	if (typeof valor === "string") return valor.trim() === "";
	if (typeof valor === "number") return Number.isNaN(valor);
	return false;
}

type Props = {
	modo: "criar" | "editar";
	contrato?: Contrato;
};

export function ContratoForm({ modo, contrato }: Props) {
	const { empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const ultimoValorSugerido = useRef<number | null>(
		contrato?.idtipocontrato ? Number(contrato.valor) : null,
	);

	const form = useForm<ContratoFormData>({
		resolver: zodResolver(contratoFormSchema),
		defaultValues: {
			identidade: contrato?.identidade ?? "",
			idtipocontrato: contrato?.idtipocontrato ?? "",
			codigo: contrato?.codigo ?? "",
			descricao: contrato?.descricao ?? "",
			situacao: (contrato?.situacao as ContratoFormData["situacao"]) ?? "ativo",
			datainicio: contrato?.datainicio ?? "",
			datafim: contrato?.datafim ?? "",
			valor: Number(contrato?.valor ?? 0),
			periodicidade: "mensal",
			diavencimento: contrato?.diavencimento ?? 10,
			regracompetencia:
				(contrato?.regracompetencia as ContratoFormData["regracompetencia"]) ??
				"mes_atual",
			fluxofaturamento: contrato?.fluxofaturamento ?? 3,
			discriminacao: contrato?.discriminacao ?? "",
			itemlistaservico: contrato?.itemlistaservico ?? "",
			codigonbs: contrato?.codigonbs ?? "",
			codigotributacaonacional: contrato?.codigotributacaonacional ?? "",
			idcondicaopagto: contrato?.idcondicaopagto ?? "",
			idtipodocumento: contrato?.idtipodocumento ?? "",
			idplanocontas: contrato?.idplanocontas ?? "",
			idcontacorrente: contrato?.idcontacorrente ?? "",
			idtipocobranca: contrato?.idtipocobranca ?? "",
			observacao: contrato?.observacao ?? "",
		},
	});

	const fluxo = form.watch("fluxofaturamento");
	const codigoAtual = form.watch("codigo");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: modo === "criar",
		fetchFn: contratoService.buscarProximoCodigo,
		setValue: form.setValue,
		valorCodigoAtual: codigoAtual,
	});

	const { data: clientes = [], isLoading: carregandoClientes } = useQuery({
		queryKey: ["entidades-clientes-contrato", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa!.id,
				cliente: 1,
			}),
	});

	const { data: tiposContrato = [], isLoading: carregandoTipos } = useQuery({
		queryKey: ["tipos-contrato", empresa?.id, "form"],
		enabled: Boolean(empresa?.id),
		queryFn: () => tipoContratoService.listarTodos({ idempresa: empresa!.id }),
	});

	const { data: tiposDoc } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({ idempresa: empresa!.id }),
	});

	const { data: contas } = useQuery({
		queryKey: ["contas-correntes", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			contasCorrentesService.listar({ idempresa: empresa!.id, limit: 100 }),
	});

	const opcoesClientes = useMemo(
		() =>
			clientes.map((c) => ({
				value: c.id,
				label: `${c.razaosocial || c.nome}${c.cnpjcpf ? ` — ${c.cnpjcpf}` : ""}`,
			})),
		[clientes],
	);

	const opcoesTiposContrato = useMemo(
		() =>
			tiposContrato.map((t) => ({
				value: t.id,
				label: `${t.codigo} - ${t.descricao} (${Number(t.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
			})),
		[tiposContrato],
	);

	const aplicarTipoContrato = (idTipo: string) => {
		form.setValue("idtipocontrato", idTipo || null);
		const tipo = tiposContrato.find((t) => t.id === idTipo);
		if (!tipo) return;

		const valorAtual = Number(form.getValues("valor") || 0);
		const sugerido = Number(tipo.valor);
		const podeSubstituir =
			!valorAtual ||
			ultimoValorSugerido.current === null ||
			valorAtual === ultimoValorSugerido.current;

		if (podeSubstituir) {
			form.setValue("valor", sugerido);
			ultimoValorSugerido.current = sugerido;
		}
	};

	const { onBlur: onBlurCodigo, ...codigoRegister } = form.register("codigo");

	const preencherCodigoSeVazio = async () => {
		if (modo !== "criar" || !empresa?.id) return;
		if (!codigoEstaVazio(form.getValues("codigo"))) return;
		try {
			const { codigo: proximo } = await contratoService.buscarProximoCodigo(
				empresa.id,
			);
			form.setValue("codigo", proximo, { shouldValidate: true });
		} catch {
			// validação do formulário cobre
		}
	};

	const mutation = useMutation({
		mutationFn: async (values: ContratoFormData) => {
			if (!empresa?.id) throw new Error("Empresa não selecionada");
			const payload = {
				...values,
				idempresa: empresa.id,
				idtipocontrato: values.idtipocontrato || null,
				codigo: values.codigo || null,
				datafim: values.datafim || null,
				discriminacao: values.discriminacao || null,
				itemlistaservico: values.itemlistaservico || null,
				codigonbs: values.codigonbs || null,
				codigotributacaonacional: values.codigotributacaonacional || null,
				idcondicaopagto: values.idcondicaopagto || null,
				idplanocontas: values.idplanocontas || null,
				idcontacorrente: values.idcontacorrente || null,
				idtipocobranca: values.idtipocobranca || null,
				observacao: values.observacao || null,
			};
			if (modo === "criar") {
				return contratoService.criar(payload);
			}
			return contratoService.atualizar(contrato!.id, payload);
		},
		onSuccess: () => {
			toast.success(
				modo === "criar" ? "Contrato criado" : "Contrato atualizado",
			);
			queryClient.invalidateQueries({ queryKey: ["contratos"] });
			router.push("/contratos");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao salvar contrato");
		},
	});

	return (
		<form
			className="grid gap-4 md:grid-cols-2"
			onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
		>
			<div className="space-y-2 md:col-span-2">
				<Label>Cliente</Label>
				<Controller
					control={form.control}
					name="identidade"
					render={({ field }) => (
						<Combobox
							options={opcoesClientes}
							value={field.value}
							onChange={(v) => field.onChange(v || "")}
							placeholder={
								carregandoClientes
									? "Carregando clientes..."
									: "Buscar cliente cadastrado..."
							}
							searchPlaceholder="Buscar por nome ou CNPJ/CPF..."
							emptyMessage="Nenhum cliente cadastrado encontrado."
							disabled={carregandoClientes}
						/>
					)}
				/>
				{form.formState.errors.identidade && (
					<p className="text-sm text-destructive">
						{form.formState.errors.identidade.message}
					</p>
				)}
			</div>

			<div className="space-y-2 md:col-span-2">
				<Label>Tipo de contrato</Label>
				<Controller
					control={form.control}
					name="idtipocontrato"
					render={({ field }) => (
						<Combobox
							options={opcoesTiposContrato}
							value={field.value ?? ""}
							onChange={(v) => aplicarTipoContrato(v || "")}
							placeholder={
								carregandoTipos
									? "Carregando tipos..."
									: "Selecione o tipo (sugere o valor)"
							}
							searchPlaceholder="Buscar tipo de contrato..."
							emptyMessage="Cadastre um tipo de contrato primeiro."
							disabled={carregandoTipos}
							allowEmpty
							emptyLabel="Sem tipo"
						/>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label>Código</Label>
				<Input
					{...codigoRegister}
					onBlur={async (e) => {
						onBlurCodigo(e);
						await preencherCodigoSeVazio();
					}}
				/>
				<p className="text-xs text-muted-foreground">
					Se vazio, preenche com o próximo código ao sair do campo.
				</p>
			</div>
			<div className="space-y-2">
				<Label>Descrição</Label>
				<Input {...form.register("descricao")} />
			</div>
			<div className="space-y-2">
				<Label>Situação</Label>
				<Select
					value={form.watch("situacao")}
					onValueChange={(v) =>
						form.setValue("situacao", v as ContratoFormData["situacao"])
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ativo">Ativo</SelectItem>
						<SelectItem value="suspenso">Suspenso</SelectItem>
						<SelectItem value="encerrado">Encerrado</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Fluxo de faturamento</Label>
				<Select
					value={String(form.watch("fluxofaturamento"))}
					onValueChange={(v) => form.setValue("fluxofaturamento", Number(v))}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1">1 - NFS-e → CR → Boleto → Remessa</SelectItem>
						<SelectItem value="2">2 - CR → Boleto → Remessa</SelectItem>
						<SelectItem value="3">3 - Somente Contas a Receber</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Início</Label>
				<Input type="date" {...form.register("datainicio")} />
			</div>
			<div className="space-y-2">
				<Label>Fim</Label>
				<Input type="date" {...form.register("datafim")} />
			</div>
			<div className="space-y-2">
				<Label>Valor do contrato</Label>
				<Input type="number" step="0.01" {...form.register("valor")} />
				<p className="text-xs text-muted-foreground">
					Pode ser diferente do valor sugerido pelo tipo.
				</p>
			</div>
			<div className="space-y-2">
				<Label>Dia vencimento</Label>
				<Input type="number" {...form.register("diavencimento")} />
			</div>
			<div className="space-y-2">
				<Label>Regra competência</Label>
				<Select
					value={form.watch("regracompetencia")}
					onValueChange={(v) =>
						form.setValue(
							"regracompetencia",
							v as ContratoFormData["regracompetencia"],
						)
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="mes_atual">Mês atual</SelectItem>
						<SelectItem value="mes_seguinte">Mês seguinte</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Tipo documento</Label>
				<Select
					value={form.watch("idtipodocumento")}
					onValueChange={(v) => form.setValue("idtipodocumento", v)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Selecione" />
					</SelectTrigger>
					<SelectContent>
						{(tiposDoc ?? []).map((t) => (
							<SelectItem key={t.id} value={t.id}>
								{t.descricao}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{(fluxo === 1 || fluxo === 2) && (
				<div className="space-y-2">
					<Label>Conta corrente cobrança</Label>
					<Select
						value={form.watch("idcontacorrente") ?? ""}
						onValueChange={(v) => form.setValue("idcontacorrente", v)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecione" />
						</SelectTrigger>
						<SelectContent>
							{(contas?.data ?? []).map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.descricao || c.numeroconta}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			{fluxo === 1 && (
				<>
					<div className="space-y-2">
						<Label>Item LC116</Label>
						<Input {...form.register("itemlistaservico")} />
					</div>
					<div className="space-y-2 md:col-span-2">
						<Label>Discriminação</Label>
						<Textarea {...form.register("discriminacao")} />
					</div>
				</>
			)}
			<div className="md:col-span-2 flex gap-2 justify-end">
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancelar
				</Button>
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Salvando..." : "Salvar"}
				</Button>
			</div>
		</form>
	);
}
