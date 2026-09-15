import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ResultadoCancelamento = {
	modo: "cancelada";
	mensagem: string;
};

export function DialogCancelarVendaNaoFiscal({
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
	const [senha, setSenha] = useState("");
	const [exigeSenha, setExigeSenha] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	useEscapeFechaModal(aberto, onFechar);

	useEffect(() => {
		if (!aberto) return;
		setSenha("");
		setErro(null);
		setExigeSenha(false);
		void (async () => {
			try {
				const exige = await pdvInvoke<boolean>("senhaGerencialExigida");
				setExigeSenha(Boolean(exige));
			} catch {
				setExigeSenha(false);
			}
		})();
	}, [aberto]);

	if (!aberto || !vendaId) return null;

	const podeEnviar = !enviando && (!exigeSenha || senha.trim().length > 0);

	async function confirmar() {
		if (!vendaId || !podeEnviar) return;
		setEnviando(true);
		setErro(null);
		try {
			const result = await pdvInvoke<ResultadoCancelamento>(
				"cancelarVendaNaoFiscal",
				vendaId,
				{
					senha: exigeSenha ? senha : undefined,
					motivo: "Cancelamento de venda não fiscal pelo PDV",
				},
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
				<h2 className="text-lg font-semibold">Cancelar venda</h2>
				<p className="text-sm text-muted-foreground">
					Cancela a venda finalizada sem NFC-e autorizada e estorna estoque e
					financeiro na retaguarda (quando sincronizada). Não envia cancelamento
					à SEFAZ.
				</p>
				{exigeSenha ? (
					<Input
						type="password"
						autoFocus
						value={senha}
						onChange={(e) => setSenha(e.target.value)}
						placeholder="Senha gerencial"
					/>
				) : null}
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
