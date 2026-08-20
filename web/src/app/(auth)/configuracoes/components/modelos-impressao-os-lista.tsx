"use client";

import { Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	useDefinirPrimarioModeloImpressaoOs,
	useDuplicarModeloImpressaoOs,
	useExcluirModeloImpressaoOs,
	useModelosImpressaoOs,
} from "@/hooks/use-modelo-impressao-os";

type ModelosImpressaoOsListaProps = {
	idempresa: string;
};

export function ModelosImpressaoOsLista({
	idempresa,
}: ModelosImpressaoOsListaProps) {
	const { data: modelos = [], isLoading } = useModelosImpressaoOs(idempresa);
	const excluir = useExcluirModeloImpressaoOs(idempresa);
	const duplicar = useDuplicarModeloImpressaoOs(idempresa);
	const definirPrimario = useDefinirPrimarioModeloImpressaoOs(idempresa);

	if (isLoading) {
		return (
			<div className="flex justify-center py-10">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">Modelos de impressão</h2>
					<p className="text-sm text-muted-foreground">
						Defina o layout usado ao imprimir ordens de serviço
					</p>
				</div>
				<Button asChild className="gap-2">
					<Link href="/configuracoes/modelos-impressao/novo">
						<Plus className="h-4 w-4" />
						Novo modelo
					</Link>
				</Button>
			</div>

			{modelos.length === 0 ? (
				<div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
					Nenhum modelo encontrado. Os modelos padrão serão criados
					automaticamente.
				</div>
			) : (
				<div className="rounded-lg border divide-y">
					{modelos.map((modelo) => (
						<div
							key={modelo.id}
							className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3"
						>
							<div className="space-y-1 min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-medium">{modelo.nome}</span>
									{modelo.primario && (
										<Badge variant="default" className="gap-1">
											<Star className="h-3 w-3" />
											Primário
										</Badge>
									)}
									{modelo.sistema ? (
										<Badge variant="secondary">Sistema</Badge>
									) : (
										<Badge variant="outline">Personalizado</Badge>
									)}
								</div>
								{modelo.descricao && (
									<p className="text-sm text-muted-foreground truncate">
										{modelo.descricao}
									</p>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								{!modelo.primario && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-1.5"
										disabled={definirPrimario.isPending}
										onClick={async () => {
											try {
												await definirPrimario.mutateAsync(modelo.id);
												toast.success("Modelo definido como primário");
											} catch (erro) {
												toast.error("Erro ao definir primário", {
													description:
														erro instanceof Error
															? erro.message
															: "Erro desconhecido",
												});
											}
										}}
									>
										<Star className="h-3.5 w-3.5" />
										Primário
									</Button>
								)}
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1.5"
									disabled={duplicar.isPending}
									onClick={async () => {
										try {
											await duplicar.mutateAsync(modelo.id);
											toast.success("Modelo duplicado");
										} catch (erro) {
											toast.error("Erro ao duplicar", {
												description:
													erro instanceof Error
														? erro.message
														: "Erro desconhecido",
											});
										}
									}}
								>
									<Copy className="h-3.5 w-3.5" />
									Duplicar
								</Button>
								{!modelo.sistema && (
									<>
										<Button asChild variant="outline" size="sm" className="gap-1.5">
											<Link
												href={`/configuracoes/modelos-impressao/${modelo.id}`}
											>
												<Pencil className="h-3.5 w-3.5" />
												Editar
											</Link>
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="gap-1.5 text-destructive border-destructive/30"
											disabled={excluir.isPending}
											onClick={async () => {
												try {
													await excluir.mutateAsync(modelo.id);
													toast.success("Modelo excluído");
												} catch (erro) {
													toast.error("Erro ao excluir", {
														description:
															erro instanceof Error
																? erro.message
																: "Erro desconhecido",
													});
												}
											}}
										>
											<Trash2 className="h-3.5 w-3.5" />
											Excluir
										</Button>
									</>
								)}
								{modelo.sistema && (
									<Button asChild variant="ghost" size="sm" className="gap-1.5">
										<Link
											href={`/configuracoes/modelos-impressao/${modelo.id}`}
										>
											Ver
										</Link>
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
