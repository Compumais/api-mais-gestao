import { DndContext, DragOverlay } from "@dnd-kit/core";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function RootDropZone() {
	return (
		<div
			className={cn(
				"flex items-center gap-4 px-4 min-h-12 rounded-lg transition-colors",
			)}
		>
			<PlusIcon className="h-4 w-4" />
			<p>Arraste e solte aqui para adicionar um novo plano de contas</p>
		</div>
	);
}

export function PlanoContasTreeLoading() {
	return (
		<DndContext>
			<div className="space-y-4">
				<RootDropZone />
				<div className="space-y-1">
					{Array.from({ length: 7 }).map((_, index) => (
						<div
							key={index.toString()}
							className="h-10 w-full bg-muted rounded-md"
						/>
					))}
				</div>
			</div>
			<DragOverlay>
				<div className="rounded-md bg-card p-2 shadow-lg border">Item</div>
			</DragOverlay>
		</DndContext>
	);
}
