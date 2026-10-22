"use client";

import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DefinicaoColunaUi = {
	id: string;
	label: string;
	enableHiding?: boolean;
};

type PersonalizarColunasDropdownProps<TData> = {
	table: Table<TData>;
	definicoes: DefinicaoColunaUi[];
	disabled?: boolean;
};

export function PersonalizarColunasDropdown<TData>({
	table,
	definicoes,
	disabled,
}: PersonalizarColunasDropdownProps<TData>) {
	const visibilidade = table.getState().columnVisibility;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={disabled}>
					<IconLayoutColumns className="size-4" />
					<span className="hidden lg:inline">Personalizar Colunas</span>
					<span className="lg:hidden">Colunas</span>
					<IconChevronDown className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="max-h-[min(24rem,70vh)] w-64 overflow-y-auto"
			>
				{definicoes
					.filter((def) => def.enableHiding !== false)
					.map((def) => {
						const coluna = table.getColumn(def.id);
						const visivel = coluna
							? coluna.getIsVisible()
							: visibilidade[def.id] !== false;

						if (!coluna?.getCanHide()) return null;

						return (
							<DropdownMenuCheckboxItem
								key={def.id}
								checked={visivel}
								onSelect={(event) => event.preventDefault()}
								onCheckedChange={(value) => {
									coluna.toggleVisibility(!!value);
								}}
							>
								{def.label}
							</DropdownMenuCheckboxItem>
						);
					})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
