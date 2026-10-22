"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	type CentroCustoNoArvore,
	centroCustoService,
} from "@/services/centro-custo.service";

interface CentroCustoTreeNodeProps {
	node: CentroCustoNoArvore;
	level?: number;
}

export function CentroCustoTreeNode({
	node,
	level = 0,
}: CentroCustoTreeNodeProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [expanded, setExpanded] = useState(level < 2);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const { mutate: excluir, isPending } = useMutation({
		mutationFn: () => centroCustoService.deletar(node.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
			toast.success("Centro de custo excluído");
			setConfirmDelete(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir centro de custo");
		},
	});

	const hasChildren = node.filhos.length > 0;
	const codigo = node.codigoreduzido || node.codigoextenso;

	return (
		<div>
			<div
				className={cn(
					"flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/50",
					node.inativo === 1 && "opacity-60",
				)}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
			>
				<button
					type="button"
					className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
					onClick={() => setExpanded((v) => !v)}
					aria-label={expanded ? "Recolher" : "Expandir"}
					disabled={!hasChildren}
				>
					<ChevronRight
						className={cn(
							"h-4 w-4 transition-transform",
							expanded && "rotate-90",
							!hasChildren && "opacity-0",
						)}
					/>
				</button>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium truncate">
							{codigo ? `${codigo} - ` : ""}
							{node.nome}
						</span>
						{node.tipogestao ? (
							<Badge variant="outline">{node.tipogestao}</Badge>
						) : null}
						{node.inativo === 1 ? (
							<Badge variant="secondary">Inativo</Badge>
						) : null}
					</div>
					{node.descricao ? (
						<p className="text-xs text-muted-foreground truncate">
							{node.descricao}
						</p>
					) : null}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-muted"
							aria-label="Abrir menu de ações"
						>
							<MoreVertical className="h-4 w-4" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() =>
								router.push(
									`/centros-custo/novo?idcentrocustopai=${node.id}`,
								)
							}
						>
							<Plus className="h-4 w-4" />
							Incluir filho
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href={`/centros-custo/${node.id}/editar`}>
								<Pencil className="h-4 w-4" />
								Editar
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setConfirmDelete(true)}
						>
							<Trash2 className="h-4 w-4" />
							Excluir
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{expanded &&
				node.filhos.map((filho) => (
					<CentroCustoTreeNode key={filho.id} node={filho} level={level + 1} />
				))}

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação não pode ser desfeita. Centros com vínculos podem ser
							bloqueados pela API.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => excluir()}
							disabled={isPending}
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
