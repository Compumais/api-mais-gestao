"use client";

import { Layers3, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useExcluirItemOrdemServico,
	useOrdemServicoItens,
	useSalvarItemOrdemServico,
} from "@/hooks/use-ordem-servico";
import type { OrdemServicoItem } from "@/services/ordem-servico.service";
import { formatarMoedaOs } from "@/util/ordem-servico-ui";
import { ModalItemOs } from "./modal-item-os";
import { ModalLotesItemOs } from "./modal-lotes-item-os";

type AbaItensOsProps = {
	ordemServicoId: string;
	idempresa: string;
	tipoItem: "P" | "S";
	desabilitado?: boolean;
	tecnicoObrigatorio?: boolean;
	opcoesTecnicos: Array<{ value: string; label: string }>;
};

export function AbaItensOs({
	ordemServicoId,
	idempresa,
	tipoItem,
	desabilitado = false,
	tecnicoObrigatorio = false,
	opcoesTecnicos,
}: AbaItensOsProps) {
	const ehServico = tipoItem === "S";
	const rotuloSingular = ehServico ? "serviço" : "item";
	const rotuloPlural = ehServico ? "Serviços" : "Itens";
	const rotuloColuna = ehServico ? "Serviço" : "Produto";

	const { data: itens = [], isLoading } = useOrdemServicoItens(
		ordemServicoId,
		idempresa,
	);
	const salvar = useSalvarItemOrdemServico(ordemServicoId);
	const excluir = useExcluirItemOrdemServico(ordemServicoId);

	const itensFiltrados = useMemo(
		() =>
			itens.filter((item) =>
				ehServico
					? item.tipoproduto === "S"
					: (item.tipoproduto ?? "P") !== "S",
			),
		[itens, ehServico],
	);

	const [modalAberto, setModalAberto] = useState(false);
	const [itemEditando, setItemEditando] = useState<OrdemServicoItem | null>(
		null,
	);
	const [lotesItemId, setLotesItemId] = useState<string | null>(null);

	async function confirmarItem(dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
		idtecnico?: string;
		idcfop?: string;
		unidademedida?: string;
		observacao?: string;
	}) {
		try {
			const camposOpcionais = itemEditando
				? {
						idtecnico: dados.idtecnico || null,
						idcfop: dados.idcfop || null,
						unidademedida: dados.unidademedida || null,
						observacao: dados.observacao || null,
					}
				: {
						...(dados.idtecnico ? { idtecnico: dados.idtecnico } : {}),
						...(dados.idcfop ? { idcfop: dados.idcfop } : {}),
						...(dados.unidademedida
							? { unidademedida: dados.unidademedida }
							: {}),
						...(dados.observacao ? { observacao: dados.observacao } : {}),
					};

			await salvar.mutateAsync({
				iditem: itemEditando?.id,
				dados: {
					idempresa,
					idproduto: dados.idproduto,
					quantidade: dados.quantidade,
					preco: dados.preco,
					...camposOpcionais,
					tipoEsperado: tipoItem,
				},
			});
			toast.success(
				itemEditando
					? `${ehServico ? "Serviço" : "Item"} atualizado`
					: `${ehServico ? "Serviço" : "Item"} adicionado`,
			);
			setModalAberto(false);
			setItemEditando(null);
		} catch (erro) {
			toast.error(`Erro ao salvar ${rotuloSingular}`, {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	async function removerItem(item: OrdemServicoItem) {
		try {
			await excluir.mutateAsync({ iditem: item.id, idempresa });
			toast.success(`${ehServico ? "Serviço" : "Item"} removido`);
		} catch (erro) {
			toast.error(`Erro ao remover ${rotuloSingular}`, {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	async function cancelarItem(item: OrdemServicoItem) {
		try {
			await salvar.mutateAsync({
				iditem: item.id,
				dados: { idempresa, cancelado: 1, tipoEsperado: tipoItem },
			});
			toast.success(`${ehServico ? "Serviço" : "Item"} cancelado`);
		} catch (erro) {
			toast.error(`Erro ao cancelar ${rotuloSingular}`, {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{rotuloPlural}</h2>
				{!desabilitado && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							setItemEditando(null);
							setModalAberto(true);
						}}
					>
						<Plus className="h-4 w-4" />
						{ehServico ? "Adicionar serviço" : "Adicionar item"}
					</Button>
				)}
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{rotuloColuna}</TableHead>
							<TableHead className="text-right">Qtd</TableHead>
							<TableHead className="text-right">Preço</TableHead>
							<TableHead className="text-right">Total</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground"
								>
									Carregando {ehServico ? "serviços" : "itens"}...
								</TableCell>
							</TableRow>
						) : itensFiltrados.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground"
								>
									{ehServico
										? "Nenhum serviço na ordem de serviço."
										: "Nenhum item na ordem de serviço."}
								</TableCell>
							</TableRow>
						) : (
							itensFiltrados.map((item) => {
								const qtd = parseFloat(item.quantidade ?? "0");
								const preco = parseFloat(item.preco ?? "0");
								const total = parseFloat(item.total ?? "0") || qtd * preco;
								const cancelado = item.cancelado === 1;
								return (
									<TableRow
										key={item.id}
										className={cancelado ? "opacity-60" : undefined}
									>
										<TableCell>
											{item.nomeproduto ?? item.codigorproduto ?? "—"}
										</TableCell>
										<TableCell className="text-right">{qtd}</TableCell>
										<TableCell className="text-right">
											{formatarMoedaOs(preco)}
										</TableCell>
										<TableCell className="text-right">
											{formatarMoedaOs(total)}
										</TableCell>
										<TableCell>{cancelado ? "Cancelado" : "Ativo"}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												{!ehServico && (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														aria-label="Lotes do item"
														onClick={() => setLotesItemId(item.id)}
													>
														<Layers3 className="h-4 w-4" />
													</Button>
												)}
												{!desabilitado && !cancelado && (
													<>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															aria-label={
																ehServico ? "Editar serviço" : "Editar item"
															}
															onClick={() => {
																setItemEditando(item);
																setModalAberto(true);
															}}
														>
															<Pencil className="h-4 w-4" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => void cancelarItem(item)}
														>
															Cancelar
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															aria-label={
																ehServico ? "Excluir serviço" : "Excluir item"
															}
															onClick={() => void removerItem(item)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<ModalItemOs
				open={modalAberto}
				onClose={() => {
					setModalAberto(false);
					setItemEditando(null);
				}}
				onConfirmar={(dados) => void confirmarItem(dados)}
				idempresa={idempresa}
				tipoEsperado={tipoItem}
				itemParaEditar={itemEditando}
				opcoesTecnicos={opcoesTecnicos}
				tecnicoObrigatorio={tecnicoObrigatorio}
				carregando={salvar.isPending}
			/>

			{!ehServico && lotesItemId && (
				<ModalLotesItemOs
					open={!!lotesItemId}
					onClose={() => setLotesItemId(null)}
					ordemServicoId={ordemServicoId}
					itemId={lotesItemId}
					idempresa={idempresa}
					desabilitado={desabilitado}
				/>
			)}
		</div>
	);
}
