"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEmpresa } from "@/hooks/use-empresa";
import { compararCodigoPlanoContas } from "@/lib/plano-contas-utils";
import { cn } from "@/lib/utils";
import {
	type PlanoContas,
	planoContasService,
} from "@/services/plano-contas.service";
import { PlanoContasTreeEmpty } from "./empty";
import { PlanoContasTreeLoading } from "./loading";
import { TreeNode } from "./tree-node";

export type PlanoContasNode = PlanoContas & { filhos: PlanoContasNode[] };

export const RAIZ_DROP_ID = "plano-contas-raiz";

const LIMITE_POR_PAGINA = 1000;

async function listarTodosPlanos(idempresa: string): Promise<PlanoContas[]> {
	const todos: PlanoContas[] = [];
	let page = 1;

	for (;;) {
		const resposta = await planoContasService.listar({
			idempresa,
			listarTudo: true,
			limit: LIMITE_POR_PAGINA,
			page,
		});

		todos.push(...resposta.data);

		if (
			resposta.data.length === 0 ||
			todos.length >= resposta.paginacao.total
		) {
			return todos;
		}

		page++;
	}
}

function construirArvore(planos: PlanoContas[]): PlanoContasNode[] {
	const noPorId = new Map<string, PlanoContasNode>();

	for (const plano of planos) {
		noPorId.set(plano.id, { ...plano, filhos: [] });
	}

	const raizes: PlanoContasNode[] = [];

	for (const no of noPorId.values()) {
		const pai = no.idplanocontas ? noPorId.get(no.idplanocontas) : undefined;

		if (pai) {
			pai.filhos.push(no);
		} else {
			raizes.push(no);
		}
	}

	const ordenar = (nos: PlanoContasNode[]) => {
		nos.sort((a, b) => compararCodigoPlanoContas(a.codigo, b.codigo));
		for (const no of nos) {
			ordenar(no.filhos);
		}
	};

	ordenar(raizes);

	return raizes;
}

function ehDescendente(
	planoPorId: Map<string, PlanoContas>,
	idorigem: string,
	iddestino: string,
): boolean {
	let atual = planoPorId.get(iddestino);

	while (atual?.idplanocontas) {
		if (atual.idplanocontas === idorigem) {
			return true;
		}
		atual = planoPorId.get(atual.idplanocontas);
	}

	return false;
}

function RaizDropZone({ visivel }: { visivel: boolean }) {
	const { setNodeRef, isOver } = useDroppable({ id: RAIZ_DROP_ID });

	if (!visivel) {
		return null;
	}

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex items-center justify-center rounded-md border-2 border-dashed p-3 text-sm text-muted-foreground transition-colors",
				isOver && "border-primary bg-primary/10 text-primary",
			)}
		>
			Solte aqui para mover para o nível raiz
		</div>
	);
}

export function PlanoContasTree() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [idArrastando, setIdArrastando] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	// Carrega o plano completo da empresa para montar a árvore e permitir drag-and-drop entre ramos
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["plano-contas", "arvore", empresa?.id],
		queryFn: () => listarTodosPlanos(empresa?.id as string),
		enabled: !!empresa?.id,
	});

	const planoPorId = useMemo(
		() => new Map((data ?? []).map((plano) => [plano.id, plano])),
		[data],
	);

	const arvore = useMemo(() => construirArvore(data ?? []), [data]);

	const moverMutation = useMutation({
		mutationFn: (dados: { id: string; idplanocontasdestino: string | null }) =>
			planoContasService.mover(dados),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			await queryClient.refetchQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas movido com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao mover plano de contas");
		},
	});

	const handleDragStart = (evento: DragStartEvent) => {
		setIdArrastando(String(evento.active.id));
	};

	const handleDragEnd = (evento: DragEndEvent) => {
		setIdArrastando(null);

		const idorigem = String(evento.active.id);
		const over = evento.over;

		if (!over) {
			return;
		}

		const iddestino = over.id === RAIZ_DROP_ID ? null : String(over.id);

		if (iddestino === idorigem) {
			return;
		}

		const origem = planoPorId.get(idorigem);

		if (!origem || origem.idplanocontas === iddestino) {
			return;
		}

		if (iddestino) {
			const destino = planoPorId.get(iddestino);

			if (!destino) {
				return;
			}

			if (destino.inativo === 1) {
				toast.error("Não é possível mover para um plano de contas inativo");
				return;
			}

			if (ehDescendente(planoPorId, idorigem, iddestino)) {
				toast.error(
					"Não é possível mover um plano de contas para dentro de um de seus descendentes",
				);
				return;
			}
		}

		moverMutation.mutate({ id: idorigem, idplanocontasdestino: iddestino });
	};

	if (!empresa?.id) {
		return (
			<div className="flex items-center justify-center py-8 text-muted-foreground">
				Selecione uma empresa para visualizar o plano de contas
			</div>
		);
	}

	if (isLoading) {
		return <PlanoContasTreeLoading />;
	}

	if (isError) {
		const errorMessage =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Erro desconhecido ao carregar plano de contas";
		return (
			<div className="flex items-center justify-center py-8 text-destructive">
				{errorMessage}
			</div>
		);
	}

	if (!data || data.length === 0) {
		return <PlanoContasTreeEmpty />;
	}

	const noArrastando = idArrastando ? planoPorId.get(idArrastando) : null;

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setIdArrastando(null)}
		>
			<div className="space-y-4">
				<RaizDropZone visivel={!!idArrastando} />
				<div className="space-y-1">
					{arvore.map((node) => (
						<TreeNode
							key={node.id}
							node={node}
							idArrastando={idArrastando}
							movendo={moverMutation.isPending}
						/>
					))}
				</div>
			</div>

			<DragOverlay>
				{noArrastando && (
					<div className="flex items-center gap-2 rounded-md border bg-card p-2 shadow-lg">
						<Folder className="h-4 w-4 text-primary" aria-hidden="true" />
						<span className="text-sm text-muted-foreground">
							{noArrastando.codigo}
						</span>
						<span className="text-sm font-medium">{noArrastando.nome}</span>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
