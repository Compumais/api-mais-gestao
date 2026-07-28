"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useExcluirLoteOrdemServico,
	useOrdemServicoLotes,
	useSalvarLoteOrdemServico,
} from "@/hooks/use-ordem-servico";
import type { OrdemServicoItemLote } from "@/services/ordem-servico.service";
import { formatarDataOs } from "@/util/ordem-servico-ui";

type ModalLotesItemOsProps = {
	open: boolean;
	onClose: () => void;
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	desabilitado?: boolean;
};

export function ModalLotesItemOs({
	open,
	onClose,
	ordemServicoId,
	itemId,
	idempresa,
	desabilitado = false,
}: ModalLotesItemOsProps) {
	const idBase = useId();
	const idCodigo = `${idBase}-codigo`;
	const idQtd = `${idBase}-qtd`;
	const idVenc = `${idBase}-venc`;
	const idData = `${idBase}-data`;
	const idEmissao = `${idBase}-emissao`;
	const { data: lotes = [], isLoading } = useOrdemServicoLotes(
		open ? ordemServicoId : null,
		open ? itemId : null,
		open ? idempresa : null,
	);
	const salvar = useSalvarLoteOrdemServico(ordemServicoId, itemId);
	const excluir = useExcluirLoteOrdemServico(ordemServicoId, itemId);

	const [editando, setEditando] = useState<OrdemServicoItemLote | null>(null);
	const [formAberto, setFormAberto] = useState(false);
	const [codigolote, setCodigolote] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [vencimento, setVencimento] = useState("");
	const [datalote, setDatalote] = useState("");
	const [emissao, setEmissao] = useState("");

	useEffect(() => {
		if (!formAberto) return;
		if (editando) {
			setCodigolote(editando.codigolote ?? "");
			setQuantidade(editando.quantidade ?? "1");
			setVencimento(editando.vencimento?.slice(0, 10) ?? "");
			setDatalote(editando.datalote?.slice(0, 10) ?? "");
			setEmissao(editando.emissao?.slice(0, 10) ?? "");
			return;
		}
		setCodigolote("");
		setQuantidade("1");
		setVencimento("");
		setDatalote("");
		setEmissao("");
	}, [formAberto, editando]);

	async function confirmar() {
		try {
			await salvar.mutateAsync({
				idlote: editando?.id,
				dados: {
					idempresa,
					codigolote: codigolote || undefined,
					quantidade: quantidade.replace(",", "."),
					vencimento: vencimento || undefined,
					datalote: datalote || undefined,
					emissao: emissao || undefined,
				},
			});
			toast.success(editando ? "Lote atualizado" : "Lote adicionado");
			setFormAberto(false);
			setEditando(null);
		} catch (erro) {
			toast.error("Erro ao salvar lote", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	async function remover(lote: OrdemServicoItemLote) {
		try {
			await excluir.mutateAsync({ idlote: lote.id, idempresa });
			toast.success("Lote removido");
		} catch (erro) {
			toast.error("Erro ao remover lote", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Lotes do item</DialogTitle>
				</DialogHeader>

				{!desabilitado && (
					<div className="flex justify-end">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => {
								setEditando(null);
								setFormAberto(true);
							}}
						>
							<Plus className="h-4 w-4" />
							Adicionar lote
						</Button>
					</div>
				)}

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Qtd</TableHead>
								<TableHead>Vencimento</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground"
									>
										Carregando...
									</TableCell>
								</TableRow>
							) : lotes.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground"
									>
										Nenhum lote cadastrado.
									</TableCell>
								</TableRow>
							) : (
								lotes.map((lote) => (
									<TableRow key={lote.id}>
										<TableCell>{lote.codigolote ?? "—"}</TableCell>
										<TableCell>{lote.quantidade ?? "—"}</TableCell>
										<TableCell>{formatarDataOs(lote.vencimento)}</TableCell>
										<TableCell className="text-right">
											{!desabilitado && (
												<div className="flex justify-end gap-1">
													<Button
														type="button"
														variant="ghost"
														size="icon"
														aria-label="Editar lote"
														onClick={() => {
															setEditando(lote);
															setFormAberto(true);
														}}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														aria-label="Excluir lote"
														onClick={() => void remover(lote)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{formAberto && (
					<div className="space-y-3 rounded-md border p-3">
						<div className="grid grid-cols-2 gap-3">
							<Field>
								<FieldLabel htmlFor={idCodigo}>Código do lote</FieldLabel>
								<Input
									id={idCodigo}
									value={codigolote}
									onChange={(e) => setCodigolote(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idQtd}>Quantidade</FieldLabel>
								<Input
									id={idQtd}
									value={quantidade}
									onChange={(e) => setQuantidade(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idVenc}>Vencimento</FieldLabel>
								<Input
									id={idVenc}
									type="date"
									value={vencimento}
									onChange={(e) => setVencimento(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idData}>Data do lote</FieldLabel>
								<Input
									id={idData}
									type="date"
									value={datalote}
									onChange={(e) => setDatalote(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idEmissao}>Emissão</FieldLabel>
								<Input
									id={idEmissao}
									type="date"
									value={emissao}
									onChange={(e) => setEmissao(e.target.value)}
								/>
							</Field>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setFormAberto(false);
									setEditando(null);
								}}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								onClick={() => void confirmar()}
								disabled={salvar.isPending}
							>
								{salvar.isPending ? "Salvando..." : "Salvar lote"}
							</Button>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
