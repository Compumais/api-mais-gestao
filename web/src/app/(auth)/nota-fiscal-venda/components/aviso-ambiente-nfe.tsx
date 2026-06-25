"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvisoAmbienteNfeProps {
	ambiente: number | null | undefined;
	className?: string;
}

export function AvisoAmbienteNfe({ ambiente, className }: AvisoAmbienteNfeProps) {
	if (!ambiente) return null;

	const ehHomologacao = ambiente === 2;

	if (ehHomologacao) {
		return (
			<div
				className={cn(
					"flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800",
					className,
				)}
				role="alert"
			>
				<Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
				<div className="text-sm">
					<span className="font-semibold">Ambiente de Homologação (Teste)</span>
					{" — "}
					As NF-es emitidas neste ambiente <strong>não possuem valor fiscal</strong>.
					Utilize para testes e validação antes de emitir em produção.
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800",
				className,
			)}
			role="alert"
		>
			<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
			<div className="text-sm">
				<span className="font-semibold">Ambiente de Produção</span>
				{" — "}
				As NF-es emitidas neste ambiente possuem <strong>validade fiscal</strong>.
				Certifique-se de que os dados estão corretos antes de emitir.
			</div>
		</div>
	);
}
