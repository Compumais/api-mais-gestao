import { DndContext } from "@dnd-kit/core";
import { FileIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "../../../../components/ui/button";

export function PlanoContasTreeEmpty() {
	return (
		<DndContext>
			<div className="space-y-4">
				<Button className="w-full justify-start" variant="secondary" asChild>
					<Link href="/plano-contas/novo">
						<PlusIcon className="h-4 w-4" />
						Adicionar plano de contas
					</Link>
				</Button>
				<div className="flex flex-col items-center justify-center h-full mt-8">
					<div className="flex items-center gap-2 mb-4">
						<p className="text-xl font-bold flex items-center gap-2">
							<FileIcon className="!size-6" />
							Nenhum plano de contas encontrado
						</p>
					</div>
					<p className="text-sm text-muted-foreground">
						Adicione um novo plano de contas para começar a organizar suas
						contas.
					</p>
				</div>
			</div>
		</DndContext>
	);
}
