"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ChevronRight,
	Folder,
	FolderOpen,
	GripVertical,
	MoreVertical,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";
import { planoContasService } from "@/services/plano-contas.service";
import type { PlanoContasNode } from "./plano-contas-tree";

interface TreeNodeProps {
	node: PlanoContasNode;
	level?: number;
	idArrastando?: string | null;
	movendo?: boolean;
	dentroDoArrastado?: boolean;
}

export function TreeNode({
	node,
	level = 0,
	idArrastando = null,
	movendo = false,
	dentroDoArrastado = false,
}: TreeNodeProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [isExpanded, setIsExpanded] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	const estaArrastandoEste = idArrastando === node.id;
	const dropDesabilitado =
		estaArrastandoEste || dentroDoArrastado || node.inativo === 1;

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: node.id, disabled: movendo });

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: node.id,
		disabled: dropDesabilitado,
	});

	const children = node.filhos;

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsExpanded(!isExpanded);
	};

	const navigateToNewPlan = (planId: string) => {
		router.push(`/plano-contas/novo?idplanocontas=${planId}`);
	};

	const navigateToEditPlan = (planId: string) => {
		router.push(`/plano-contas/${planId}/editar`);
	};

	const deleteMutation = useMutation({
		mutationFn: () => planoContasService.deletar(node.id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			await queryClient.refetchQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas excluído com sucesso");
			setShowDeleteDialog(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir plano de contas");
		},
	});

	// Função auxiliar para inativar filhos recursivamente
	const inativarFilhosRecursivo = async (nodeId: string): Promise<void> => {
		try {
			const filhosResponse = await planoContasService.listar({
				idempresa: empresa?.id,
				idplanocontas: nodeId,
				limit: 100,
			});

			const filhos = filhosResponse.data;

			if (filhos.length === 0) {
				return;
			}

			await Promise.all(
				filhos.map(async (filho) => {
					await planoContasService.atualizar(filho.id, { inativo: 1 });
					await inativarFilhosRecursivo(filho.id);
				}),
			);
		} catch (error) {
			console.error("Erro ao inativar filhos recursivamente:", error);
			throw error;
		}
	};

	// Função auxiliar para ativar filhos recursivamente
	const ativarFilhosRecursivo = async (nodeId: string): Promise<void> => {
		try {
			const filhosResponse = await planoContasService.listar({
				idempresa: empresa?.id,
				idplanocontas: nodeId,
				limit: 100,
			});

			const filhos = filhosResponse.data;

			if (filhos.length === 0) {
				return;
			}

			await Promise.all(
				filhos.map(async (filho) => {
					await planoContasService.atualizar(filho.id, { inativo: 0 });
					await ativarFilhosRecursivo(filho.id);
				}),
			);
		} catch (error) {
			console.error("Erro ao ativar filhos recursivamente:", error);
			throw error;
		}
	};

	const handleInativar = async () => {
		const novoStatus = node.inativo ? 0 : 1;

		if (novoStatus === 1) {
			try {
				await planoContasService.atualizar(node.id, { inativo: 1 });
				await inativarFilhosRecursivo(node.id);
				await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
				await queryClient.refetchQueries({ queryKey: ["plano-contas"] });
				toast.success(
					"Plano de contas e seus filhos foram inativados com sucesso",
				);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Erro ao inativar plano de contas e seus filhos",
				);
			}
		} else {
			try {
				await planoContasService.atualizar(node.id, { inativo: 0 });
				await ativarFilhosRecursivo(node.id);
				await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
				await queryClient.refetchQueries({ queryKey: ["plano-contas"] });
				toast.success(
					"Plano de contas e seus filhos foram ativados com sucesso",
				);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Erro ao ativar plano de contas e seus filhos",
				);
			}
		}
	};

	const handleDelete = () => {
		setShowDeleteDialog(true);
	};

	// Determina a cor baseada no tipo de movimento e status
	const getTextColorClass = () => {
		if (node.inativo === 1) {
			return "text-muted-foreground/70";
		}
		if (node.tipomovimento === "E") {
			return "text-green-800 dark:text-green-500";
		}
		if (node.tipomovimento === "S") {
			return "text-red-800 dark:text-red-500";
		}
		return "";
	};

	return (
		<div>
			<div
				ref={(elemento) => {
					setDragRef(elemento);
					setDropRef(elemento);
				}}
				className={cn(
					"group relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50",
					isDragging && "opacity-40",
					isOver &&
						!dropDesabilitado &&
						"bg-primary/10 outline-2 outline-primary/50",
				)}
			>
				<div
					className="flex flex-1 items-center gap-2"
					style={{ paddingLeft: `${level * 1.5}rem` }}
				>
					<button
						type="button"
						{...attributes}
						{...listeners}
						aria-label={`Mover ${node.nome || "plano de contas"}`}
						className="flex h-5 w-5 cursor-grab items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 active:cursor-grabbing"
					>
						<GripVertical className="h-4 w-4" aria-hidden="true" />
					</button>

					<button
						type="button"
						onClick={handleToggle}
						aria-label={isExpanded ? "Recolher" : "Expandir"}
						className="flex h-5 w-5 items-center justify-center rounded-sm transition-colors hover:bg-muted"
					>
						<ChevronRight
							className={cn(
								"h-4 w-4 transition-transform",
								isExpanded && "rotate-90",
							)}
							aria-hidden="true"
						/>
					</button>

					{isExpanded ? (
						<FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
					) : (
						<Folder className="h-4 w-4 text-primary" aria-hidden="true" />
					)}

					<div className="flex-1 flex items-center gap-2 min-w-0">
						{node.codigo && (
							<span className="text-muted-foreground text-sm shrink-0">
								{node.codigo}
							</span>
						)}
						<span
							className={cn(
								"text-sm font-medium text-left truncate",
								getTextColorClass(),
							)}
						>
							{node.nome || "Sem nome"}
						</span>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								navigateToEditPlan(node.id);
							}}
							aria-label={`Editar ${node.nome || "plano de contas"}`}
							className="h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
						>
							<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
					</div>

					{node.inativo === 1 && (
						<span className="text-xs text-muted-foreground">(Inativo)</span>
					)}
				</div>

				<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								onClick={(e) => e.stopPropagation()}
								className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
							>
								<MoreVertical className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => navigateToEditPlan(node.id)}>
								<Pencil className="h-4 w-4 mr-2" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleInativar}>
								{node.inativo === 1 ? "Ativar" : "Inativar"}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onClick={handleDelete}>
								<Trash2 className="h-4 w-4 mr-2" />
								Excluir
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{isExpanded && (
				<>
					{children.length > 0 && (
						<div className="mt-1 space-y-0.5">
							{children.map((child) => (
								<TreeNode
									key={child.id}
									node={child}
									level={level + 1}
									idArrastando={idArrastando}
									movendo={movendo}
									dentroDoArrastado={dentroDoArrastado || estaArrastandoEste}
								/>
							))}
						</div>
					)}

					{/* Botão para adicionar novo plano - só aparece se o pai estiver ativo */}
					{node.inativo !== 1 && (
						<button
							onClick={() => navigateToNewPlan(node.id)}
							type="button"
							className="group/add flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 w-full mt-1"
							style={{ paddingLeft: `${(level + 1) * 1.5}rem` }}
						>
							<div className="h-5 w-5 flex items-center justify-center">
								<Plus className="h-4 w-4 text-muted-foreground" />
							</div>
							<span className="text-sm text-muted-foreground">
								Adicionar novo plano
							</span>
						</button>
					)}
				</>
			)}

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir plano de contas</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir o plano de contas "{node.nome}"?
							Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteMutation.mutate()}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
