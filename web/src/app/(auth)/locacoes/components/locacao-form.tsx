"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
	calcularDataPrevistaLocacao,
	formatarDataBr,
	formatarMoeda,
	PERIODOS_LOCACAO,
	type PeriodoLocacao,
	ROTULO_PERIODO_LOCACAO,
} from "@/lib/locacao-calculo";
import { maskCep } from "@/lib/masks";
import {
	type LocacaoFormData,
	locacaoFormSchema,
} from "@/schemas/locacao.schema";
import { type Entidade, entidadesService } from "@/services/entidades.service";
import {
	type Equipamento,
	equipamentoService,
} from "@/services/equipamento.service";
import { type Locacao, locacaoService } from "@/services/locacao.service";
import { localidadesService } from "@/services/localidades.service";

const PRECO_POR_PERIODO: Record<PeriodoLocacao, keyof Equipamento> = {
	diaria: "precodiaria",
	semanal: "precosemanal",
	quinzenal: "precoquinzenal",
	mensal: "precomensal",
};

type Props = {
	modo: "criar" | "editar";
	locacao?: Locacao;
};

export function LocacaoForm({ modo, locacao }: Props) {
	const { empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const ultimoCep = useRef<string | null>(null);

	const form = useForm<LocacaoFormData>({
		resolver: zodResolver(locacaoFormSchema),
		defaultValues: {
			identidade: locacao?.identidade ?? "",
			codigo: locacao?.codigo ?? "",
			datainicio: locacao?.datainicio?.slice(0, 10) ?? "",
			cep: locacao?.cep ?? "",
			endereco: locacao?.endereco ?? "",
			numeroendereco: locacao?.numeroendereco ?? "",
			complemento: locacao?.complemento ?? "",
			bairro: locacao?.bairro ?? "",
			idestado: locacao?.idestado ?? "",
			idcidade: locacao?.idcidade ?? "",
			observacao: locacao?.observacao ?? "",
			itens: locacao?.itens?.map((item) => ({
				idequipamento: item.idequipamento,
				periodo: item.periodo,
				quantidade: item.quantidade,
			})) ?? [{ idequipamento: "", periodo: "mensal", quantidade: 1 }],
		},
	});

	const itens = useFieldArray({ control: form.control, name: "itens" });
	const identidade = form.watch("identidade");
	const datainicio = form.watch("datainicio");
	const idestado = form.watch("idestado");
	const cep = form.watch("cep");
	const linhas = form.watch("itens");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: modo === "criar",
		fetchFn: locacaoService.buscarProximoCodigo,
		setValue: form.setValue,
		valorCodigoAtual: form.watch("codigo"),
	});

	const { data: clientes = [] } = useQuery({
		queryKey: ["entidades-clientes-locacao", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			entidadesService.listarTodos({ idempresa: empresa!.id, cliente: 1 }),
	});

	const { data: equipamentos = [] } = useQuery({
		queryKey: ["equipamentos-locacao", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () => equipamentoService.listarTodos({ idempresa: empresa!.id }),
	});

	const { data: estados } = useQuery({
		queryKey: ["estados"],
		queryFn: () => localidadesService.listarEstados(),
	});

	const { data: municipios } = useQuery({
		queryKey: ["municipios", idestado],
		enabled: Boolean(idestado),
		queryFn: () => localidadesService.listarMunicipios(idestado as string),
	});

	const idsDaLocacao = useMemo(
		() => new Set(locacao?.itens?.map((item) => item.idequipamento) ?? []),
		[locacao?.itens],
	);

	const equipamentosOpcao = useMemo(
		() =>
			equipamentos.filter(
				(item) => item.situacao === "disponivel" || idsDaLocacao.has(item.id),
			),
		[equipamentos, idsDaLocacao],
	);

	const copiarEnderecoCliente = useCallback(
		(cliente?: Entidade) => {
			const origem =
				cliente ??
				clientes.find((item) => item.id === form.getValues("identidade"));
			if (!origem) return;
			form.setValue("cep", origem.cep ?? "");
			form.setValue("endereco", origem.endereco ?? "");
			form.setValue("numeroendereco", origem.numeroendereco ?? "");
			form.setValue("complemento", origem.complemento ?? "");
			form.setValue("bairro", origem.bairro ?? "");
			form.setValue("idestado", origem.idestado ?? "");
			form.setValue("idcidade", origem.idcidade ?? "");
			ultimoCep.current = (origem.cep ?? "").replace(/\D/g, "");
		},
		[clientes, form],
	);

	const clienteAnterior = useRef(
		modo === "editar" ? (locacao?.identidade ?? "") : "",
	);
	useEffect(() => {
		if (modo === "editar" && identidade === locacao?.identidade) return;
		if (!identidade) return;
		const cliente = clientes.find((item) => item.id === identidade);
		if (!cliente || clienteAnterior.current === identidade) return;
		clienteAnterior.current = identidade;
		copiarEnderecoCliente(cliente);
	}, [identidade, clientes, copiarEnderecoCliente, locacao?.identidade, modo]);

	useEffect(() => {
		const cepLimpo = (cep ?? "").replace(/\D/g, "");
		if (cepLimpo.length !== 8 || ultimoCep.current === cepLimpo) return;
		ultimoCep.current = cepLimpo;
		void localidadesService
			.buscarEnderecoPorCep(cepLimpo)
			.then((endereco) => {
				if (endereco.endereco) form.setValue("endereco", endereco.endereco);
				if (endereco.bairro) form.setValue("bairro", endereco.bairro);
				if (endereco.idestado) form.setValue("idestado", endereco.idestado);
				if (endereco.idcidade) form.setValue("idcidade", endereco.idcidade);
			})
			.catch(() => {
				toast.error("CEP não encontrado");
				ultimoCep.current = null;
			});
	}, [cep, form]);

	const salvar = useMutation({
		mutationFn: (dados: LocacaoFormData) => {
			const payload = {
				idempresa: empresa!.id,
				identidade: dados.identidade,
				codigo: dados.codigo,
				datainicio: dados.datainicio,
				cep: dados.cep || null,
				endereco: dados.endereco || null,
				numeroendereco: dados.numeroendereco || null,
				complemento: dados.complemento || null,
				bairro: dados.bairro || null,
				idestado: dados.idestado || null,
				idcidade: dados.idcidade || null,
				observacao: dados.observacao || null,
				itens: dados.itens,
			};
			return modo === "criar"
				? locacaoService.criar(payload)
				: locacaoService.atualizar(locacao!.id, payload);
		},
		onSuccess: (registro) => {
			toast.success(modo === "criar" ? "Locação aberta" : "Locação atualizada");
			queryClient.invalidateQueries({ queryKey: ["locacoes"] });
			queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
			router.push(`/locacoes/${registro.id}`);
		},
		onError: (erro: Error) => toast.error(erro.message || "Falha ao salvar"),
	});

	return (
		<form
			className="grid gap-4"
			onSubmit={form.handleSubmit((dados) => salvar.mutate(dados))}
		>
			<div className="grid gap-4 md:grid-cols-3">
				<div>
					<Label>Cliente</Label>
					<Controller
						control={form.control}
						name="identidade"
						render={({ field }) => (
							<Combobox
								value={field.value}
								onChange={field.onChange}
								options={clientes.map((cliente) => ({
									value: cliente.id,
									label: cliente.razaosocial || cliente.nome,
								}))}
								placeholder="Selecione o cliente"
							/>
						)}
					/>
					{form.formState.errors.identidade && (
						<p className="text-sm text-destructive">
							{form.formState.errors.identidade.message}
						</p>
					)}
				</div>
				<div>
					<Label htmlFor="codigo">Código</Label>
					<Input id="codigo" {...form.register("codigo")} />
				</div>
				<div>
					<Label htmlFor="datainicio">Início</Label>
					<Input id="datainicio" type="date" {...form.register("datainicio")} />
				</div>
			</div>

			<div className="flex items-center justify-between">
				<h2 className="font-semibold">Endereço de alocação</h2>
				<Button
					type="button"
					variant="outline"
					onClick={() => copiarEnderecoCliente()}
				>
					Copiar endereço do cliente
				</Button>
			</div>
			<div className="grid gap-4 md:grid-cols-4">
				<div>
					<Label htmlFor="cep">CEP</Label>
					<Input
						id="cep"
						value={maskCep(cep)}
						onChange={(evento) =>
							form.setValue("cep", maskCep(evento.target.value))
						}
					/>
				</div>
				<div className="md:col-span-2">
					<Label htmlFor="endereco">Logradouro</Label>
					<Input id="endereco" {...form.register("endereco")} />
				</div>
				<div>
					<Label htmlFor="numeroendereco">Número</Label>
					<Input id="numeroendereco" {...form.register("numeroendereco")} />
				</div>
				<div>
					<Label htmlFor="complemento">Complemento</Label>
					<Input id="complemento" {...form.register("complemento")} />
				</div>
				<div>
					<Label htmlFor="bairro">Bairro</Label>
					<Input id="bairro" {...form.register("bairro")} />
				</div>
				<div>
					<Label>Estado</Label>
					<Controller
						control={form.control}
						name="idestado"
						render={({ field }) => (
							<Combobox
								value={field.value}
								onChange={(valor) => {
									field.onChange(valor);
									form.setValue("idcidade", "");
								}}
								options={(estados?.data ?? []).map((estado) => ({
									value: estado.idestado,
									label: estado.nome,
								}))}
								placeholder="Estado"
								allowEmpty
							/>
						)}
					/>
				</div>
				<div>
					<Label>Cidade</Label>
					<Controller
						control={form.control}
						name="idcidade"
						render={({ field }) => (
							<Combobox
								value={field.value}
								onChange={field.onChange}
								options={(municipios?.data ?? []).map((cidade) => ({
									value: cidade.idcidade,
									label: cidade.nome,
								}))}
								placeholder="Cidade"
								allowEmpty
							/>
						)}
					/>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<h2 className="font-semibold">Equipamentos</h2>
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						itens.append({
							idequipamento: "",
							periodo: "mensal",
							quantidade: 1,
						})
					}
				>
					Adicionar
				</Button>
			</div>
			{form.formState.errors.itens?.message && (
				<p className="text-sm text-destructive">
					{form.formState.errors.itens.message}
				</p>
			)}
			<div className="grid gap-3">
				{itens.fields.map((campo, indice) => {
					const linha = linhas[indice];
					const equipamento = equipamentosOpcao.find(
						(item) => item.id === linha?.idequipamento,
					);
					const itemAtual = locacao?.itens?.find(
						(item) =>
							item.idequipamento === linha?.idequipamento &&
							item.periodo === linha?.periodo,
					);
					const precoUnitario = itemAtual
						? Number(itemAtual.valorunitario)
						: Number(
								equipamento?.[PRECO_POR_PERIODO[linha?.periodo ?? "mensal"]] ??
									0,
							);
					const prevista =
						datainicio && linha?.periodo
							? calcularDataPrevistaLocacao(
									datainicio,
									linha.periodo,
									Number(linha.quantidade) || 1,
								)
							: "";
					return (
						<div
							key={campo.id}
							className="grid gap-3 rounded-lg border p-3 md:grid-cols-6"
						>
							<div className="md:col-span-2">
								<Label>Equipamento</Label>
								<Controller
									control={form.control}
									name={`itens.${indice}.idequipamento`}
									render={({ field }) => (
										<Combobox
											value={field.value}
											onChange={field.onChange}
											options={equipamentosOpcao.map((item) => ({
												value: item.id,
												label: `${item.codigo} - ${item.descricao}`,
											}))}
											placeholder="Equipamento"
										/>
									)}
								/>
							</div>
							<div>
								<Label>Período</Label>
								<Controller
									control={form.control}
									name={`itens.${indice}.periodo`}
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PERIODOS_LOCACAO.map((periodo) => (
													<SelectItem key={periodo} value={periodo}>
														{ROTULO_PERIODO_LOCACAO[periodo]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							</div>
							<div>
								<Label>Quantidade</Label>
								<Input
									type="number"
									min={1}
									{...form.register(`itens.${indice}.quantidade`, {
										valueAsNumber: true,
									})}
								/>
							</div>
							<div className="text-sm">
								<p>Preço: {formatarMoeda(precoUnitario)}</p>
								<p>Prevista: {formatarDataBr(prevista)}</p>
								<p>
									Total:{" "}
									{formatarMoeda(
										precoUnitario * (Number(linha?.quantidade) || 0),
									)}
								</p>
							</div>
							<div className="flex items-end">
								<Button
									type="button"
									variant="outline"
									disabled={itens.fields.length === 1}
									onClick={() => itens.remove(indice)}
								>
									Remover
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			<div>
				<Label htmlFor="observacao">Observação</Label>
				<Textarea id="observacao" {...form.register("observacao")} />
			</div>
			<div className="flex gap-2">
				<Button type="submit" disabled={salvar.isPending}>
					Salvar
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/locacoes")}
				>
					Voltar
				</Button>
			</div>
		</form>
	);
}
