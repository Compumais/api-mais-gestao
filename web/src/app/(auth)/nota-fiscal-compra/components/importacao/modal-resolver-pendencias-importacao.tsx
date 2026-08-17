"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
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
import { hierarquiasService } from "@/services/hierarquias.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	isUnidadeMedidaGlobal,
	type UnidadeMedida,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";
import {
	type ItemPendenciaImportacao,
	itemPendenciaPreenchido,
} from "@/util/pendencias-finalizacao-importacao-nf";
import { CelulaCfopEntradaImportacao } from "./celula-cfop-entrada-importacao";

type ModalResolverPendenciasImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	itens: ItemPendenciaImportacao[];
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onResolvido: () => void;
};

function rotuloUnidade(unidade: UnidadeMedida): string {
	if (unidade.codigo && unidade.nome) {
		return `${unidade.codigo} — ${unidade.nome}`;
	}
	return unidade.codigo ?? unidade.nome ?? unidade.id;
}

function SelectUnidadeCompacto({
	id,
	value,
	unidades,
	isLoading,
	onChange,
}: {
	id: string;
	value?: string;
	unidades: UnidadeMedida[];
	isLoading: boolean;
	onChange: (idunidademedida: string, codigo?: string) => void;
}) {
	const globais = unidades.filter(isUnidadeMedidaGlobal);
	const daEmpresa = unidades.filter((u) => !isUnidadeMedidaGlobal(u));

	return (
		<Select
			value={value || undefined}
			onValueChange={(idSelecionado) => {
				const unidade = unidades.find((item) => item.id === idSelecionado);
				onChange(idSelecionado, unidade?.codigo ?? undefined);
			}}
			disabled={isLoading}
		>
			<SelectTrigger id={id} className="h-8 w-full min-w-[140px] text-xs">
				<SelectValue placeholder={isLoading ? "Carregando..." : "Selecione"} />
			</SelectTrigger>
			<SelectContent position="popper" className="z-[200]">
				{globais.length === 0 && daEmpresa.length === 0 ? (
					<SelectItem value="__vazio" disabled>
						Nenhuma unidade cadastrada
					</SelectItem>
				) : (
					<>
						{globais.length > 0 ? (
							<SelectGroup>
								<SelectLabel>Padrão do sistema</SelectLabel>
								{globais.map((unidade) => (
									<SelectItem key={unidade.id} value={unidade.id}>
										{rotuloUnidade(unidade)}
									</SelectItem>
								))}
							</SelectGroup>
						) : null}
						{daEmpresa.length > 0 ? (
							<SelectGroup>
								<SelectLabel>Da empresa</SelectLabel>
								{daEmpresa.map((unidade) => (
									<SelectItem key={unidade.id} value={unidade.id}>
										{rotuloUnidade(unidade)}
									</SelectItem>
								))}
							</SelectGroup>
						) : null}
					</>
				)}
			</SelectContent>
		</Select>
	);
}

export function ModalResolverPendenciasImportacao({
	idempresa,
	idRascunho,
	itens,
	aberto,
	onAbertoChange,
	onResolvido,
}: ModalResolverPendenciasImportacaoProps) {
	const queryClient = useQueryClient();
	const [itensEditados, setItensEditados] = useState<ItemPendenciaImportacao[]>(
		[],
	);
	const [unidadeLote, setUnidadeLote] = useState("");
	const [grupoLote, setGrupoLote] = useState("");

	useEffect(() => {
		if (aberto) {
			setItensEditados(itens.map((item) => ({ ...item })));
			setUnidadeLote("");
			setGrupoLote("");
		}
	}, [aberto, itens]);

	const { data: unidades = [], isLoading: carregandoUnidades } = useQuery({
		queryKey: ["unidades-medida", idempresa, "importacao-nf"],
		queryFn: () => unidadeMedidaService.listarTodos({ idempresa }),
		enabled: aberto && !!idempresa,
	});

	const { data: grupos = [], isLoading: carregandoGrupos } = useQuery({
		queryKey: ["hierarquias", idempresa, "importacao-nf"],
		queryFn: () => hierarquiasService.listarTodos({ idempresa }),
		enabled: aberto && !!idempresa,
	});

	const mostraUnidade = itensEditados.some((item) =>
		item.campos.includes("unidade"),
	);
	const mostraGrupo = itensEditados.some((item) =>
		item.campos.includes("grupo"),
	);
	const mostraCfop = itensEditados.some((item) => item.campos.includes("cfop"));

	const incompletos = useMemo(
		() => itensEditados.filter((item) => !itemPendenciaPreenchido(item)),
		[itensEditados],
	);

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (lista: ItemPendenciaImportacao[]) => {
			await Promise.all(
				lista.map((item) => {
					const payload: {
						idempresa: string;
						idunidademedida?: string;
						unidadeEstoque?: string;
						idgrupo?: string;
						idcfop?: string;
					} = { idempresa };

					if (item.campos.includes("unidade") && item.idunidademedida) {
						payload.idunidademedida = item.idunidademedida;
						if (item.unidadeEstoque) {
							payload.unidadeEstoque = item.unidadeEstoque;
						}
					}
					if (item.campos.includes("grupo") && item.idgrupo) {
						payload.idgrupo = item.idgrupo;
					}
					if (item.campos.includes("cfop") && item.idcfop) {
						payload.idcfop = item.idcfop;
					}

					return notaFiscalService.atualizarItemRascunhoImportacao(
						idRascunho,
						item.idItem,
						payload,
					);
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
			toast.success("Pendências dos itens atualizadas");
			onAbertoChange(false);
			onResolvido();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const atualizarItem = (
		idItem: string,
		campos: Partial<
			Pick<
				ItemPendenciaImportacao,
				"idunidademedida" | "unidadeEstoque" | "idgrupo" | "idcfop" | "cfop"
			>
		>,
	) => {
		setItensEditados((atual) =>
			atual.map((item) =>
				item.idItem === idItem ? { ...item, ...campos } : item,
			),
		);
	};

	const aplicarUnidadeEmLote = () => {
		if (!unidadeLote) {
			toast.error("Selecione a unidade de medida");
			return;
		}
		const unidade = unidades.find((item) => item.id === unidadeLote);
		setItensEditados((atual) =>
			atual.map((item) =>
				item.campos.includes("unidade")
					? {
							...item,
							idunidademedida: unidadeLote,
							unidadeEstoque: unidade?.codigo ?? item.unidadeEstoque,
						}
					: item,
			),
		);
	};

	const aplicarGrupoEmLote = () => {
		if (!grupoLote) {
			toast.error("Selecione o grupo");
			return;
		}
		setItensEditados((atual) =>
			atual.map((item) =>
				item.campos.includes("grupo") ? { ...item, idgrupo: grupoLote } : item,
			),
		);
	};

	const confirmar = () => {
		if (incompletos.length > 0) {
			toast.error("Preencha os campos faltantes de todos os itens", {
				description: incompletos
					.slice(0, 3)
					.map(
						(item) =>
							`Item ${item.contador ?? "?"}: ${item.mensagens.join(", ")}`,
					)
					.join("\n"),
			});
			return;
		}

		salvar(itensEditados);
	};

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
				<DialogHeader>
					<DialogTitle>Resolver pendências da importação</DialogTitle>
					<DialogDescription>
						{itensEditados.length === 1
							? "Este item está incompleto. Preencha os campos abaixo para finalizar."
							: `${itensEditados.length} itens estão incompletos. Preencha os campos faltantes ou aplique o mesmo valor a todos.`}
					</DialogDescription>
				</DialogHeader>

				{(mostraUnidade || mostraGrupo) && (
					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-sm font-medium">Aplicar em lote</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							{mostraUnidade ? (
								<div className="space-y-2">
									<Label htmlFor="unidade-lote">
										Unidade para itens sem medida
									</Label>
									<div className="flex gap-2">
										<div className="min-w-0 flex-1">
											<SelectUnidadeCompacto
												id="unidade-lote"
												value={unidadeLote}
												unidades={unidades}
												isLoading={carregandoUnidades}
												onChange={(id) => setUnidadeLote(id)}
											/>
										</div>
										<Button
											type="button"
											variant="secondary"
											onClick={aplicarUnidadeEmLote}
										>
											Aplicar
										</Button>
									</div>
								</div>
							) : null}
							{mostraGrupo ? (
								<div className="space-y-2">
									<Label htmlFor="grupo-lote">Grupo para itens sem grupo</Label>
									<div className="flex gap-2">
										<Select
											value={grupoLote || undefined}
											onValueChange={setGrupoLote}
											disabled={carregandoGrupos}
										>
											<SelectTrigger
												id="grupo-lote"
												className="h-8 min-w-0 flex-1 text-xs"
											>
												<SelectValue
													placeholder={
														carregandoGrupos
															? "Carregando..."
															: "Selecione o grupo"
													}
												/>
											</SelectTrigger>
											<SelectContent position="popper" className="z-[200]">
												{grupos.length === 0 ? (
													<SelectItem value="__vazio" disabled>
														Nenhum grupo cadastrado
													</SelectItem>
												) : (
													grupos.map((grupo) => (
														<SelectItem key={grupo.id} value={grupo.id}>
															{grupo.nome || grupo.codigo || grupo.id}
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
										<Button
											type="button"
											variant="secondary"
											onClick={aplicarGrupoEmLote}
										>
											Aplicar
										</Button>
									</div>
								</div>
							) : null}
						</div>
					</section>
				)}

				<div className="min-h-0 flex-1 overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">#</TableHead>
								<TableHead>Produto</TableHead>
								{mostraUnidade ? (
									<TableHead className="w-48">Unidade de medida</TableHead>
								) : null}
								{mostraGrupo ? (
									<TableHead className="w-48">Grupo</TableHead>
								) : null}
								{mostraCfop ? (
									<TableHead className="w-52">CFOP de entrada</TableHead>
								) : null}
							</TableRow>
						</TableHeader>
						<TableBody>
							{itensEditados.map((item) => (
								<TableRow key={item.idItem}>
									<TableCell className="text-muted-foreground">
										{item.contador}
									</TableCell>
									<TableCell>
										<p className="max-w-[220px] truncate text-sm font-medium">
											{item.descricao}
										</p>
										<p className="text-xs text-muted-foreground">
											{item.mensagens.join(" · ")}
											{item.unidadeXml ? ` · NF: ${item.unidadeXml}` : ""}
										</p>
									</TableCell>
									{mostraUnidade ? (
										<TableCell>
											{item.campos.includes("unidade") ? (
												<SelectUnidadeCompacto
													id={`unidade-item-${item.idItem}`}
													value={item.idunidademedida}
													unidades={unidades}
													isLoading={carregandoUnidades}
													onChange={(idunidademedida, codigo) =>
														atualizarItem(item.idItem, {
															idunidademedida,
															unidadeEstoque: codigo,
														})
													}
												/>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</TableCell>
									) : null}
									{mostraGrupo ? (
										<TableCell>
											{item.campos.includes("grupo") ? (
												<Select
													value={item.idgrupo || undefined}
													onValueChange={(idgrupo) =>
														atualizarItem(item.idItem, { idgrupo })
													}
													disabled={carregandoGrupos}
												>
													<SelectTrigger
														id={`grupo-item-${item.idItem}`}
														className="h-8 w-full min-w-[140px] text-xs"
													>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent position="popper" className="z-[200]">
														{grupos.map((grupo) => (
															<SelectItem key={grupo.id} value={grupo.id}>
																{grupo.nome || grupo.codigo || grupo.id}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</TableCell>
									) : null}
									{mostraCfop ? (
										<TableCell>
											{item.campos.includes("cfop") ? (
												<CelulaCfopEntradaImportacao
													idempresa={idempresa}
													idcfop={item.idcfop}
													tributacao={item.tributacao}
													onChange={(idcfop, codigo) =>
														atualizarItem(item.idItem, {
															idcfop,
															cfop: codigo ?? null,
														})
													}
												/>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</TableCell>
									) : null}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => onAbertoChange(false)}
					>
						Cancelar
					</Button>
					<Button type="button" disabled={isPending} onClick={confirmar}>
						{isPending ? "Salvando..." : "Salvar e continuar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
