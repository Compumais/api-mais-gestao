"use client";

import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	Database,
	FolderCode,
	Table2,
	Trash2,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	BiCatalogoItem,
	BiConsulta,
	BiViewSchema,
} from "@/services/editor-sql.service";

interface SchemaSidebarProps {
	views: BiViewSchema[];
	consultas: BiConsulta[];
	catalogo: BiCatalogoItem[];
	carregandoSchema: boolean;
	onInserirTexto: (texto: string) => void;
	onSelecionarConsulta: (consulta: BiConsulta) => void;
	onExcluirConsulta: (id: string) => void;
	onUsarCatalogo: (item: BiCatalogoItem) => void;
}

export function SchemaSidebar({
	views,
	consultas,
	catalogo,
	carregandoSchema,
	onInserirTexto,
	onSelecionarConsulta,
	onExcluirConsulta,
	onUsarCatalogo,
}: SchemaSidebarProps) {
	const [busca, setBusca] = React.useState("");
	const [abertas, setAbertas] = React.useState<Record<string, boolean>>({});

	const termo = busca.trim().toLowerCase();

	const viewsFiltradas = React.useMemo(() => {
		if (!termo) return views;
		return views.filter(
			(v) =>
				v.nome.toLowerCase().includes(termo) ||
				v.colunas.some((c) => c.nome.toLowerCase().includes(termo)),
		);
	}, [views, termo]);

	const consultasFiltradas = React.useMemo(() => {
		if (!termo) return consultas;
		return consultas.filter((c) => c.nome.toLowerCase().includes(termo));
	}, [consultas, termo]);

	const catalogoFiltrado = React.useMemo(() => {
		if (!termo) return catalogo;
		return catalogo.filter(
			(c) =>
				c.titulo.toLowerCase().includes(termo) ||
				c.categoria.toLowerCase().includes(termo),
		);
	}, [catalogo, termo]);

	return (
		<div className="flex h-full flex-col rounded-lg border bg-card">
			<div className="border-b p-3">
				<Input
					value={busca}
					onChange={(e) => setBusca(e.target.value)}
					placeholder="Filtrar views, salvas ou templates..."
					className="h-8 text-xs"
				/>
			</div>

			<Tabs defaultValue="views" className="flex flex-1 flex-col overflow-hidden">
				<TabsList className="mx-3 mt-2 grid grid-cols-3">
					<TabsTrigger value="views" className="gap-1 text-xs">
						<Database className="size-3.5" />
						Views
					</TabsTrigger>
					<TabsTrigger value="salvas" className="gap-1 text-xs">
						<FolderCode className="size-3.5" />
						Salvas
					</TabsTrigger>
					<TabsTrigger value="catalogo" className="gap-1 text-xs">
						<BookOpen className="size-3.5" />
						Catálogo
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="views"
					className="mt-2 flex-1 overflow-y-auto px-2 pb-3"
				>
					{carregandoSchema ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							Carregando views de relatórios...
						</p>
					) : viewsFiltradas.length === 0 ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							Nenhuma view encontrada no schema <code>relatorios</code>.
						</p>
					) : (
						<div className="space-y-1">
							{viewsFiltradas.map((view) => {
								const expandida = Boolean(abertas[view.nome]);
								return (
									<div key={view.nome} className="rounded-md border bg-background/60">
										<div className="flex items-center justify-between px-2 py-1.5">
											<button
												type="button"
												onClick={() =>
													setAbertas((prev) => ({
														...prev,
														[view.nome]: !prev[view.nome],
													}))
												}
												className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium hover:text-primary"
											>
												{expandida ? (
													<ChevronDown className="size-3.5 shrink-0" />
												) : (
													<ChevronRight className="size-3.5 shrink-0" />
												)}
												<Table2 className="size-3.5 shrink-0 text-muted-foreground" />
												<span className="truncate">{view.nome}</span>
											</button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-6 px-1.5 text-[11px]"
												onClick={() => onInserirTexto(view.nome)}
											>
												Inserir
											</Button>
										</div>

										{expandida && (
											<div className="border-t px-2 py-1.5">
												<div className="space-y-1">
													{view.colunas.map((col) => (
														<button
															key={col.nome}
															type="button"
															onClick={() => onInserirTexto(col.nome)}
															className="flex w-full items-center justify-between rounded px-1.5 py-0.5 text-left text-[11px] hover:bg-muted"
														>
															<span className="truncate font-mono">{col.nome}</span>
															<span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
																{col.tipo}
															</span>
														</button>
													))}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</TabsContent>

				<TabsContent
					value="salvas"
					className="mt-2 flex-1 overflow-y-auto px-2 pb-3"
				>
					{consultasFiltradas.length === 0 ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							Nenhuma consulta salva ainda.
						</p>
					) : (
						<div className="space-y-1.5">
							{consultasFiltradas.map((c) => (
								<div
									key={c.id}
									className="group flex items-start justify-between gap-1 rounded-md border bg-background/60 p-2 hover:border-primary/40"
								>
									<button
										type="button"
										onClick={() => onSelecionarConsulta(c)}
										className="flex-1 text-left"
									>
										<p className="text-xs font-medium leading-tight">{c.nome}</p>
										{c.descricao && (
											<p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
												{c.descricao}
											</p>
										)}
									</button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
										onClick={() => onExcluirConsulta(c.id)}
										title="Excluir consulta"
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					)}
				</TabsContent>

				<TabsContent
					value="catalogo"
					className="mt-2 flex-1 overflow-y-auto px-2 pb-3"
				>
					<div className="space-y-1.5">
						{catalogoFiltrado.map((item) => (
							<button
								key={item.codigo}
								type="button"
								onClick={() => onUsarCatalogo(item)}
								className="w-full rounded-md border bg-background/60 p-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
							>
								<div className="flex items-center justify-between gap-1">
									<span className="text-xs font-medium">{item.titulo}</span>
									<Badge variant="secondary" className="text-[10px]">
										{item.categoria}
									</Badge>
								</div>
								<p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
									{item.descricao}
								</p>
							</button>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
