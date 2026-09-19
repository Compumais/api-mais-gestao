import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { marcarBootConcluido, marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, type StatusPdv } from "@/lib/pdv-types";
import { LogoMaisGestao } from "@/ui/components/logo-mais-gestao";
import { Button } from "@/ui/components/ui/button";

type ResultadoCarga = {
	produtos: number;
	grupos: number;
	gruposGourmet?: number;
	atalhos: number;
	clientes?: number;
	bandeiras?: number;
	meiosPagamento?: number;
	acessoNegado?: boolean;
	origem?: "nuvem" | "principal";
	reutilizado?: boolean;
};

/**
 * Boot na abertura do PDV: valida sessão e dispara a mesma carga local do
 * botão em Config (catálogo). Falha na carga não impede o uso (dados locais).
 */
export function BootPage() {
	const navigate = useNavigate();
	const [mensagens, setMensagens] = useState<
		Array<{ id: number; texto: string }>
	>([]);
	const [erro, setErro] = useState("");
	const [status, setStatus] = useState<StatusPdv | null>(null);
	const proximoId = useRef(0);
	const iniciou = useRef(false);

	function addMsg(texto: string) {
		const id = proximoId.current++;
		setMensagens((prev) => [...prev, { id, texto }]);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: deve rodar apenas uma vez ao montar
	useEffect(() => {
		if (iniciou.current) return;
		iniciou.current = true;
		void iniciar();
	}, []);

	async function carregarCatalogoAutomatico(modo: StatusPdv["modo"]): Promise<{
		ok: boolean;
		acessoNegado?: boolean;
	}> {
		addMsg(
			modo === "secundario"
				? "Carga local automática (PDV principal)..."
				: "Carga local automática (nuvem)...",
		);
		try {
			const carga = await pdvInvoke<ResultadoCarga>("cargaLocal");
			if (carga.acessoNegado) {
				return { ok: false, acessoNegado: true };
			}
			const origem =
				carga.origem === "principal" ? "PDV principal" : "nuvem (API)";
			addMsg(
				`Carga da ${origem}: ${carga.produtos} produtos · ${carga.grupos} grupos · ${carga.gruposGourmet ?? 0} gourmet · ${carga.atalhos} atalhos · ${carga.clientes ?? 0} clientes`,
			);
			return { ok: true };
		} catch (err) {
			const mensagem =
				err instanceof Error ? err.message : "Falha na carga local automática";
			console.error("[pdv] carga automática na abertura:", mensagem);
			addMsg(`${mensagem} — seguindo com dados locais.`);
			return { ok: false };
		}
	}

	async function processarFilaSePossivel(modo: StatusPdv["modo"]) {
		if (modo === "secundario") return;
		try {
			const fila = await pdvInvoke<{
				pendentes: number;
			}>("processarOutboxAgora");
			if (fila.pendentes > 0) {
				addMsg(
					`${fila.pendentes} registro(s) pendente(s) na fila de sincronização.`,
				);
			}
		} catch {
			// fila opcional; carga já ocorreu (ou falhou de forma isolada)
		}
	}

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
			if (!statusAtual.sessao.idempresa) {
				addMsg("Selecione a empresa para continuar.");
				marcarBootPendente();
				navigate("/login", { replace: true });
				return;
			}
			addMsg(`Sessão ativa: ${statusAtual.sessao.username ?? ""}`);
			try {
				const avisoBackup = await pdvInvoke<string>(
					"consumirAvisoBackupEmpresa",
				);
				if (avisoBackup) {
					addMsg(avisoBackup);
				}
			} catch {
				// aviso opcional
			}

			if (statusAtual.modo === "secundario") {
				addMsg(
					`PDV secundário nº ${statusAtual.numeropdv} — conectando no principal...`,
				);
				try {
					await pdvInvoke("conectarPrincipal");
					const carga = await carregarCatalogoAutomatico("secundario");
					if (carga.acessoNegado) {
						addMsg(
							"Usuário sem acesso à empresa anterior. Selecione a empresa correta.",
						);
						marcarBootPendente();
						navigate("/login", { replace: true });
						return;
					}
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
				const carga = await carregarCatalogoAutomatico("principal");
				if (carga.acessoNegado) {
					addMsg(
						"Usuário sem acesso à empresa anterior. Selecione a empresa correta.",
					);
					marcarBootPendente();
					navigate("/login", { replace: true });
					return;
				}
				await processarFilaSePossivel("principal");
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
		<div className="relative flex min-h-screen flex-col items-center justify-center gap-7 overflow-hidden bg-sidebar p-6 text-sidebar-foreground">
			<div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-blue-500/15 blur-3xl" />
			<div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-cyan-400/10 blur-3xl" />
			<div className="text-center">
				<LogoMaisGestao variante="branco" className="mx-auto h-16" />
				<div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
					PDV Híbrido · iniciando
				</div>
			</div>
			<div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
				<div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
					<span className="size-2 animate-pulse rounded-full bg-cyan-300" />
					<span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-65">
						Preparando terminal
					</span>
				</div>
				<div className="max-h-72 space-y-2 overflow-auto p-5 font-mono text-sm">
				{mensagens.map((m) => (
					<div key={m.id} className="flex items-start gap-2">
						<span className="text-cyan-300">›</span>
						<span className="text-sidebar-foreground/85">{m.texto}</span>
					</div>
				))}
				{erro && <div className="text-red-200">Erro: {erro}</div>}
				</div>
			</div>
			{erro && (
				<div className="relative flex flex-wrap justify-center gap-2">
					{status?.podeConfigurar ? (
						<Button
							variant="secondary"
							className="pdv-touch"
							onClick={() => navigate("/config", { replace: true })}
						>
							Ir para configurações
						</Button>
					) : null}
					<Button
						variant="secondary"
						className="pdv-touch"
						onClick={() => navigate("/login", { replace: true })}
					>
						Ir para o login
					</Button>
				</div>
			)}
		</div>
	);
}
