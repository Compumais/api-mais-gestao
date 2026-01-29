"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ChevronRight,
	Folder,
	FolderOpen,
	Loader2,
	MoreVertical,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import { usePlanoContas } from "@/hooks/use-plano-contas";
import { cn } from "@/lib/utils";
import {
	type PlanoContas,
	planoContasService,
} from "@/services/plano-contas.service";

interface TreeNodeProps {
	node: PlanoContas;
	level?: number;
}

export function TreeNode({ node, level = 0 }: TreeNodeProps) {
	const { empresa } = useEmpresa();
	const [isExpanded, setIsExpanded] = useState(false);
	const [hasLoadedChildren, setHasLoadedChildren] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(node.nome || "");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();
	const empresaIdRef = useRef<string | undefined>(empresa?.id);
	const inputRef = useRef<HTMLInputElement>(null);

	// Reseta o estado quando a empresa muda para forçar recarregamento
	useEffect(() => {
		if (empresaIdRef.current !== empresa?.id) {
			empresaIdRef.current = empresa?.id;
			setHasLoadedChildren(false);
			setIsExpanded(false);
		}
	}, [empresa?.id]);

	// Carrega filhos quando expandir
	const { data: childrenData, isLoading: isLoadingChildren } = usePlanoContas({
		idempresa: empresa?.id,
		idplanocontas: node.id,
		limit: 100,
		enabled: isExpanded && !hasLoadedChildren && !!empresa?.id,
	});

	const children = childrenData?.data || [];

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		transform,
		isDragging,
	} = useDraggable({
		id: node.id,
		data: {
			type: "plano-contas",
			node,
		},
	});

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: node.id,
		data: {
			type: "plano-contas",
			node,
			accepts: ["plano-contas"],
		},
	});

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
			}
		: undefined;

	const isDraggingOver = isOver && !isDragging;

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsExpanded(!isExpanded);
	};

	const navigateToNewPlan = (planId: string) => {
		router.push(`/plano-contas/novo?idplanocontas=${planId}`);
	};

	// Quando os filhos são carregados, marca como carregado
	useEffect(() => {
		if (isExpanded && childrenData && !hasLoadedChildren) {
			setHasLoadedChildren(true);
		}
	}, [isExpanded, childrenData, hasLoadedChildren]);

	// Foca no input quando entrar em modo de edição
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	// Atualiza o nome editado quando o node mudar
	useEffect(() => {
		setEditedName(node.nome || "");
	}, [node.nome]);

	const updateMutation = useMutation({
		mutationFn: (data: { nome?: string; inativo?: 0 | 1 }) =>
			planoContasService.atualizar(node.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas atualizado com sucesso");
			setIsEditing(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar plano de contas");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => planoContasService.deletar(node.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas excluído com sucesso");
			setShowDeleteDialog(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir plano de contas");
		},
	});

	const handleNameClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isEditing) {
			setIsEditing(true);
		}
	};

	const handleNameSave = () => {
		if (editedName.trim() && editedName !== node.nome) {
			updateMutation.mutate({ nome: editedName.trim() });
		} else {
			setEditedName(node.nome || "");
			setIsEditing(false);
		}
	};

	const handleNameCancel = () => {
		setEditedName(node.nome || "");
		setIsEditing(false);
	};

	const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleNameSave();
		} else if (e.key === "Escape") {
			handleNameCancel();
		}
	};

	const handleInativar = () => {
		const novoStatus = node.inativo ? 0 : 1;
		updateMutation.mutate({ inativo: novoStatus });
	};

	const handleDelete = () => {
		setShowDeleteDialog(true);
	};

	return (
		<div>
			<div
				ref={(node) => {
					setDragRef(node);
					setDropRef(node);
				}}
				style={style}
				className={cn(
					"group relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
					isDragging && "opacity-50",
					isDraggingOver && "bg-primary/10 ring-2 ring-primary",
					!isDragging && "hover:bg-muted/50",
				)}
			>
				<div
					className="flex flex-1 items-center gap-2"
					style={{ paddingLeft: `${level * 1.5}rem` }}
				>
					<button
						type="button"
						onClick={handleToggle}
						className="flex h-5 w-5 items-center justify-center rounded-sm transition-colors hover:bg-muted"
					>
						{isLoadingChildren ? (
							<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
						) : (
							<ChevronRight
								className={cn(
									"h-4 w-4 transition-transform",
									isExpanded && "rotate-90",
								)}
							/>
						)}
					</button>

					{isExpanded ? (
						<FolderOpen className="h-4 w-4 text-primary" />
					) : (
						<Folder className="h-4 w-4 text-primary" />
					)}

					<div className="flex-1 flex items-center gap-2">
						{node.codigo && (
							<span className="text-muted-foreground text-sm">
								{node.codigo}
							</span>
						)}
						{isEditing ? (
							<div className="flex items-center gap-1 flex-1">
								<Input
									ref={inputRef}
									value={editedName}
									onChange={(e) => setEditedName(e.target.value)}
									onBlur={handleNameSave}
									onKeyDown={handleNameKeyDown}
									className="h-7 text-sm"
									onClick={(e) => e.stopPropagation()}
								/>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleNameSave();
									}}
									className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleNameCancel();
									}}
									className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={handleNameClick}
								className="text-sm font-medium text-left hover:underline focus:outline-none focus:underline"
							>
								{node.nome || "Sem nome"}
							</button>
						)}
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

					{/** biome-ignore lint/a11y/noStaticElementInteractions: False positive */}
					<div
						{...attributes}
						{...listeners}
						className="cursor-grab active:cursor-grabbing rounded p-1"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						onKeyUp={(e) => e.stopPropagation()}
					>
						<div className="h-4 w-4 rounded border-2 border-dashed border-muted-foreground/30" />
					</div>
				</div>
			</div>

			{isExpanded && (
				<>
					{hasLoadedChildren && children.length > 0 && (
						<div className="mt-1 space-y-0.5">
							{children.map((child) => (
								<TreeNode key={child.id} node={child} level={level + 1} />
							))}
						</div>
					)}

					{/* Botão para adicionar novo plano */}
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
