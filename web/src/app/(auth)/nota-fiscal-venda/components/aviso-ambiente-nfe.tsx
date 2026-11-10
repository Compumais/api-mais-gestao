"use client";

import { Info } from "lucide-react";
import { AlertaVencimentoCertificado } from "@/components/alerta-vencimento-certificado";
import { useAlertaVencimentoCertificado } from "@/hooks/use-alerta-vencimento-certificado";
import { cn } from "@/lib/utils";

interface AvisoAmbienteNfeProps {
	ambiente: number | null | undefined;
	className?: string;
}

export function AvisoAmbienteNfe({
	ambiente,
	className,
}: AvisoAmbienteNfeProps) {
	const { alerta } = useAlertaVencimentoCertificado();
	const emHomologacao = ambiente === 2;

	if (!emHomologacao && !alerta) return null;

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<AlertaVencimentoCertificado />
			{emHomologacao && (
				<div
					className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800"
					role="alert"
				>
					<Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
					<div className="text-sm">
						<span className="font-semibold">
							Ambiente de Homologação (Teste)
						</span>
						{" — "}
						As notas deste ambiente <strong>não possuem valor fiscal</strong>,{" "}
						<strong>não movimentam estoque</strong> e{" "}
						<strong>não geram financeiro</strong>. A listagem mostra apenas
						operações de homologação.
					</div>
				</div>
			)}
		</div>
	);
}
