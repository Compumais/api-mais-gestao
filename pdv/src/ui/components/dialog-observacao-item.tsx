import { useEffect, useState } from "react";
import {
	LIMITE_OBSERVACAO_ITEM,
	normalizarObservacaoItem,
} from "@/lib/observacao-item";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export function DialogObservacaoItem({
	aberto,
	descricao,
	valorInicial,
	onCancelar,
	onConfirmar,
}: {
	aberto: boolean;
	descricao: string;
	valorInicial?: string | null;
	onCancelar: () => void;
	onConfirmar: (observacao: string | null) => void;
}) {
	const [texto, setTexto] = useState("");
	useEscapeFechaModal(aberto, onCancelar);

	useEffect(() => {
		if (aberto) setTexto(valorInicial ?? "");
	}, [aberto, valorInicial]);

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<form
				className="pdv-surface w-full max-w-md space-y-4 p-5"
				onSubmit={(e) => {
					e.preventDefault();
					onConfirmar(normalizarObservacaoItem(texto));
				}}
			>
				<div>
					<h2 className="text-lg font-semibold">Observação</h2>
					<p className="text-sm text-muted-foreground">{descricao}</p>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="observacao-item">
						Anotação para a produção (opcional)
					</Label>
					<textarea
						id="observacao-item"
						autoFocus
						rows={3}
						maxLength={LIMITE_OBSERVACAO_ITEM}
						value={texto}
						onChange={(e) => setTexto(e.target.value)}
						placeholder="Ex.: sem cebola, bem passado"
						className="flex min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
					/>
					<p className="text-right text-xs text-muted-foreground">
						{texto.trim().length}/{LIMITE_OBSERVACAO_ITEM}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button type="submit" className="flex-1">
						Salvar
					</Button>
				</div>
			</form>
		</div>
	);
}
