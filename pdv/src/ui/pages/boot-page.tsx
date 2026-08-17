import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { marcarBootConcluido, marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, type StatusPdv } from "@/lib/pdv-types";
import { Button } from "@/ui/components/ui/button";

export function BootPage() {
	const navigate = useNavigate();
	const [mensagens, setMensagens] = useState<
		Array<{ id: number; texto: string }>
	>([]);
	const [erro, setErro] = useState("");
	const [status, setStatus] = useState<StatusPdv | null>(null);
	const proximoId = useRef(0);

	function addMsg(texto: string) {
		const id = proximoId.current++;
		setMensagens((prev) => [...prev, { id, texto }]);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: deve rodar apenas uma vez ao montar
	useEffect(() => {
		void iniciar();
	}, []);

	async function iniciar() {
		try {
			addMsg("Verificando sessão...");
			const statusAtual = await pdvInvoke<StatusPdv>("getStatus");
			setStatus(statusAtual);
			if (!statusAtual.sessao.logado) {
				addMsg("Nenhuma sessão ativa.");
				marcarBootPendente();
				navigate("/login", { replace: true });
				return;
			}
			addMsg(`Sessão ativa: ${statusAtual.sessao.username ?? ""}`);

			if (statusAtual.modo === "secundario") {
				addMsg(
					`PDV secundário nº ${statusAtual.numeropdv} — conectando no principal...`,
				);
				try {
					await pdvInvoke("conectarPrincipal");
					const sync = await pdvInvoke<{
						pull: { produtos: number; grupos: number; atalhos: number };
					}>("syncAgora");
					addMsg(
						`Catálogo do principal: ${sync.pull.produtos} produtos · ${sync.pull.grupos} grupos · ${sync.pull.atalhos} atalhos`,
					);
				} catch (err) {
					const mensagem =
						err instanceof Error
							? err.message
							: "Não foi possível conectar no PDV principal.";
					if (/duplicad|mesmo|é o do PDV principal/i.test(mensagem)) {
						marcarBootConcluido();
						setErro(mensagem);
						return;
					}
					addMsg(`Principal indisponível: ${mensagem}`);
					addMsg("Operação ficará bloqueada até o principal voltar.");
				}
			} else if (statusAtual.online) {
				addMsg("Conectando à API...");
				addMsg("Sincronizando produtos, grupos e atalhos...");
				try {
					const sync = await pdvInvoke<{
						pull: { produtos: number; atalhos: number; grupos: number };
						pendentes: number;
					}>("syncAgora");
					addMsg(
						`${sync.pull.produtos} produtos · ${sync.pull.grupos} grupos · ${sync.pull.atalhos} atalhos`,
					);
					if (sync.pendentes > 0) {
						addMsg(
							`${sync.pendentes} registro(s) pendente(s) na fila de sincronização.`,
						);
					}
				} catch {
					addMsg("Falha ao sincronizar agora — seguindo com dados locais.");
				}
			} else {
				addMsg("Sem conexão com a API — operando em modo offline.");
			}

			const atualizado = await pdvInvoke<StatusPdv>("getStatus");
			marcarBootConcluido();
			if (atualizado.caixa) {
				addMsg("Caixa aberto. Entrando...");
				navigate(rotaHomePdv(atualizado), { replace: true });
			} else {
				addMsg("Caixa fechado. Solicitando abertura...");
				navigate("/abertura-caixa", { replace: true });
			}
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao iniciar o PDV");
		}
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary p-6 text-primary-foreground">
			<div className="text-center">
				<div className="text-3xl font-bold">Mais Gestão</div>
				<div className="text-sm opacity-80">PDV Híbrido · iniciando</div>
			</div>
			<div className="w-full max-w-md space-y-2 rounded-lg bg-black/15 p-4 font-mono text-sm">
				{mensagens.map((m) => (
					<div key={m.id} className="flex items-start gap-2">
						<span className="opacity-70">›</span>
						<span>{m.texto}</span>
					</div>
				))}
				{erro && <div className="text-red-200">Erro: {erro}</div>}
			</div>
			{erro && (
				<div className="flex gap-2">
					{status?.podeConfigurar ? (
						<Button
							variant="secondary"
							onClick={() => navigate("/config", { replace: true })}
						>
							Ir para configurações
						</Button>
					) : null}
					<Button
						variant="secondary"
						onClick={() => navigate("/login", { replace: true })}
					>
						Ir para o login
					</Button>
				</div>
			)}
		</div>
	);
}
