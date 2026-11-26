"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
	Code2,
	GripVertical,
	LayoutGrid,
	Pencil,
	Plus,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { BiChartRenderer } from "@/components/bi/bi-chart-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import { useAuth } from "@/hooks/use-auth";
import {
	useBiCatalogo,
	useBiDashboardLayout,
	useBiMutations,
	useBiWidgetDados,
} from "@/hooks/use-editor-sql";
import { limitesPeriodo } from "@/lib/dashboard-periodo";
import { useEmpresa } from "@/provider/empresa-provider";
import {
	type BiColSpan,
	type BiLayoutItemComWidget,
	editorSqlService,
} from "@/services/editor-sql.service";

const COL_SPAN_CLASS: Record<BiColSpan, string> = {
	4: "lg:col-span-4",
	6: "lg:col-span-6",
	8: "lg:col-span-8",
	12: "lg:col-span-12",
};

interface SortableWidgetCardProps {
	item: BiLayoutItemComWidget;
	parametros: Record<string, string>;
	editando: boolean;
	podeEditar: boolean;
	onColSpanChange: (widgetId: string, colSpan: BiColSpan) => void;
	onRemover: (widgetId: string) => void;
}

function SortableBiWidgetCard({
	item,
	parametros,
	editando,
	podeEditar,
	onColSpanChange,
	onRemover,
}: SortableWidgetCardProps) {
	const queryClient = useQueryClient();
	const { empresa } = useEmpresa();
	const { data, isLoading, isError, error, isFetching } = useBiWidgetDados(
		item.widgetId,
		parametros,
	);
	const [atualizando, setAtualizando] = React.useState(false);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.widgetId, disabled: !editando });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	const handleForcarAtualizacao = async () => {
		setAtualizando(true);
		try {
			const novo = await editorSqlService.executarWidget(item.widgetId, {
				parametros,
				forcarAtualizacao: true,
			});
			queryClient.setQueryData(
				["bi-widget-dados", empresa?.id, item.widgetId, parametros],
				novo,
			);
		} catch {
			toast.error("Não foi possível atualizar os dados do gráfico.");
		} finally {
			setAtualizando(false);
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`col-span-12 ${COL_SPAN_CLASS[item.colSpan] ?? "lg:col-span-6"}`}
		>
			<Card
				className={`h-full ${editando ? "ring-1 ring-primary/40 border-dashed" : ""}`}
			>
				<CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
					<div className="flex items-start gap-2 min-w-0">
						{editando && (
							<button
								type="button"
								{...attributes}
								{...listeners}
								className="mt-0.5 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
								title="Arraste para reordenar"
							>
								<GripVertical className="size-4" />
							</button>
						)}
						<div className="min-w-0">
							<CardTitle className="truncate text-sm font-semibold">
								{item.widget.titulo}
							</CardTitle>
							{item.widget.subtitulo && (
								<CardDescription className="line-clamp-1 text-xs">
									{item.widget.subtitulo}
								</CardDescription>
							)}
						</div>
					</div>

					<div className="flex shrink-0 items-center gap-1">
						{editando ? (
							<>
								<Select
									value={String(item.colSpan)}
									onValueChange={(v) =>
										onColSpanChange(item.widgetId, Number(v) as BiColSpan)
									}
								>
									<SelectTrigger className="h-7 w-20 text-[11px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="4">1/3</SelectItem>
										<SelectItem value="6">1/2</SelectItem>
										<SelectItem value="8">2/3</SelectItem>
										<SelectItem value="12">100%</SelectItem>
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 text-muted-foreground hover:text-destructive"
									onClick={() => onRemover(item.widgetId)}
									title="Remover widget"
								>
									<Trash2 className="size-3.5" />
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={handleForcarAtualizacao}
									disabled={atualizando || isFetching}
									title="Atualizar dados (ignorar cache)"
								>
									<RefreshCw
										className={`size-3.5 ${atualizando || isFetching ? "animate-spin" : ""}`}
									/>
								</Button>
								{podeEditar && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										asChild
										title="Editar consulta no Editor SQL"
									>
										<Link
											href={`/editor-sql?consultaId=${item.widget.idconsulta}`}
										>
											<Code2 className="size-3.5" />
										</Link>
									</Button>
								)}
							</>
						)}
					</div>
				</CardHeader>

				<CardContent>
					{isLoading ? (
						<Skeleton className="h-[220px] w-full" />
					) : isError ? (
						<div className="flex min-h-[160px] flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center text-xs text-destructive">
							<p className="font-medium">Erro ao carregar widget</p>
							<p className="mt-1 opacity-80">
								{error instanceof Error ? error.message : "Falha na consulta"}
							</p>
						</div>
					) : data ? (
						<BiChartRenderer
							tipoGrafico={item.widget.tipografico}
							mapeamento={item.widget.mapeamento}
							colunas={data.colunas}
							linhas={data.linhas}
							altura={240}
						/>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}

export function PersonalizadoSection() {
	const { periodoParams } = useDashboardFilters();
	const { user } = useAuth();
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const podeEditar = React.useMemo(() => {
		const perfis = user?.perfil ?? [];
		return perfis.some((p) =>
			["proprietario", "admin", "super"].includes(p.toLowerCase()),
		);
	}, [user?.perfil]);

	const { data: layoutData, isLoading } = useBiDashboardLayout();
	const { data: catalogoData } = useBiCatalogo(podeEditar);
	const { instalarDoCatalogo, excluirWidget, salvarLayout } = useBiMutations();

	const [editando, setEditando] = React.useState(false);
	const [catalogoAberto, setCatalogoAberto] = React.useState(false);
	const [categoriaFiltro, setCategoriaFiltro] = React.useState<string>("Todas");
	const [itensLocais, setItensLocais] = React.useState<BiLayoutItemComWidget[]>(
		[],
	);

	React.useEffect(() => {
		if (layoutData?.itens) {
			setItensLocais(layoutData.itens);
		}
	}, [layoutData?.itens]);

	const limites = React.useMemo(
		() => limitesPeriodo(periodoParams),
		[periodoParams],
	);

	const parametrosPeriodo = React.useMemo(
		() => ({
			data_inicio: limites.inicio,
			data_fim: limites.fim,
		}),
		[limites.inicio, limites.fim],
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		setItensLocais((prev) => {
			const oldIndex = prev.findIndex((i) => i.widgetId === active.id);
			const newIndex = prev.findIndex((i) => i.widgetId === over.id);
			if (oldIndex === -1 || newIndex === -1) return prev;
			return arrayMove(prev, oldIndex, newIndex).map((item, idx) => ({
				...item,
				ordem: idx,
			}));
		});
	};

	const handleColSpanChange = (widgetId: string, colSpan: BiColSpan) => {
		setItensLocais((prev) =>
			prev.map((it) => (it.widgetId === widgetId ? { ...it, colSpan } : it)),
		);
	};

	const handleSalvarLayout = async () => {
		try {
			await salvarLayout.mutateAsync({
				itens: itensLocais.map((it, idx) => ({
					widgetId: it.widgetId,
					ordem: idx,
					colSpan: it.colSpan,
				})),
			});
			setEditando(false);
			toast.success("Layout do painel salvo!");
		} catch {
			toast.error("Erro ao salvar layout.");
		}
	};

	const handleRemoverWidget = async (widgetId: string) => {
		try {
			await excluirWidget.mutateAsync(widgetId);
			setItensLocais((prev) => prev.filter((it) => it.widgetId !== widgetId));
			toast.success("Widget removido do painel.");
		} catch {
			toast.error("Erro ao remover widget.");
		}
	};

	const handleInstalarCatalogo = async (codigo: string) => {
		try {
			await instalarDoCatalogo.mutateAsync(codigo);
			toast.success("Gráfico adicionado ao Meu Painel!");
		} catch (err) {
			const msg =
				err && typeof err === "object" && "response" in err
					? (err as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			toast.error(msg || "Não foi possível adicionar o gráfico.");
		}
	};

	const catalogo = catalogoData?.catalogo ?? [];
	const categorias = ["Todas", "Vendas", "Financeiro", "Estoque", "Fiscal"];
	const catalogoFiltrado =
		categoriaFiltro === "Todas"
			? catalogo
			: catalogo.filter((c) => c.categoria === categoriaFiltro);

	return (
		<div className="space-y-4 px-4 lg:px-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-base font-semibold">
						{layoutData?.nome ?? "Meu Painel"}
					</h2>
					<p className="text-xs text-muted-foreground">
						Monte seu painel com gráficos do catálogo ou consultas criadas no
						Editor SQL ({itensLocais.length}/{layoutData?.limiteWidgets ?? 12}{" "}
						widgets).
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							queryClient.invalidateQueries({
								queryKey: ["bi-widget-dados", empresa?.id],
							})
						}
					>
						<RefreshCw className="mr-1.5 size-3.5" />
						Atualizar todos
					</Button>

					{podeEditar && (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setCatalogoAberto(true)}
							>
								<Plus className="mr-1.5 size-3.5" />
								Catálogo de Gráficos
							</Button>

							<Button variant="outline" size="sm" asChild>
								<Link href="/editor-sql">
									<Code2 className="mr-1.5 size-3.5" />
									Editor SQL
								</Link>
							</Button>

							{editando ? (
								<Button
									type="button"
									size="sm"
									onClick={handleSalvarLayout}
									disabled={salvarLayout.isPending}
								>
									<Save className="mr-1.5 size-3.5" />
									{salvarLayout.isPending ? "Salvando..." : "Salvar Layout"}
								</Button>
							) : (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setEditando(true)}
									disabled={itensLocais.length === 0}
								>
									<Pencil className="mr-1.5 size-3.5" />
									Editar Layout
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-12 gap-4">
					<Skeleton className="col-span-12 h-64 lg:col-span-6" />
					<Skeleton className="col-span-12 h-64 lg:col-span-6" />
				</div>
			) : itensLocais.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<LayoutGrid className="size-10 text-muted-foreground/60" />
						<div>
							<p className="text-sm font-medium">
								Seu painel personalizado ainda está vazio
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Escolha gráficos prontos no catálogo ou crie sua própria consulta
								no Editor SQL.
							</p>
						</div>
						{podeEditar && (
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									onClick={() => setCatalogoAberto(true)}
								>
									<Plus className="mr-1.5 size-4" />
									Explorar Catálogo de Gráficos
								</Button>
								<Button variant="outline" size="sm" asChild>
									<Link href="/editor-sql">
										<Code2 className="mr-1.5 size-4" />
										Abrir Editor SQL
									</Link>
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={itensLocais.map((i) => i.widgetId)}
						strategy={rectSortingStrategy}
					>
						<div className="grid grid-cols-12 gap-4">
							{itensLocais.map((item) => (
								<SortableBiWidgetCard
									key={item.widgetId}
									item={item}
									parametros={parametrosPeriodo}
									editando={editando}
									podeEditar={podeEditar}
									onColSpanChange={handleColSpanChange}
									onRemover={handleRemoverWidget}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			<Dialog open={catalogoAberto} onOpenChange={setCatalogoAberto}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Catálogo de Gráficos</DialogTitle>
						<DialogDescription>
							Adicione gráficos prontos ao seu painel com 1 clique. Depois você
							pode personalizar qualquer consulta no Editor SQL.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-wrap gap-1.5">
						{categorias.map((cat) => (
							<Button
								key={cat}
								type="button"
								size="sm"
								variant={categoriaFiltro === cat ? "default" : "outline"}
								className="h-7 text-xs"
								onClick={() => setCategoriaFiltro(cat)}
							>
								{cat}
							</Button>
						))}
					</div>

					<div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
						{catalogoFiltrado.map((item) => (
							<div
								key={item.codigo}
								className="flex flex-col justify-between rounded-lg border p-3"
							>
								<div>
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.titulo}</p>
										<Badge variant="secondary" className="text-[10px]">
											{item.categoria}
										</Badge>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{item.descricao}
									</p>
								</div>
								<div className="mt-3 flex items-center justify-between">
									<Badge variant="outline" className="text-[10px] uppercase">
										{item.tipoGrafico}
									</Badge>
									<Button
										type="button"
										size="sm"
										className="h-7 text-xs"
										disabled={instalarDoCatalogo.isPending}
										onClick={() => handleInstalarCatalogo(item.codigo)}
									>
										<Plus className="mr-1 size-3.5" />
										Adicionar
									</Button>
								</div>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
