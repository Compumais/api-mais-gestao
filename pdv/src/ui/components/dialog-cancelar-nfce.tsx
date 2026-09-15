import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

const MINIMO_JUSTIFICATIVA = 15;

type ResultadoCancelamento = {
	modo: "cancelada";
	mensagem: string;
};

export function DialogCancelarNfce({
	aberto,
	vendaId,
	onFechar,
	onSucesso,
}: {
	aberto: boolean;
	vendaId: string | null;
	onFechar: () => void;
	onSucesso?: (mensagem: string) => void;
}) {
	const [justificativa, setJustificativa] = useState("");
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	useEscapeFechaModal(aberto, onFechar);

	useEffect(() => {
		if (aberto) {
			setJustificativa("");
			setErro(null);
		}
	}, [aberto]);

	if (!aberto || !vendaId) return null;

	const normalizada = justificativa.trim().replace(/\s+/g, " ");
	const podeEnviar = normalizada.length >= MINIMO_JUSTIFICATIVA && !enviando;

	async function confirmar() {
		if (!vendaId || !podeEnviar) return;
		setEnviando(true);
		setErro(null);
		try {
			const result = await pdvInvoke<ResultadoCancelamento>(
				"cancelarNfce",
				vendaId,
				normalizada,
			);
			onSucesso?.(result.mensagem);
			onFechar();
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao cancelar");
		} finally {
			setEnviando(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<form
				className="pdv-surface w-[28rem] max-w-[95vw] space-y-4 p-5"
				onSubmit={(e) => {
					e.preventDefault();
					void confirmar();
				}}
			>
				<h2 className="text-lg font-semibold">Cancelar NFC-e</h2>
				<p className="text-sm text-muted-foreground">
					Cancela a NFC-e autorizada na SEFAZ (prazo de 24 horas após a emissão).
					A numeração não fica disponível para reuso.
				</p>
				<textarea
					autoFocus
					className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					maxLength={255}
					placeholder="Justificativa com no mínimo 15 caracteres"
					value={justificativa}
					onChange={(e) => setJustificativa(e.target.value)}
				/>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>
						{normalizada.length}/{MINIMO_JUSTIFICATIVA} mínimos
					</span>
					<span>{justificativa.length}/255</span>
				</div>
				{erro ? <p className="text-sm text-destructive">{erro}</p> : null}
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						disabled={enviando}
						onClick={onFechar}
					>
						Voltar
					</Button>
					<Button
						type="submit"
						variant="destructive"
						className="flex-1"
						disabled={!podeEnviar}
					>
						{enviando ? "Cancelando…" : "Confirmar cancelamento"}
					</Button>
				</div>
			</form>
		</div>
	);
}
