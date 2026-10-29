import { useEffect, useState } from "react";
import {
	LIMITE_OBSERVACAO_PEDIDO,
	normalizarObservacaoPedido,
} from "@/lib/observacao-pedido";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export type ConfirmacaoObservacaoPedido = {
	observacao: string | null;
	mesaFisica: string | null;
	localizacao: string | null;
};

export function DialogObservacaoPedido({
	aberto,
	loading,
	pedirMesaLocal,
	onCancelar,
	onConfirmar,
}: {
	aberto: boolean;
	loading?: boolean;
	/** Em modo comanda: pede mesa física e localização para a impressão. */
	pedirMesaLocal?: boolean;
	onCancelar: () => void;
	onConfirmar: (dados: ConfirmacaoObservacaoPedido) => void;
}) {
	const [texto, setTexto] = useState("");
	const [mesaFisica, setMesaFisica] = useState("");
	const [localizacao, setLocalizacao] = useState("");
	useEscapeFechaModal(aberto, onCancelar);

	useEffect(() => {
		if (aberto) {
			setTexto("");
			setMesaFisica("");
			setLocalizacao("");
		}
	}, [aberto]);

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
			<form
				className="pdv-surface w-full max-w-md space-y-4 p-5"
				onSubmit={(e) => {
					e.preventDefault();
					onConfirmar({
						observacao: normalizarObservacaoPedido(texto),
						mesaFisica: pedirMesaLocal
							? mesaFisica.trim() || null
							: null,
						localizacao: pedirMesaLocal
							? localizacao.trim() || null
							: null,
					});
				}}
			>
				<div>
					<h2 className="text-lg font-semibold">
						{pedirMesaLocal
							? "Finalizar envio do pedido"
							: "Observação do pedido"}
					</h2>
					<p className="text-sm text-muted-foreground">
						{pedirMesaLocal
							? "Mesa e localização serão impressas no pedido de produção."
							: "Será impressa junto com o pedido de produção (opcional)."}
					</p>
				</div>
				{pedirMesaLocal ? (
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="mesa-fisica-pedido">Mesa</Label>
							<Input
								id="mesa-fisica-pedido"
								autoFocus
								value={mesaFisica}
								disabled={loading}
								maxLength={40}
								placeholder="Ex.: 12"
								onChange={(e) => setMesaFisica(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="localizacao-pedido">Localização</Label>
							<Input
								id="localizacao-pedido"
								value={localizacao}
								disabled={loading}
								maxLength={80}
								placeholder="Ex.: salão, terraço"
								onChange={(e) => setLocalizacao(e.target.value)}
							/>
						</div>
					</div>
				) : null}
				<div className="space-y-1.5">
					<Label htmlFor="observacao-pedido">Observação</Label>
					<textarea
						id="observacao-pedido"
						autoFocus={!pedirMesaLocal}
						rows={4}
						maxLength={LIMITE_OBSERVACAO_PEDIDO}
						value={texto}
						disabled={loading}
						onChange={(e) => setTexto(e.target.value)}
						placeholder="Ex.: sem pimenta, urgente, aniversário"
						className="flex min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
					/>
					<p className="text-right text-xs text-muted-foreground">
						{texto.trim().length}/{LIMITE_OBSERVACAO_PEDIDO}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						disabled={loading}
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button type="submit" className="flex-1" disabled={loading}>
						{loading ? "Enviando..." : "Adicionar itens"}
					</Button>
				</div>
			</form>
		</div>
	);
}
