"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { RelatorioAuditoriaFiscal } from "@/schemas/relatorio-fiscal.schema";

type DialogRelatorioFiscalProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	relatorio: RelatorioAuditoriaFiscal | null;
};

export function DialogRelatorioFiscal({
	aberto,
	onAbertoChange,
	relatorio,
}: DialogRelatorioFiscalProps) {
	if (!relatorio) return null;

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Auditoria fiscal</DialogTitle>
					<DialogDescription>
						A SEFAZ não substitui esta validação. Classificação:{" "}
						{relatorio.classificacao_final.replaceAll("_", " ")}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 text-sm">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
						<div>
							<span className="block text-xs font-medium uppercase text-muted-foreground">
								Confiança
							</span>
							<span className="font-semibold text-foreground">
								{relatorio.nivel_confianca}
							</span>
						</div>
						<div>
							<span className="block text-xs font-medium uppercase text-muted-foreground">
								Tributos
							</span>
							<span className="text-foreground">
								ST: {relatorio.decisao.st} · DIFAL: {relatorio.decisao.difal} · FCP:{" "}
								{relatorio.decisao.fcp}
							</span>
						</div>
						<div>
							<span className="block text-xs font-medium uppercase text-muted-foreground">
								Enquadramento
							</span>
							<span className="text-foreground">
								CFOP {relatorio.decisao.cfop ?? "—"} · CSOSN{" "}
								{relatorio.decisao.csosn ?? "—"} · CST {relatorio.decisao.cst ?? "—"}
							</span>
						</div>
					</div>

					{relatorio.validacoes.filter((item) => item.status !== "VALIDO").length >
						0 && (
						<div className="space-y-2">
							<span className="block text-xs font-medium uppercase text-muted-foreground">
								Validações e Alertas
							</span>
							<ul className="list-disc space-y-1.5 pl-4 text-sm">
								{relatorio.validacoes
									.filter((item) => item.status !== "VALIDO")
									.map((item) => (
										<li key={`${item.code}-${item.message}`}>{item.message}</li>
									))}
							</ul>
						</div>
					)}

					{relatorio.regras_aplicadas.length > 0 && (
						<div className="space-y-1 text-xs text-muted-foreground">
							<span className="font-medium">Regras aplicadas:</span>{" "}
							<span>{relatorio.regras_aplicadas.join(", ")}</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
