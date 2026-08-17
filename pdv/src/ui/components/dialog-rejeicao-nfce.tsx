import { useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";

type ResultadoRetransmissao = {
	modo: "online" | "contingencia" | "erro";
	mensagem: string;
};

export function DialogRejeicaoNfce({
	mensagem,
	vendaId,
	onFechar,
	onAutorizada,
}: {
	mensagem: string;
	vendaId: string | null;
	onFechar: () => void;
	onAutorizada?: () => void;
}) {
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [sucesso, setSucesso] = useState<string | null>(null);

	async function retransmitir() {
		if (!vendaId) return;
		setEnviando(true);
		setErro(null);
		try {
			const result = await pdvInvoke<ResultadoRetransmissao>(
				"retransmitirNfce",
				vendaId,
			);
			if (result.modo === "erro") {
				setErro(result.mensagem);
				return;
			}
			setSucesso(result.mensagem);
			onAutorizada?.();
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao retransmitir");
		} finally {
			setEnviando(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="w-[28rem] max-w-[95vw] space-y-4 rounded-lg border border-destructive/40 bg-card p-5">
				<h2 className="text-lg font-semibold text-destructive">
					{sucesso ? "NFC-e retransmitida" : "NFC-e rejeitada"}
				</h2>
				<p className="whitespace-pre-wrap break-words text-sm">
					{sucesso ?? erro ?? mensagem}
				</p>
				{!sucesso ? (
					<p className="text-xs text-muted-foreground">
						A venda já está na retaguarda. Corrija o cadastro/fiscal se
						necessário e retransmita a NFC-e.
					</p>
				) : null}
				<div className="flex flex-col gap-2">
					{vendaId && !sucesso ? (
						<Button
							className="w-full"
							disabled={enviando}
							onClick={() => void retransmitir()}
						>
							{enviando ? "Retransmitindo…" : "Retransmitir NFC-e"}
						</Button>
					) : null}
					<Button
						className="w-full"
						variant={sucesso ? "default" : "secondary"}
						disabled={enviando}
						onClick={onFechar}
					>
						{sucesso ? "Fechar" : "Entendi"}
					</Button>
				</div>
			</div>
		</div>
	);
}
