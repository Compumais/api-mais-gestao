"use client";

import { AlertCircle, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ContaPreviewImportacao } from "@/services/plano-contas.service";

interface PreviewImportacaoTreeProps {
	contas: ContaPreviewImportacao[];
}

interface NoPreview {
	conta: ContaPreviewImportacao;
	filhos: NoPreview[];
	possuiErroNaSubarvore: boolean;
}

function construirArvore(contas: ContaPreviewImportacao[]): NoPreview[] {
	const noPorCodigo = new Map<string, NoPreview>();
	const raizes: NoPreview[] = [];

	for (const conta of contas) {
		const no: NoPreview = { conta, filhos: [], possuiErroNaSubarvore: false };
		// Códigos duplicados/inválidos podem colidir; mantém o primeiro no mapa
		if (conta.codigo && !noPorCodigo.has(conta.codigo)) {
			noPorCodigo.set(conta.codigo, no);
		}

		const pai = conta.codigoPai ? noPorCodigo.get(conta.codigoPai) : undefined;

		if (pai) {
			pai.filhos.push(no);
		} else {
			raizes.push(no);
		}
	}

	const marcarErros = (no: NoPreview): boolean => {
		let possuiErro = no.conta.erros.length > 0;
		for (const filho of no.filhos) {
			if (marcarErros(filho)) {
				possuiErro = true;
			}
		}
		no.possuiErroNaSubarvore = possuiErro;
		return possuiErro;
	};

	for (const raiz of raizes) {
		marcarErros(raiz);
	}

	return raizes;
}

function descricaoTipo(tipomovimento: "E" | "S" | null): string {
	if (tipomovimento === "E") {
		return "Receita";
	}
	if (tipomovimento === "S") {
		return "Despesa";
	}
	return "—";
}

function NoPreviewItem({ no, nivel }: { no: NoPreview; nivel: number }) {
	// Nós com erro em algum descendente iniciam expandidos para facilitar a correção
	const [expandido, setExpandido] = useState(
		nivel === 0 || no.possuiErroNaSubarvore,
	);
	const { conta } = no;
	const possuiErro = conta.erros.length > 0;

	return (
		<div>
			<div
				className={cn(
					"flex flex-col gap-1 rounded-md px-2 py-1.5",
					possuiErro && "border border-destructive/50 bg-destructive/10",
				)}
				style={{ marginLeft: `${nivel * 1.25}rem` }}
			>
				<div className="flex items-center gap-2">
					{no.filhos.length > 0 ? (
						<button
							type="button"
							onClick={() => setExpandido(!expandido)}
							aria-label={expandido ? "Recolher" : "Expandir"}
							className="flex h-5 w-5 items-center justify-center rounded-sm transition-colors hover:bg-muted"
						>
							<ChevronRight
								className={cn(
									"h-4 w-4 transition-transform",
									expandido && "rotate-90",
								)}
								aria-hidden="true"
							/>
						</button>
					) : (
						<span className="h-5 w-5" aria-hidden="true" />
					)}

					{possuiErro && (
						<AlertCircle
							className="h-4 w-4 shrink-0 text-destructive"
							aria-hidden="true"
						/>
					)}

					<span className="text-sm text-muted-foreground">{conta.codigo}</span>
					<span className="flex-1 truncate text-sm font-medium">
						{conta.nome || "Sem descrição"}
					</span>
					<span
						className={cn(
							"text-xs",
							conta.tipomovimento === "E" &&
								"text-green-800 dark:text-green-500",
							conta.tipomovimento === "S" && "text-red-800 dark:text-red-500",
						)}
					>
						{descricaoTipo(conta.tipomovimento)}
					</span>
					<span className="text-xs text-muted-foreground">
						Nível {conta.nivel}
					</span>
					{conta.inativo === 1 && (
						<span className="text-xs text-muted-foreground">(Inativo)</span>
					)}
				</div>

				{possuiErro && (
					<ul className="ml-7 list-disc space-y-0.5 pl-4" aria-live="polite">
						{conta.erros.map((erro) => (
							<li key={erro} className="text-xs text-destructive">
								Linha {conta.linha}: {erro}
							</li>
						))}
					</ul>
				)}
			</div>

			{expandido && no.filhos.length > 0 && (
				<div className="mt-0.5 space-y-0.5">
					{no.filhos.map((filho) => (
						<NoPreviewItem
							key={`${filho.conta.linha}-${filho.conta.codigo}`}
							no={filho}
							nivel={nivel + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function PreviewImportacaoTree({ contas }: PreviewImportacaoTreeProps) {
	const arvore = useMemo(() => construirArvore(contas), [contas]);

	return (
		<div className="max-h-80 space-y-0.5 overflow-y-auto rounded-md border p-2">
			{arvore.map((no) => (
				<NoPreviewItem
					key={`${no.conta.linha}-${no.conta.codigo}`}
					no={no}
					nivel={0}
				/>
			))}
		</div>
	);
}
