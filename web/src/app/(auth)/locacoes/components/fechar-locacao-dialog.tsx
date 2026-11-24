"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatarDataBr, formatarMoeda } from "@/lib/locacao-calculo";
import {
	type FecharLocacaoFormData,
	fecharLocacaoSchema,
} from "@/schemas/locacao.schema";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import {
	locacaoService,
	type PreviaFechamentoLocacao,
} from "@/services/locacao.service";
import { planoContasService } from "@/services/plano-contas.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

type Props = {
	locacaoId: string;
	aberto: boolean;
	onFechar: () => void;
	onConcluido: () => void;
};

function hojeIso() {
	const data = new Date();
	const mes = String(data.getMonth() + 1).padStart(2, "0");
	const dia = String(data.getDate()).padStart(2, "0");
	return `${data.getFullYear()}-${mes}-${dia}`;
}

export function FecharLocacaoDialog({
	locacaoId,
	aberto,
	onFechar,
	onConcluido,
}: Props) {
	const { empresa } = useEmpresa();
	const form = useForm<FecharLocacaoFormData>({
		resolver: zodResolver(fecharLocacaoSchema),
		defaultValues: {
			datadevolucao: hojeIso(),
			formapagamento: "prazo",
			idplanocontas: "",
			idtipodocumento: "",
			vencimento: hojeIso(),
			idcontacorrente: "",
		},
	});

	const datadevolucao = form.watch("datadevolucao");
	const formapagamento = form.watch("formapagamento");

	const previa = useQuery({
		queryKey: ["locacao-previa", locacaoId, datadevolucao, empresa?.id],
		enabled: aberto && Boolean(empresa?.id && datadevolucao),
		queryFn: () =>
			locacaoService.preverFechamento(locacaoId, {
				idempresa: empresa!.id,
				datadevolucao,
			}),
	});

	const { data: planos } = useQuery({
		queryKey: ["plano-contas-locacao", empresa?.id],
		enabled: aberto && Boolean(empresa?.id),
		queryFn: () =>
			planoContasService.listar({
				idempresa: empresa!.id,
				listarTudo: true,
				tipomovimento: "E",
				limit: 200,
			}),
	});

	const { data: tipos } = useQuery({
		queryKey: ["tipos-documento-locacao", empresa?.id],
		enabled: aberto && Boolean(empresa?.id),
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({ idempresa: empresa!.id }),
	});

	const { data: contas } = useQuery({
		queryKey: ["contas-correntes-locacao", empresa?.id],
		enabled: aberto && Boolean(empresa?.id),
		queryFn: () =>
			contasCorrentesService.listar({ idempresa: empresa!.id, limit: 100 }),
	});

	useEffect(() => {
		if (!aberto) form.reset({ ...form.getValues(), datadevolucao: hojeIso() });
	}, [aberto, form]);

	const fechar = useMutation({
		mutationFn: (dados: FecharLocacaoFormData) =>
			locacaoService.fechar(locacaoId, {
				idempresa: empresa!.id,
				datadevolucao: dados.datadevolucao,
				formapagamento: dados.formapagamento,
				idplanocontas: dados.idplanocontas,
				idtipodocumento: dados.idtipodocumento || null,
				vencimento: dados.vencimento || null,
				idcontacorrente: dados.idcontacorrente || null,
			}),
		onSuccess: () => onConcluido(),
	});

	const resumo: PreviaFechamentoLocacao | undefined = previa.data;

	return (
		<Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Fechar locação</DialogTitle>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={form.handleSubmit((dados) => fechar.mutate(dados))}
				>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="datadevolucao">Devolução</Label>
							<Input
								id="datadevolucao"
								type="date"
								{...form.register("datadevolucao")}
							/>
						</div>
						<div>
							<Label>Forma</Label>
							<Controller
								control={form.control}
								name="formapagamento"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="prazo">
												A prazo — conta a receber
											</SelectItem>
											<SelectItem value="avista">
												À vista — caixa ou conta
											</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="md:col-span-2">
							<Label>Plano de contas</Label>
							<Controller
								control={form.control}
								name="idplanocontas"
								render={({ field }) => (
									<Combobox
										value={field.value}
										onChange={field.onChange}
										options={(planos?.data ?? []).map((plano) => ({
											value: plano.id,
											label: `${plano.codigo ?? ""} ${plano.nome ?? ""}`.trim(),
										}))}
										placeholder="Plano de contas"
									/>
								)}
							/>
							{form.formState.errors.idplanocontas && (
								<p className="text-sm text-destructive">
									{form.formState.errors.idplanocontas.message}
								</p>
							)}
						</div>
						{formapagamento === "prazo" ? (
							<>
								<div>
									<Label>Tipo de documento</Label>
									<Controller
										control={form.control}
										name="idtipodocumento"
										render={({ field }) => (
											<Combobox
												value={field.value}
												onChange={field.onChange}
												options={(tipos ?? []).map((tipo) => ({
													value: tipo.id,
													label: tipo.descricao,
												}))}
												placeholder="Tipo de documento"
											/>
										)}
									/>
								</div>
								<div>
									<Label htmlFor="vencimento">Vencimento</Label>
									<Input
										id="vencimento"
										type="date"
										{...form.register("vencimento")}
									/>
								</div>
							</>
						) : (
							<div className="md:col-span-2">
								<Label>Caixa ou conta corrente</Label>
								<Controller
									control={form.control}
									name="idcontacorrente"
									render={({ field }) => (
										<Combobox
											value={field.value}
											onChange={field.onChange}
											options={(contas?.data ?? []).map((conta) => ({
												value: conta.id,
												label: conta.descricao || conta.numeroconta || conta.id,
											}))}
											placeholder="Conta"
										/>
									)}
								/>
							</div>
						)}
					</div>

					{previa.isError && (
						<p className="text-sm text-destructive">
							{(previa.error as Error).message}
						</p>
					)}
					{resumo && (
						<div className="rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Equipamento</TableHead>
										<TableHead>Prevista</TableHead>
										<TableHead>Atraso</TableHead>
										<TableHead>Período</TableHead>
										<TableHead>Diárias</TableHead>
										<TableHead>Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{resumo.itens.map((item) => (
										<TableRow key={item.id}>
											<TableCell>
												{item.codigoequipamento} - {item.descricaoequipamento}
											</TableCell>
											<TableCell>{formatarDataBr(item.dataprevista)}</TableCell>
											<TableCell>{item.diasatraso}</TableCell>
											<TableCell>{formatarMoeda(item.valorperiodo)}</TableCell>
											<TableCell>{formatarMoeda(item.valormora)}</TableCell>
											<TableCell>{formatarMoeda(item.valortotal)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<p className="p-3 text-sm">
								Período {formatarMoeda(resumo.valorperiodo)} + diárias{" "}
								{formatarMoeda(resumo.valormora)} ={" "}
								<strong>{formatarMoeda(resumo.valortotal)}</strong>
							</p>
						</div>
					)}
					{fechar.isError && (
						<p className="text-sm text-destructive">
							{(fechar.error as Error).message}
						</p>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onFechar}>
							Cancelar
						</Button>
						<Button type="submit" disabled={fechar.isPending || previa.isError}>
							Confirmar fechamento
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
