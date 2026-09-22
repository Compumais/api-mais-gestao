"use client";

import { useState } from "react";
import {
	BlocoErrorBoundary,
	BlocoErrorBoundarySlot,
} from "@/components/bloco-error-boundary";
import { Button } from "@/components/ui/button";

function BlocoQueQuebra({ ativo }: { ativo: boolean }) {
	if (ativo) {
		throw new Error("Erro forçado para testar BlocoErrorBoundary");
	}
	return (
		<p className="text-sm text-muted-foreground">
			Bloco íntegro — o shell e o cabeçalho devem permanecer se o irmão quebrar.
		</p>
	);
}

export default function TesteBoundaryPage() {
	const [quebrarA, setQuebrarA] = useState(false);
	const [quebrarB, setQuebrarB] = useState(false);

	return (
		<main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
			<header className="space-y-1">
				<h1 className="text-xl font-semibold">Teste BlocoErrorBoundary</h1>
				<p className="text-sm text-muted-foreground">
					Página temporária de verificação — este cabeçalho não deve sumir.
				</p>
			</header>

			<section className="space-y-2 rounded-lg border p-4">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-sm font-medium">Bloco A (filho direto)</h2>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setQuebrarA(true)}
					>
						Forçar erro A
					</Button>
				</div>
				<BlocoErrorBoundary titulo="Erro no bloco A" variante="compacto">
					<BlocoQueQuebra ativo={quebrarA} />
				</BlocoErrorBoundary>
			</section>

			<section className="space-y-2 rounded-lg border p-4">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-sm font-medium">Bloco B (slot / miolo)</h2>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setQuebrarB(true)}
					>
						Forçar erro B
					</Button>
				</div>
				<BlocoErrorBoundary titulo="Erro no bloco B" variante="painel">
					<BlocoErrorBoundarySlot
						render={() => <BlocoQueQuebra ativo={quebrarB} />}
					/>
				</BlocoErrorBoundary>
			</section>
		</main>
	);
}
