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
			try {
				setTerminaisPdv(
					await pdvInvoke<TerminalPdvOpcao[]>("listarTerminaisPdv"),
				);
			} catch {
				setTerminaisPdv([]);
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

	async function onTestarPrincipal() {
		setErro("");
		setOkConexao("");
		if (!principalHost.trim()) {
			setErro("Informe o IP do PDV principal.");
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
			if (result.empresas.length === 1) {
				await selecionar(result.empresas[0]);
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
		<div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
			<div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
				<div>
					<div className="text-3xl font-bold">Mais Gestão</div>
					<div className="text-sm opacity-80">PDV Híbrido · Desktop</div>
				</div>
				<div className="space-y-2 rounded-lg bg-black/15 p-4 font-mono text-xs">
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

			<div className="flex items-center justify-center p-6">
				<Card className="w-full max-w-sm">
					<CardHeader>
						<CardTitle className="text-2xl text-primary">
							Acesso ao sistema
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Entre com sua conta Mais Gestão.
						</p>
					</CardHeader>
					<CardContent>
						{empresas.length === 0 ? (
							<form className="space-y-4" onSubmit={(e) => void onLogin(e)}>
								<button
									type="button"
									className="text-xs text-muted-foreground underline underline-offset-2"
									onClick={() => setMostrarConexao((v) => !v)}
								>
									{mostrarConexao
										? "Ocultar conexão"
										: "Configurar conexão / PDV secundário"}
								</button>
								{mostrarConexao && (
									<div className="space-y-3 rounded-md border p-3">
										<div className="space-y-2">
											<Label htmlFor="pdv_modo">Este PDV</Label>
											<Select
												id="pdv_modo"
												value={modo}
												onChange={(e) =>
													setModo(normalizarModo(e.target.value))
												}
											>
												<option value="principal">
													Principal (banco local)
												</option>
												<option value="secundario">
													Secundário (lê o principal)
												</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="numeropdv">Número do PDV</Label>
											<SelectNumeroPdv
												value={numeroPdv}
												terminais={terminaisPdv}
												onChange={setNumeroPdv}
											/>
										</div>
										{modo === "secundario" ? (
											<>
												<div className="space-y-2">
													<Label htmlFor="pdv_principal_host">
														IP do PDV principal
													</Label>
													<Input
														id="pdv_principal_host"
														placeholder="192.168.1.10"
														value={principalHost}
														onChange={(e) => setPrincipalHost(e.target.value)}
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
														onChange={(e) => setPrincipalPorta(e.target.value)}
													/>
												</div>
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
													disabled={testando || loading}
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
									<p className="text-sm text-emerald-700">{okConexao}</p>
								)}
								{erro && <p className="text-sm text-destructive">{erro}</p>}
								<Button className="w-full" size="lg" disabled={loading}>
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
										className="h-14 w-full justify-start text-left"
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
