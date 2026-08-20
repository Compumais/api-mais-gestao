"use client";

import type { RelatorioAuditoriaFiscal } from "@/schemas/relatorio-fiscal.schema";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

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
			<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Auditoria fiscal</DialogTitle>
					<DialogDescription>
						A SEFAZ não substitui esta validação. Classificação:{" "}
						{relatorio.classificacao_final.replaceAll("_", " ")}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 text-sm">
					<p>
						Confiança: <strong>{relatorio.nivel_confianca}</strong>
					</p>
					<p>
						ST: {relatorio.decisao.st} · DIFAL: {relatorio.decisao.difal} · FCP:{" "}
						{relatorio.decisao.fcp}
					</p>
					<p>
						CFOP {relatorio.decisao.cfop ?? "—"} · CSOSN{" "}
						{relatorio.decisao.csosn ?? "—"} · CST {relatorio.decisao.cst ?? "—"}
					</p>
					<ul className="list-disc space-y-1 pl-4">
						{relatorio.validacoes
							.filter((item) => item.status !== "VALIDO")
							.map((item) => (
								<li key={`${item.code}-${item.message}`}>{item.message}</li>
							))}
					</ul>
					{relatorio.regras_aplicadas.length > 0 && (
						<p className="text-muted-foreground">
							Regras: {relatorio.regras_aplicadas.join(", ")}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
