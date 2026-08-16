import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/ui/components/ui/card";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

type Empresa = { id: string; nome: string };

export function LoginPage() {
	const navigate = useNavigate();
	const [apiUrl, setApiUrl] = useState("");
	const [mostrarConexao, setMostrarConexao] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [erro, setErro] = useState("");
	const [loading, setLoading] = useState(false);
	const [empresas, setEmpresas] = useState<Empresa[]>([]);
	const [username, setUsername] = useState("");

	useEffect(() => {
		void pdvInvoke<Record<string, string>>("getConfig").then((cfg) => {
			setApiUrl(cfg.api_url ?? "http://localhost:3333");
		});
	}, []);

	async function salvarApiUrl() {
		const url = apiUrl.trim().replace(/\/$/, "");
		if (!url) {
			setErro("Informe a URL da API");
			return;
		}
		await pdvInvoke("saveConfig", { api_url: url });
		setApiUrl(url);
	}

	async function onLogin(e: React.FormEvent) {
		e.preventDefault();
		setErro("");
		setLoading(true);
		try {
			await salvarApiUrl();
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
									{mostrarConexao ? "Ocultar conexão" : "Configurar conexão"}
								</button>
								{mostrarConexao && (
									<div className="space-y-2 rounded-md border p-3">
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
