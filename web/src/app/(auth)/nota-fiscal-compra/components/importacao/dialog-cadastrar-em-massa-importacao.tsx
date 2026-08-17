"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	type NotaFiscalItemImportacao,
	notaFiscalService,
} from "@/services/nota-fiscal.service";

type DialogCadastrarEmMassaImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	itensPendentes: NotaFiscalItemImportacao[];
	idgrupoPadrao?: string | null;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

export function DialogCadastrarEmMassaImportacao({
	idempresa,
	idRascunho,
	itensPendentes,
	idgrupoPadrao,
	aberto,
	onAbertoChange,
}: DialogCadastrarEmMassaImportacaoProps) {
	const queryClient = useQueryClient();
	const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);

	useEffect(() => {
		if (aberto) {
			setIdsSelecionados(itensPendentes.map((item) => item.id));
		}
	}, [aberto, itensPendentes]);

	const todosSelecionados =
		itensPendentes.length > 0 &&
		idsSelecionados.length === itensPendentes.length;
	const algunsSelecionados = idsSelecionados.length > 0 && !todosSelecionados;

	const itensSemGrupo = useMemo(
		() =>
			itensPendentes.filter(
				(item) =>
					idsSelecionados.includes(item.id) &&
					!item.dadosimportacao?.idgrupo &&
					!idgrupoPadrao,
			),
		[itensPendentes, idsSelecionados, idgrupoPadrao],
	);

	const { mutate: cadastrar, isPending } = useMutation({
		mutationFn: (idsItens: string[]) =>
			notaFiscalService.cadastrarItensEmMassaRascunhoImportacao(idRascunho, {
				idempresa,
				idsItens,
			}),
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});

			if (resultado.quantidadeCadastrados > 0) {
				toast.success(
					resultado.quantidadeCadastrados === 1
						? "1 produto marcado para cadastro na finalização"
						: `${resultado.quantidadeCadastrados} produtos marcados para cadastro na finalização`,
				);
			}

			if (resultado.quantidadeIgnorados > 0) {
				const primeiros = resultado.ignorados
					.slice(0, 3)
					.map((item) => {
						const prefixo =
							item.contador != null ? `Item ${item.contador}: ` : "";
						return `${prefixo}${item.motivo}`;
					})
					.join("\n");
				toast.warning(
					resultado.quantidadeCadastrados === 0
						? "Nenhum item pôde ser cadastrado"
						: `${resultado.quantidadeIgnorados} item(ns) não cadastrado(s)`,
					{ description: primeiros },
				);
			}

			if (resultado.quantidadeCadastrados > 0) {
				onAbertoChange(false);
			}
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const alternarTodos = (marcado: boolean) => {
		setIdsSelecionados(marcado ? itensPendentes.map((item) => item.id) : []);
	};

	const alternarItem = (idItem: string, marcado: boolean) => {
		setIdsSelecionados((atual) =>
			marcado ? [...atual, idItem] : atual.filter((id) => id !== idItem),
		);
	};

	const confirmar = () => {
		if (idsSelecionados.length === 0) {
			toast.error("Selecione ao menos um item");
			return;
		}

		if (itensSemGrupo.length > 0) {
			toast.error(
				"Defina o grupo padrão da nota antes de cadastrar os itens sem grupo",
			);
			return;
		}

		cadastrar(idsSelecionados);
	};

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
				<DialogHeader>
					<DialogTitle>Cadastrar produtos em massa</DialogTitle>
					<DialogDescription>
						Os itens selecionados serão cadastrados automaticamente ao finalizar
						a importação, com descrição, EAN, NCM, unidade e tributos da NF-e.
						Itens que você quiser vincular a um produto existente devem ficar
						desmarcados.
					</DialogDescription>
				</DialogHeader>

				{!idgrupoPadrao ? (
					<p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
						Defina o grupo padrão acima para aplicá-lo aos itens sem grupo.
					</p>
				) : null}

				{itensPendentes.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Não há itens pendentes para cadastrar.
					</p>
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
						<div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/80 px-3 py-2">
							<Checkbox
								id="cadastrar-em-massa-todos"
								checked={
									todosSelecionados
										? true
										: algunsSelecionados
											? "indeterminate"
											: false
								}
								onCheckedChange={(checked) => alternarTodos(checked === true)}
							/>
							<Label
								htmlFor="cadastrar-em-massa-todos"
								className="text-sm font-medium"
							>
								Selecionar todos ({itensPendentes.length})
							</Label>
						</div>
						<ul className="divide-y">
							{itensPendentes.map((item) => {
								const dados = item.dadosimportacao;
								const idCheckbox = `cadastrar-em-massa-${item.id}`;
								const semGrupo = !dados?.idgrupo && !idgrupoPadrao;
								const semUnidade = !dados?.idunidademedida;

								return (
									<li
										key={item.id}
										className="flex items-start gap-2 px-3 py-2"
									>
										<Checkbox
											id={idCheckbox}
											className="mt-0.5"
											checked={idsSelecionados.includes(item.id)}
											onCheckedChange={(checked) =>
												alternarItem(item.id, checked === true)
											}
										/>
										<Label
											htmlFor={idCheckbox}
											className="flex min-w-0 flex-1 flex-col items-start gap-0.5 font-normal"
										>
											<span className="truncate text-sm font-medium">
												{item.contador ? `${item.contador}. ` : ""}
												{dados?.descricaoFornecedor ?? item.descricao}
											</span>
											<span className="text-xs text-muted-foreground">
												{dados?.eanXml
													? `EAN ${dados.eanXml}`
													: "Sem código de barras"}
												{" · "}
												{dados?.unidadeXml ?? dados?.unidadeEstoque ?? "s/ un."}
												{semGrupo ? " · sem grupo" : null}
												{semUnidade ? " · sem unidade de medida" : null}
											</span>
										</Label>
									</li>
								);
							})}
						</ul>
					</div>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onAbertoChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={
							isPending ||
							idsSelecionados.length === 0 ||
							itensPendentes.length === 0
						}
						onClick={confirmar}
					>
						{isPending
							? "Cadastrando..."
							: `Cadastrar ${idsSelecionados.length} item(ns)`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
