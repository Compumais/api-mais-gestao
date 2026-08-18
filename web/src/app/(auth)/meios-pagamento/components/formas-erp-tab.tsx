"use client";

import { IconPencil } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import {
	type TipoDocumentoFinanceiro,
	tipoDocumentoFinanceiroService,
} from "@/services/tipo-documento-financeiro.service";

const FORMAS_NFE = [
	{ codigo: "01", descricao: "Dinheiro" },
	{ codigo: "02", descricao: "Cheque" },
	{ codigo: "03", descricao: "Cartão de crédito" },
	{ codigo: "04", descricao: "Cartão de débito" },
	{ codigo: "15", descricao: "Boleto" },
	{ codigo: "17", descricao: "PIX" },
	{ codigo: "99", descricao: "Crediário / outros" },
];

type DestinoFinanceiroForma = "caixa" | "recebivel" | "contas_receber";

function destinoDaForma(
	forma: TipoDocumentoFinanceiro,
): DestinoFinanceiroForma {
	if (forma.aprazo === 1) return "contas_receber";
	if (forma.integracaixabanco === 1) return "caixa";
	return "recebivel";
}

function flagsDoDestino(destino: DestinoFinanceiroForma): {
	aprazo: number;
	integracaixabanco: number;
} {
	if (destino === "caixa") {
		return { aprazo: 0, integracaixabanco: 1 };
	}
	if (destino === "contas_receber") {
		return { aprazo: 1, integracaixabanco: 0 };
	}
	return { aprazo: 0, integracaixabanco: 0 };
}

function rotuloDestino(destino: DestinoFinanceiroForma): string {
	if (destino === "caixa") return "Caixa (à vista)";
	if (destino === "contas_receber") return "Contas a receber (cliente)";
	return "Contas a receber (cartão/operadora)";
}

const FORMULARIO_VAZIO = {
	descricao: "",
	formaNfe: "01",
	destino: "caixa" as DestinoFinanceiroForma,
	prazoDias: "0",
};

export function FormasErpTab() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [idEdicao, setIdEdicao] = useState<string | null>(null);
	const [descricao, setDescricao] = useState(FORMULARIO_VAZIO.descricao);
	const [formaNfe, setFormaNfe] = useState(FORMULARIO_VAZIO.formaNfe);
	const [destino, setDestino] = useState<DestinoFinanceiroForma>(
		FORMULARIO_VAZIO.destino,
	);
	const [prazoDias, setPrazoDias] = useState(FORMULARIO_VAZIO.prazoDias);

	const { data: formas = [], isLoading } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	function resetarFormulario() {
		setIdEdicao(null);
		setDescricao(FORMULARIO_VAZIO.descricao);
		setFormaNfe(FORMULARIO_VAZIO.formaNfe);
		setDestino(FORMULARIO_VAZIO.destino);
		setPrazoDias(FORMULARIO_VAZIO.prazoDias);
	}

	function abrirNova() {
		resetarFormulario();
		setModalAberto(true);
	}

	function abrirEdicao(forma: TipoDocumentoFinanceiro) {
		setIdEdicao(forma.id);
		setDescricao(forma.descricao);
		setFormaNfe(forma.formapagamentonfe || "99");
		setDestino(destinoDaForma(forma));
		setPrazoDias(String(forma.prazodias ?? 0));
		setModalAberto(true);
	}

	function aoMudarDestino(valor: DestinoFinanceiroForma) {
		setDestino(valor);
		if (valor === "caixa") {
			setPrazoDias("0");
			return;
		}
		if (!Number(prazoDias)) {
			setPrazoDias(valor === "recebivel" && formaNfe === "04" ? "1" : "30");
		}
	}

	const { mutate: popularPadrao, isPending: populando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.popularPadrao(empresa.id);
		},
		onSuccess: (criados) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			toast.success(
				criados.length > 0
					? `${criados.length} forma(s) padrão criada(s)`
					: "Formas padrão já existiam",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar padrões",
			);
		},
	});

	const { mutate: salvarForma, isPending: salvando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const flags = flagsDoDestino(destino);
			const prazo =
				destino === "caixa" ? null : Math.max(0, Number(prazoDias) || 0);
			const dados = {
				descricao: descricao.trim(),
				formapagamentonfe: formaNfe,
				...flags,
				prazodias: prazo,
			};
			if (idEdicao) {
				return tipoDocumentoFinanceiroService.atualizar(idEdicao, dados);
			}
			return tipoDocumentoFinanceiroService.criar({
				idempresa: empresa.id,
				...dados,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			setModalAberto(false);
			resetarFormulario();
			toast.success(
				idEdicao ? "Forma atualizada" : "Forma de pagamento criada",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao salvar forma",
			);
		},
	});

	if (!empresa) {
		return (
			<p className="px-4 text-muted-foreground">
				Selecione uma empresa para visualizar as formas de pagamento.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2 px-4">
				<Button
					variant="outline"
					onClick={() => popularPadrao()}
					disabled={populando}
				>
					{populando ? "Criando..." : "Criar formas padrão"}
				</Button>
				<Button onClick={abrirNova}>Nova forma ERP</Button>
			</div>

			<p className="px-4 text-sm text-muted-foreground">
				O cupom do PDV só gera contas a receber quando a forma estiver marcada
				como contas a receber. Dinheiro e PIX ficam no caixa; cartão de crédito,
				cheque e crediário podem gerar título — inclusive com prazo diferente
				por bandeira (cadastre uma forma para cada bandeira, ex.: Visa crédito).
			</p>

			<div className="rounded-lg border bg-card mx-4">
				{isLoading ? (
					<TableSkeleton rows={6}>
						<TableHead>Descrição</TableHead>
						<TableHead>NF-e</TableHead>
						<TableHead>Destino</TableHead>
						<TableHead>Prazo</TableHead>
						<TableHead className="w-12" />
					</TableSkeleton>
				) : formas.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
						<p>Nenhuma forma ERP cadastrada.</p>
						<Button variant="outline" onClick={() => popularPadrao()}>
							Criar Dinheiro, PIX, Cartão, Cheque e Boleto
						</Button>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Descrição</TableHead>
								<TableHead>Cód. NF-e</TableHead>
								<TableHead>Destino financeiro</TableHead>
								<TableHead>Prazo (dias)</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{formas.map((forma) => {
								const destinoForma = destinoDaForma(forma);
								return (
									<TableRow key={forma.id}>
										<TableCell className="font-medium">
											{forma.descricao}
										</TableCell>
										<TableCell>{forma.formapagamentonfe ?? "—"}</TableCell>
										<TableCell>
											<Badge
												variant={
													destinoForma === "caixa" ? "secondary" : "default"
												}
											>
												{rotuloDestino(destinoForma)}
											</Badge>
										</TableCell>
										<TableCell>
											{destinoForma === "caixa" ? "—" : (forma.prazodias ?? 0)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												aria-label={`Editar ${forma.descricao}`}
												onClick={() => abrirEdicao(forma)}
											>
												<IconPencil className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</div>

			<Dialog
				open={modalAberto}
				onOpenChange={(aberto) => {
					setModalAberto(aberto);
					if (!aberto) resetarFormulario();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{idEdicao
								? "Editar forma de pagamento"
								: "Nova forma de pagamento (ERP)"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<Field>
							<FieldLabel>Descrição</FieldLabel>
							<Input
								value={descricao}
								onChange={(event) => setDescricao(event.target.value)}
								maxLength={50}
								placeholder="Visa crédito"
							/>
						</Field>
						<Field>
							<FieldLabel>Forma NF-e (tPag)</FieldLabel>
							<Select value={formaNfe} onValueChange={setFormaNfe}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FORMAS_NFE.map((forma) => (
										<SelectItem key={forma.codigo} value={forma.codigo}>
											{forma.codigo} — {forma.descricao}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel>Gera contas a receber?</FieldLabel>
							<Select
								value={destino}
								onValueChange={(valor) =>
									aoMudarDestino(valor as DestinoFinanceiroForma)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="caixa">
										Não — caixa imediato (dinheiro, PIX, débito)
									</SelectItem>
									<SelectItem value="recebivel">
										Sim — recebível de cartão/operadora (sem cliente)
									</SelectItem>
									<SelectItem value="contas_receber">
										Sim — contas a receber do cliente (cheque, crediário)
									</SelectItem>
								</SelectContent>
							</Select>
						</Field>
						{destino !== "caixa" ? (
							<Field>
								<FieldLabel>Prazo (dias)</FieldLabel>
								<Input
									type="number"
									min={0}
									value={prazoDias}
									onChange={(event) => setPrazoDias(event.target.value)}
								/>
							</Field>
						) : null}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setModalAberto(false);
								resetarFormulario();
							}}
						>
							Cancelar
						</Button>
						<Button
							onClick={() => salvarForma()}
							disabled={salvando || !descricao.trim()}
						>
							{salvando ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
