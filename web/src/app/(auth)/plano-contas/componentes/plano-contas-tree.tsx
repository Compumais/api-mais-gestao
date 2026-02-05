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
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";
import { planoContasService } from "@/services/plano-contas.service";
import { Button } from "../../../../components/ui/button";
import { PlanoContasTreeEmpty } from "./empty";
import { PlanoContasTreeLoading } from "./loading";
import { TreeNode } from "./tree-node";

function RootDropZone() {
	const { setNodeRef, isOver } = useDroppable({
		id: "root",
		data: {
			type: "root",
			accepts: ["plano-contas"],
		},
	});

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex items-center gap-4 px-4 min-h-12 rounded-lg border-2 border-dashed transition-colors",
				isOver
					? "border-primary bg-primary/10"
					: "border-transparent bg-muted/30",
			)}
		>
			<PlusIcon className="h-4 w-4" />
			<p>Arraste e solte aqui para adicionar um novo plano de contas</p>
		</div>
	);
}

export function PlanoContasTree() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [activeId, setActiveId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	// Carrega apenas os planos de contas raiz (sem pai)
	// O React Query refaz automaticamente quando empresa?.id muda (faz parte da query key)
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["plano-contas", empresa?.id],
		queryFn: () =>
			planoContasService.listar({
				idempresa: empresa?.id,
				limit: 100,
			}),
		enabled: !!empresa?.id,
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			idplanocontas,
		}: {
			id: string;
			idplanocontas: string | null;
		}) => planoContasService.atualizar(id, { idplanocontas }),
		onSuccess: () => {
			// Invalida todas as queries de plano de contas para recarregar a árvore
			queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas atualizado com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar plano de contas");
		},
	});

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over) {
			return;
		}

		const draggedId = active.id as string;

		// Se soltou na raiz, move para null
		if (over.id === "root") {
			const draggedItem = data?.data.find((item) => item.id === draggedId);
			if (draggedItem && draggedItem.idplanocontas !== null) {
				updateMutation.mutate({
					id: draggedId,
					idplanocontas: null,
				});
			}
			return;
		}

		const targetId = over.id as string;

		// Não permite mover para si mesmo
		if (draggedId === targetId) {
			return;
		}

		// Busca os dados do item arrastado
		const draggedItem = data?.data.find((item) => item.id === draggedId);

		if (!draggedItem) {
			return;
		}

		// Se o alvo é o mesmo que o pai atual, não faz nada
		if (draggedItem.idplanocontas === targetId) {
			return;
		}

		// Verifica se não está tentando mover um item para dentro de si mesmo ou de seus filhos
		const isDescendant = (parentId: string, childId: string): boolean => {
			const item = data?.data.find((i) => i.id === childId);
			if (!item || !item.idplanocontas) return false;
			if (item.idplanocontas === parentId) return true;
			return isDescendant(parentId, item.idplanocontas);
		};

		if (isDescendant(draggedId, targetId)) {
			toast.error(
				"Não é possível mover um item para dentro de seus próprios filhos",
			);
			return;
		}

		// Atualiza o plano de contas
		updateMutation.mutate({
			id: draggedId,
			idplanocontas: targetId,
		});
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

	if (!data || data.data.length === 0) {
		return <PlanoContasTreeEmpty />;
	}

	// Filtra apenas os itens raiz (sem pai)
	const rootItems = data.data.filter((item) => !item.idplanocontas);

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="space-y-4">
				<Button className="w-full justify-start" variant="secondary" asChild>
					<Link href="/plano-contas/novo">
						<PlusIcon className="h-4 w-4" />
						Adicionar plano de contas
					</Link>
				</Button>
				<div className="space-y-1">
					{rootItems.map((node) => (
						<TreeNode key={node.id} node={node} />
					))}
				</div>
			</div>
			<DragOverlay>
				{activeId ? (
					<div className="rounded-md bg-card p-2 shadow-lg border">
						{data.data.find((item) => item.id === activeId)?.nome || "Item"}
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
