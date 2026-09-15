"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type BotaoExportarCsvProps = {
	onExportar: () => void;
	isPending?: boolean;
	disabled?: boolean;
};

export function BotaoExportarCsv({
	onExportar,
	isPending = false,
	disabled = false,
}: BotaoExportarCsvProps) {
	return (
		<Button
			type="button"
			variant="outline"
			className="gap-2"
			onClick={onExportar}
			disabled={disabled || isPending}
		>
			<FileDown className="size-4" aria-hidden="true" />
			{isPending ? "Exportando..." : "Exportar CSV"}
		</Button>
	);
}
