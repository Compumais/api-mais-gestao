import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	SelectNumeroPdv,
	type TerminalPdvOpcao,
} from "@/ui/components/select-numero-pdv";
import { Button } from "@/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/ui/components/ui/card";
import { LogoMaisGestao } from "@/ui/components/logo-mais-gestao";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Select } from "@/ui/components/ui/select";

type Empresa = { id: string; nome: string };
type ModoPdv = "principal" | "secundario";

function normalizarModo(valor: string | undefined): ModoPdv {
	return valor === "secundario" ? "secundario" : "principal";
}

export function LoginPage() {
	const navigate = useNavigate();
	const [apiUrl, setApiUrl] = useState("");
	const [modo, setModo] = useState<ModoPdv>("principal");
	const [principalHost, setPrincipalHost] = useState("");
	const [principalPorta, setPrincipalPorta] = useState("5050");
	const [numeroPdv, setNumeroPdv] = useState("1");
	const [mostrarConexao, setMostrarConexao] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [erro, setErro] = useState("");
	const [okConexao, setOkConexao] = useState("");
	const [loading, setLoading] = useState(false);
	const [testando, setTestando] = useState(false);
	const [empresas, setEmpresas] = useState<Empresa[]>([]);
	const [username, setUsername] = useState("");
	const [terminaisPdv, setTerminaisPdv] = useState<TerminalPdvOpcao[]>([]);
	const [terminaisBuscados, setTerminaisBuscados] = useState(false);
	const [buscandoTerminais, setBuscandoTerminais] = useState(false);
	const [numeropdvPrincipal, setNumeropdvPrincipal] = useState<number | null>(
		null,
	);

	useEffect(() => {
		void (async () => {
			const cfg = await pdvInvoke<Record<string, string>>("getConfig");
			setApiUrl(cfg.api_url ?? "http://localhost:3333");
			const modoCfg = normalizarModo(cfg.pdv_modo);
			setModo(modoCfg);
			setPrincipalHost(cfg.pdv_principal_host ?? "");
			setPrincipalPorta(cfg.pdv_principal_porta || "5050");
			setNumeroPdv(cfg.numeropdv || "1");
			if (modoCfg === "secundario") {
				setMostrarConexao(true);
			}
			if (modoCfg !== "secundario") {
				try {
					setTerminaisPdv(
						await pdvInvoke<TerminalPdvOpcao[]>("listarTerminaisPdv"),
					);
				} catch {
					setTerminaisPdv([]);
				}
			}
			try {
				const status = await pdvInvoke<{
					sessao: {
						logado: boolean;
						username: string | null;
						idempresa: string | null;
					};
				}>("getStatus");
				if (status.sessao.logado && !status.sessao.idempresa) {
					const lista = await pdvInvoke<Empresa[]>("listarEmpresasSessao");
					setUsername(status.sessao.username ?? "");
					setEmpresas(lista);
					if (lista.length === 0) {
						setErro("Nenhuma empresa vinculada a este usuário.");
					}
				}
			} catch {
				// sem sessão — permanece no formulário de login
			}
		})();
	}, []);

	function payloadConexao(): Record<string, string> {
		const dados: Record<string, string> = {
			pdv_modo: modo,
			numeropdv: numeroPdv.trim() || "1",
			pdv_principal_host: principalHost.trim(),
			pdv_principal_porta: principalPorta.trim() || "5050",
		};
		const url = apiUrl.trim().replace(/\/$/, "");
		if (url) {
			dados.api_url = url;
		}
		return dados;
	}

	async function aplicarConfigSalva() {
		const cfg = await pdvInvoke<Record<string, string>>("getConfig");
		if (cfg.api_url) {
			setApiUrl(cfg.api_url);
		}
	}

	async function salvarConexao() {
		if (modo === "secundario" && !principalHost.trim()) {
			throw new Error("Informe o IP do PDV principal.");
		}
		if (modo === "secundario" && !numeroPdv.trim()) {
			throw new Error(
				"Busque os números no principal e selecione o deste PDV secundário.",
			);
		}
		if (modo === "principal" && !apiUrl.trim()) {
			throw new Error("Informe a URL da API");
		}
		await pdvInvoke("saveConfig", payloadConexao());
		await aplicarConfigSalva();
	}

	async function onSalvarConexao() {
		setErro("");
		setOkConexao("");
		setLoading(true);
		try {
			await salvarConexao();
			setOkConexao(
				modo === "secundario"
					? "PDV secundário salvo. A URL da API é puxada do principal."
					: "Conexão salva.",
			);
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao salvar conexão");
		} finally {
			setLoading(false);
		}
	}

	async function onBuscarTerminaisPrincipal() {
		setErro("");
		setOkConexao("");
		if (!principalHost.trim()) {
			setErro("Informe o IP do PDV principal.");
			return;
		}
		setBuscandoTerminais(true);
		try {
			const result = await pdvInvoke<{
				numeropdvPrincipal: number;
				terminais: TerminalPdvOpcao[];
				mensagem: string;
			}>("buscarTerminaisPrincipal", {
				host: principalHost.trim(),
				porta: principalPorta.trim() || "5050",
			});
			setTerminaisPdv(result.terminais);
			setNumeropdvPrincipal(result.numeropdvPrincipal);
			setTerminaisBuscados(true);
			const livre = result.terminais.find((t) => t.disponivel !== false);
			if (livre) {
				setNumeroPdv(String(livre.numeropdv));
			} else {
				setNumeroPdv("");
			}
			setOkConexao(result.mensagem);
		} catch (err) {
			setTerminaisBuscados(false);
			setTerminaisPdv([]);
			setNumeropdvPrincipal(null);
			setErro(
				err instanceof Error
					? err.message
					: "Falha ao buscar números no principal",
			);
		} finally {
			setBuscandoTerminais(false);
		}
	}

	async function onTestarPrincipal() {
		setErro("");
		setOkConexao("");
		if (!principalHost.trim()) {
			setErro("Informe o IP do PDV principal.");
			return;
		}
		if (!numeroPdv.trim()) {
			setErro("Busque os números no principal e selecione o deste PDV.");
			return;
		}
		setTestando(true);
		try {
			const result = await pdvInvoke<{ mensagem: string }>("testarPrincipal", {
				host: principalHost.trim(),
				porta: principalPorta.trim() || "5050",
				numeropdv: numeroPdv.trim() || "1",
			});
			setOkConexao(result.mensagem);
		} catch (err) {
			setErro(
				err instanceof Error ? err.message : "Falha ao conectar no principal",
			);
		} finally {
			setTestando(false);
		}
	}

	async function onLogin(e: React.FormEvent) {
		e.preventDefault();
		setErro("");
		setOkConexao("");
		setLoading(true);
		try {
			await salvarConexao();
			const result = await pdvInvoke<{ username: string; empresas: Empresa[] }>(
				"login",
				email,
				password,
			);
			setUsername(result.username);
			setEmpresas(result.empresas);
			if (result.empresas.length === 0) {
				setErro("Nenhuma empresa vinculada a este usuário.");
				return;
			}
			const unica = result.empresas[0];
			if (result.empresas.length === 1 && unica) {
				await selecionar(unica);
			}
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha no login");
		} finally {
			setLoading(false);
		}
	}

	async function selecionar(empresa: Empresa) {
		setLoading(true);
		try {
			await pdvInvoke("selecionarEmpresa", empresa.id, empresa.nome);
			marcarBootPendente();
			navigate("/boot", { replace: true });
		} catch (err) {
			setErro(
				err instanceof Error ? err.message : "Falha ao selecionar empresa",
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="grid h-screen grid-cols-1 overflow-hidden bg-slate-100 dark:bg-slate-950 lg:grid-cols-[minmax(24rem,0.9fr)_1.1fr]">
			<div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14">
				<div>
					<LogoMaisGestao variante="branco" className="h-16" />
					<div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
						PDV Híbrido · Desktop
					</div>
				</div>
				<div>
					<h1 className="max-w-md text-4xl font-bold leading-tight">
						Operação rápida, segura e conectada.
					</h1>
					<p className="mt-4 max-w-md text-sm leading-6 opacity-70">
						Acesse seu terminal para iniciar o turno e sincronizar os dados da
						empresa.
					</p>
				</div>
				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs">
					<div>› Aguardando autenticação...</div>
					<div>
						› Modo:{" "}
						{modo === "secundario"
							? `secundário · principal ${principalHost || "não definido"}:${principalPorta || "5050"}`
							: "principal (banco local)"}
					</div>
					<div>› PDV nº {numeroPdv || "1"}</div>
					<div>› API configurada: {apiUrl || "não definida"}</div>
					<div>› Operação offline-first com sincronização automática.</div>
				</div>
				<div className="text-xs opacity-70">v0.1.0</div>
			</div>

			<div className="pdv-scrollbar flex min-h-0 items-center justify-center overflow-y-auto p-4 sm:p-8">
				<Card className="w-full max-w-md border-t-4 border-t-blue-600 py-0 shadow-xl ring-slate-950/10">
					<CardHeader className="border-b bg-slate-50 px-6 py-5 dark:bg-slate-900/50">
						<LogoMaisGestao className="mb-2 h-12 lg:hidden" />
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
							Bem-vindo
						</p>
						<CardTitle className="text-2xl font-bold text-slate-950 dark:text-slate-50">
							Acesso ao sistema
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Entre com sua conta Mais Gestão.
						</p>
					</CardHeader>
					<CardContent className="p-6">
						{empresas.length === 0 ? (
							<form className="space-y-4" onSubmit={(e) => void onLogin(e)}>
								<button
									type="button"
									className="pdv-touch rounded-md px-2 text-xs font-medium text-primary underline underline-offset-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
									onClick={() => setMostrarConexao((v) => !v)}
								>
									{mostrarConexao
										? "Ocultar conexão"
										: "Configurar conexão / PDV secundário"}
								</button>
								{mostrarConexao && (
									<div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
										<div className="space-y-2">
											<Label htmlFor="pdv_modo">Este PDV</Label>
											<Select
												id="pdv_modo"
												value={modo}
												onChange={(e) => {
													const proximo = normalizarModo(e.target.value);
													setModo(proximo);
													setTerminaisBuscados(false);
													setTerminaisPdv([]);
													setNumeropdvPrincipal(null);
													setOkConexao("");
													setErro("");
													if (proximo === "principal") {
														void pdvInvoke<TerminalPdvOpcao[]>(
															"listarTerminaisPdv",
														)
															.then(setTerminaisPdv)
															.catch(() => setTerminaisPdv([]));
													}
												}}
											>
												<option value="principal">
													Principal (banco local)
												</option>
												<option value="secundario">
													Secundário (lê o principal)
												</option>
											</Select>
										</div>
										{modo === "secundario" ? (
											<>
												<div className="space-y-2">
													<Label htmlFor="pdv_principal_host">
														1. IP do PDV principal
													</Label>
													<Input
														id="pdv_principal_host"
														placeholder="192.168.1.10"
														value={principalHost}
														onChange={(e) => {
															setPrincipalHost(e.target.value);
															setTerminaisBuscados(false);
															setTerminaisPdv([]);
															setNumeropdvPrincipal(null);
														}}
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="pdv_principal_porta">
														Porta LAN do principal
													</Label>
													<Input
														id="pdv_principal_porta"
														type="number"
														min={1}
														value={principalPorta}
														onChange={(e) => {
															setPrincipalPorta(e.target.value);
															setTerminaisBuscados(false);
															setTerminaisPdv([]);
															setNumeropdvPrincipal(null);
														}}
													/>
												</div>
												<div className="flex flex-wrap gap-2">
													<Button
														type="button"
														variant="secondary"
														size="sm"
														disabled={
															buscandoTerminais ||
															loading ||
															!principalHost.trim()
														}
														onClick={() => void onBuscarTerminaisPrincipal()}
													>
														{buscandoTerminais
															? "Buscando…"
															: "2. Buscar números no principal"}
													</Button>
												</div>
												{terminaisBuscados ? (
													<div className="space-y-2">
														<Label htmlFor="numeropdv">
															3. Número deste PDV secundário
															{numeropdvPrincipal
																? ` (principal é o nº ${numeropdvPrincipal})`
																: ""}
														</Label>
														<SelectNumeroPdv
															value={numeroPdv}
															terminais={terminaisPdv}
															somenteDisponiveis
															onChange={setNumeroPdv}
															ajuda="Só aparecem números cadastrados no retaguarda que não são o do principal e não estão em uso."
														/>
													</div>
												) : (
													<p className="text-xs text-muted-foreground">
														Depois de informar o IP, busque os números no
														principal para escolher um PDV livre (evita
														conflito com o nº do principal).
													</p>
												)}
												<p className="text-xs text-muted-foreground">
													Produtos e configurações de negócio vêm do principal.
													A URL da API também é puxada de lá ao conectar.
												</p>
												<div className="space-y-2">
													<Label htmlFor="api_url_sec">
														URL da API (opcional)
													</Label>
													<Input
														id="api_url_sec"
														type="url"
														placeholder="deixe em branco para usar a do principal"
														value={apiUrl}
														onChange={(e) => setApiUrl(e.target.value)}
													/>
												</div>
											</>
										) : (
											<>
												<div className="space-y-2">
													<Label htmlFor="numeropdv">Número do PDV</Label>
													<SelectNumeroPdv
														value={numeroPdv}
														terminais={terminaisPdv}
														onChange={setNumeroPdv}
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="api_url">URL da API</Label>
													<Input
														id="api_url"
														type="url"
														placeholder="https://api.seudominio.com"
														value={apiUrl}
														onChange={(e) => setApiUrl(e.target.value)}
													/>
													<p className="text-xs text-muted-foreground">
														Ex.: https://api.compuchat.space ou
														http://localhost:3333
													</p>
												</div>
											</>
										)}
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={loading}
												onClick={() => void onSalvarConexao()}
											>
												Salvar conexão
											</Button>
											{modo === "secundario" ? (
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={
														testando ||
														loading ||
														!terminaisBuscados ||
														!numeroPdv.trim()
													}
													onClick={() => void onTestarPrincipal()}
												>
													{testando ? "Testando…" : "Testar principal"}
												</Button>
											) : null}
										</div>
									</div>
								)}
								<div className="space-y-2">
									<Label htmlFor="email">E-mail</Label>
									<Input
										id="email"
										type="email"
										autoComplete="username"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="password">Senha</Label>
									<Input
										id="password"
										type="password"
										autoComplete="current-password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>
								</div>
								{okConexao && (
									<p className="text-sm text-primary">{okConexao}</p>
								)}
								{erro && <p className="text-sm text-destructive">{erro}</p>}
								<Button className="pdv-touch w-full" size="lg" disabled={loading}>
									{loading ? "Entrando..." : "Entrar"}
								</Button>
							</form>
						) : (
							<div className="space-y-3">
								<p className="text-sm">
									Olá, <strong>{username}</strong>. Selecione a empresa:
								</p>
								{empresas.map((empresa) => (
									<Button
										key={empresa.id}
										variant="outline"
										className="pdv-touch h-14 w-full justify-start border-blue-200 bg-white text-left hover:bg-blue-50 dark:border-blue-900 dark:bg-card dark:hover:bg-blue-950/30"
										disabled={loading}
										onClick={() => void selecionar(empresa)}
									>
										{empresa.nome}
									</Button>
								))}
								{erro && <p className="text-sm text-destructive">{erro}</p>}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
