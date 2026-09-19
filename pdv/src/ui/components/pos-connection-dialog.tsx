import { Check, Copy, QrCode, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";

type ConexaoQrPos = {
	url: string;
	conteudo: string;
	svg: string;
};

async function copiarTexto(texto: string): Promise<void> {
	await navigator.clipboard.writeText(texto);
}

export function PosConnectionDialog() {
	const [aberto, setAberto] = useState(false);
	const [carregando, setCarregando] = useState(false);
	const [conexoes, setConexoes] = useState<ConexaoQrPos[]>([]);
	const [erro, setErro] = useState("");
	const [copiado, setCopiado] = useState("");

	async function carregar() {
		setCarregando(true);
		setErro("");
		try {
			setConexoes(await pdvInvoke<ConexaoQrPos[]>("conexoesQrPos"));
		} catch (err) {
			setConexoes([]);
			setErro(
				err instanceof Error
					? err.message
					: "Não foi possível consultar a API LAN.",
			);
		} finally {
			setCarregando(false);
		}
	}

	useEffect(() => {
		if (!aberto) return;
		void carregar();
		const fechar = (event: KeyboardEvent) => {
			if (event.key === "Escape") setAberto(false);
		};
		window.addEventListener("keydown", fechar);
		return () => window.removeEventListener("keydown", fechar);
	}, [aberto]);

	async function copiar(url: string) {
		try {
			await copiarTexto(url);
			setCopiado(url);
			window.setTimeout(() => setCopiado(""), 2_000);
		} catch {
			setErro("Não foi possível copiar. Selecione a URL exibida abaixo.");
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setAberto(true)}
				className="pdv-touch flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 text-xs font-semibold transition hover:bg-white/15"
				aria-label="Conectar maquininha POS"
				title="Conectar maquininha POS"
			>
				<QrCode className="size-4" />
				<span className="hidden 2xl:inline">Conectar POS</span>
			</button>

			{aberto ? (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 text-foreground backdrop-blur-[2px]"
					role="dialog"
					aria-modal="true"
					aria-labelledby="titulo-conexao-pos"
				>
					<div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
						<div className="flex shrink-0 items-start justify-between gap-4 border-b p-4">
							<div>
								<h2 id="titulo-conexao-pos" className="font-bold">
									Conectar maquininha POS
								</h2>
								<p className="mt-1 text-xs text-muted-foreground">
									No POS Android, toque em “Ler QR do PDV”. Depois faça login
									normalmente; o QR não contém senha nem token.
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => setAberto(false)}
								aria-label="Fechar"
							>
								<X className="size-5" />
							</Button>
						</div>

						<div className="pdv-scrollbar min-h-0 overflow-y-auto p-4">
							{carregando ? (
								<p className="text-sm text-muted-foreground">
									Consultando a rede local…
								</p>
							) : conexoes.length ? (
								<div className="grid gap-3 sm:grid-cols-2">
									{conexoes.map((conexao) => (
										<div
											key={conexao.url}
											className="flex flex-col items-center gap-2 rounded-lg border bg-white p-3 text-slate-950"
										>
											<img
												src={`data:image/svg+xml,${encodeURIComponent(
													conexao.svg,
												)}`}
												alt={`QR para conectar em ${conexao.url}`}
												className="size-44 max-h-[32vh] max-w-[32vh]"
											/>
											<code className="w-full select-all break-all rounded bg-slate-100 p-2 text-center text-xs">
												{conexao.url}
											</code>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => void copiar(conexao.url)}
											>
												{copiado === conexao.url ? (
													<Check className="size-4" />
												) : (
													<Copy className="size-4" />
												)}
												{copiado === conexao.url ? "Copiada" : "Copiar URL"}
											</Button>
										</div>
									))}
								</div>
							) : (
								<div className="space-y-3 text-sm">
									<p>
										Nenhum endereço LAN disponível. Confirme que este é o PDV
										principal e que a API LAN está habilitada.
									</p>
									<Button
										type="button"
										variant="outline"
										onClick={() => void carregar()}
									>
										<RefreshCw className="size-4" />
										Tentar novamente
									</Button>
								</div>
							)}
							{erro ? (
								<p className="mt-3 text-sm text-destructive">{erro}</p>
							) : null}
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
