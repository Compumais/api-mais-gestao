import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotuloModelo, type StatusContext } from "@/lib/pdv-types";
import { aplicarTema } from "@/lib/theme";
import { FunctionBar } from "@/ui/components/function-bar";
import { Topbar } from "@/ui/components/topbar";
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

type Config = Record<string, string>;

type MapeamentoGourmet = {
	idgrupogourmet: string;
	nome: string;
	destino: string;
	impressora_nome: string;
	host: string;
	porta: number;
};

export function ConfigPage() {
	const navigate = useNavigate();
	const { refresh } = useOutletContext<StatusContext>();
	const [config, setConfig] = useState<Config>({});
	const [impressoras, setImpressoras] = useState<
		Array<{ name: string; isDefault: boolean }>
	>([]);
	const [mapeamentoGourmet, setMapeamentoGourmet] = useState<
		MapeamentoGourmet[]
	>([]);
	const [lanIps, setLanIps] = useState<string[]>([]);
	const [testando, setTestando] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [msg, setMsg] = useState("");
	const [statusTecnibra, setStatusTecnibra] = useState<{
		enabled: boolean;
		lastSyncAt?: string;
		lastSuccessAt?: string;
		lastError?: string | null;
		commandCount: number;
		targetPath: string;
	} | null>(null);
	const [statusSitef, setStatusSitef] = useState<{
		habilitado: boolean;
		disponivel: boolean;
		plataforma: string;
		dllEncontrada: boolean;
		dllPath: string | null;
		portaPinPad?: string | null;
		mensagem: string;
	} | null>(null);
	const rotulo = rotuloModelo(
		config.modelo_atendimento === "comanda" ? "comanda" : "mesa",
	);

	useEffect(() => {
		void (async () => {
			setConfig(await pdvInvoke<Config>("getConfig"));
			try {
				setImpressoras(await pdvInvoke("listarImpressoras"));
			} catch {
				setImpressoras([]);
			}
			try {
				setMapeamentoGourmet(
					await pdvInvoke<MapeamentoGourmet[]>(
						"listarMapeamentoImpressorasGourmet",
					),
				);
			} catch {
				setMapeamentoGourmet([]);
			}
			try {
				const lan = await pdvInvoke<{ ips: string[] }>("statusLan");
				setLanIps(lan.ips ?? []);
			} catch {
				setLanIps([]);
			}
			try {
				setStatusTecnibra(await pdvInvoke("statusTecnibra"));
			} catch {
				setStatusTecnibra(null);
			}
			try {
				setStatusSitef(await pdvInvoke("sitef.status"));
			} catch {
				setStatusSitef(null);
			}
		})();
	}, []);

	function set(chave: string, valor: string) {
		setConfig((prev) => ({ ...prev, [chave]: valor }));
	}

	async function salvar() {
		setLoading(true);
		setMsg("");
		try {
			const saved = await pdvInvoke<Config>("saveConfig", {
				database_url: config.database_url ?? "",
				api_url: config.api_url ?? "",
				numeropdv: config.numeropdv ?? "1",
				qtd_mesas: config.qtd_mesas ?? "20",
				modelo_atendimento: config.modelo_atendimento ?? "mesa",
				tempo_ociosidade_min: config.tempo_ociosidade_min ?? "15",
				emitir_nfce: config.emitir_nfce ?? "1",
				tema: config.tema ?? "light",
				pix_chave: config.pix_chave ?? "",
				impressora_nome: config.impressora_nome ?? "",
				impressora_tipo: config.impressora_tipo ?? "sistema",
				impressora_host: config.impressora_host ?? "",
				impressora_porta: config.impressora_porta ?? "9100",
				certificado_path: config.certificado_path ?? "",
				certificado_senha: config.certificado_senha ?? "",
				lan_habilitada: config.lan_habilitada ?? "1",
				lan_porta: config.lan_porta ?? "5050",
				tecnibra_habilitada: config.tecnibra_habilitada ?? "0",
				tecnibra_xml_path:
					config.tecnibra_xml_path ??
					"C:\\Tecnibra\\IHM Receptora\\Comandas.xml",
				tecnibra_intervalo_ms: config.tecnibra_intervalo_ms ?? "3000",
				tecnibra_xml_root: config.tecnibra_xml_root ?? "Comandas",
				tecnibra_xml_item: config.tecnibra_xml_item ?? "Comanda",
				sitef_habilitado: config.sitef_habilitado ?? "0",
				sitef_ip: config.sitef_ip ?? "127.0.0.1",
				sitef_loja: config.sitef_loja ?? "00000000",
				sitef_terminal: config.sitef_terminal ?? "PD000001",
				sitef_parametros: config.sitef_parametros ?? "",
				sitef_porta_pinpad: config.sitef_porta_pinpad ?? "",
				sitef_dll_path: config.sitef_dll_path ?? "",
			});
			setConfig((prev) => ({ ...prev, ...saved }));
			try {
				await pdvInvoke(
					"salvarMapeamentoImpressorasGourmet",
					mapeamentoGourmet,
				);
			} catch {
				// mapeamento opcional
			}
			aplicarTema(saved.tema ?? config.tema);
			await refresh();
			try {
				setStatusTecnibra(await pdvInvoke("statusTecnibra"));
			} catch {
				setStatusTecnibra(null);
			}
			try {
				setStatusSitef(await pdvInvoke("sitef.status"));
			} catch {
				setStatusSitef(null);
			}
			setMsg("Configurações salvas");
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao salvar");
		} finally {
			setLoading(false);
		}
	}

	async function testarDestino(
		id: string,
		destino: {
			tipo: "sistema" | "rede" | "arquivo";
			nome?: string;
			host?: string;
			porta?: number;
		},
	) {
		if (destino.tipo === "rede" && !destino.host?.trim()) {
			setMsg("Informe o IP da impressora de rede");
			return;
		}
		if (
			id !== "fiscal" &&
			destino.tipo === "sistema" &&
			!destino.nome?.trim()
		) {
			setMsg("Selecione a impressora do Windows");
			return;
		}
		setTestando(id);
		setMsg("");
		try {
			const result = await pdvInvoke<{ ok: boolean; modo: string }>(
				"testarImpressora",
				destino,
			);
			setMsg(
				result.ok
					? `Teste enviado (${result.modo})`
					: "Não foi possível testar a impressora",
			);
		} catch (err) {
			setMsg(
				err instanceof Error ? err.message : "Falha no teste de impressão",
			);
		} finally {
			setTestando(null);
		}
	}

	function atualizarGourmet(
		idgrupogourmet: string,
		patch: Partial<MapeamentoGourmet>,
	) {
		setMapeamentoGourmet((prev) =>
			prev.map((item) =>
				item.idgrupogourmet === idgrupogourmet ? { ...item, ...patch } : item,
			),
		);
	}

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title="Configurações do PDV"
				subtitle="API, hardware, fiscal e preferências locais"
				right={
					<Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
						Voltar
					</Button>
				}
			/>

			<div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-auto p-4">
				<Card>
					<CardHeader>
						<CardTitle>Conexão e PDV</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="database_url">PostgreSQL local</Label>
							<Input
								id="database_url"
								value={config.database_url ?? ""}
								onChange={(e) => set("database_url", e.target.value)}
								placeholder="postgresql://pdv:pdv@127.0.0.1:5433/pdv_local"
							/>
							<p className="text-xs text-muted-foreground">
								Banco local do PDV (não é o Postgres da API). Padrão:
								postgresql://pdv:pdv@127.0.0.1:5433/pdv_local
							</p>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="api_url">URL da API</Label>
							<Input
								id="api_url"
								value={config.api_url ?? ""}
								onChange={(e) => set("api_url", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="numeropdv">Número do PDV</Label>
							<Input
								id="numeropdv"
								value={config.numeropdv ?? "1"}
								onChange={(e) => set("numeropdv", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="modelo_atendimento">Modelo de atendimento</Label>
							<Select
								id="modelo_atendimento"
								value={config.modelo_atendimento ?? "mesa"}
								onChange={(e) => set("modelo_atendimento", e.target.value)}
							>
								<option value="mesa">Mesas</option>
								<option value="comanda">Comandas</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="qtd_mesas">
								Quantidade de {rotulo.plural.toLowerCase()}
							</Label>
							<Input
								id="qtd_mesas"
								type="number"
								min={1}
								value={config.qtd_mesas ?? "20"}
								onChange={(e) => set("qtd_mesas", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tempo_ociosidade_min">
								Tempo para ociosidade
							</Label>
							<Select
								id="tempo_ociosidade_min"
								value={config.tempo_ociosidade_min ?? "15"}
								onChange={(e) => set("tempo_ociosidade_min", e.target.value)}
							>
								<option value="15">15 minutos</option>
								<option value="30">30 minutos</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="emitir_nfce">Emitir NFC-e</Label>
							<Select
								id="emitir_nfce"
								value={config.emitir_nfce ?? "1"}
								onChange={(e) => set("emitir_nfce", e.target.value)}
							>
								<option value="1">Sim</option>
								<option value="0">Não</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tema">Tema</Label>
							<Select
								id="tema"
								value={config.tema ?? "light"}
								onChange={(e) => set("tema", e.target.value)}
							>
								<option value="light">Claro</option>
								<option value="dark">Escuro</option>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="pix_chave">Chave PIX</Label>
							<Input
								id="pix_chave"
								value={config.pix_chave ?? ""}
								onChange={(e) => set("pix_chave", e.target.value)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>POS na LAN</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="lan_habilitada">Expor API para o POS</Label>
							<Select
								id="lan_habilitada"
								value={config.lan_habilitada ?? "1"}
								onChange={(e) => set("lan_habilitada", e.target.value)}
							>
								<option value="1">Sim</option>
								<option value="0">Não</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="lan_porta">Porta</Label>
							<Input
								id="lan_porta"
								type="number"
								min={1}
								value={config.lan_porta ?? "5050"}
								onChange={(e) => set("lan_porta", e.target.value)}
							/>
						</div>
						<p className="sm:col-span-2 text-xs text-muted-foreground">
							O POS Android aponta para http://IP-DESTA-MAQUINA:
							{config.lan_porta || "5050"}. IPs desta máquina:{" "}
							{lanIps.length ? lanIps.join(", ") : "nenhum detectado"}. No
							emulador use 10.0.2.2.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Catraca Tecnibra</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="tecnibra_habilitada">Integração</Label>
							<Select
								id="tecnibra_habilitada"
								value={config.tecnibra_habilitada ?? "0"}
								onChange={(e) => set("tecnibra_habilitada", e.target.value)}
							>
								<option value="0">Desligada</option>
								<option value="1">Ligada</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tecnibra_intervalo_ms">
								Intervalo de sync (ms)
							</Label>
							<Input
								id="tecnibra_intervalo_ms"
								type="number"
								min={1000}
								value={config.tecnibra_intervalo_ms ?? "3000"}
								onChange={(e) => set("tecnibra_intervalo_ms", e.target.value)}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="tecnibra_xml_path">Caminho do XML</Label>
							<Input
								id="tecnibra_xml_path"
								value={
									config.tecnibra_xml_path ??
									"C:\\Tecnibra\\IHM Receptora\\Comandas.xml"
								}
								onChange={(e) => set("tecnibra_xml_path", e.target.value)}
							/>
						</div>
						<p className="sm:col-span-2 text-xs text-muted-foreground">
							A receptora lê este arquivo: comanda presente = saída bloqueada;
							ausente = liberada. Pasta padrão da IHM: C:\Tecnibra\IHM
							Receptora\Comandas.xml
							{statusTecnibra
								? ` — ${statusTecnibra.commandCount} pendente(s)${
										statusTecnibra.lastError
											? `. ${statusTecnibra.lastError}`
											: statusTecnibra.lastSuccessAt
												? `. Última sync ok.`
												: ""
									}`
								: ""}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>SiTef (TEF)</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="sitef_habilitado">Integração</Label>
							<Select
								id="sitef_habilitado"
								value={config.sitef_habilitado ?? "0"}
								onChange={(e) => set("sitef_habilitado", e.target.value)}
							>
								<option value="0">Desligada (cartão manual)</option>
								<option value="1">Ligada</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="sitef_ip">IP do SiTef</Label>
							<Input
								id="sitef_ip"
								value={config.sitef_ip ?? "127.0.0.1"}
								onChange={(e) => set("sitef_ip", e.target.value)}
								placeholder="127.0.0.1"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="sitef_loja">Código da loja</Label>
							<Input
								id="sitef_loja"
								value={config.sitef_loja ?? "00000000"}
								onChange={(e) => set("sitef_loja", e.target.value)}
								placeholder="00000000"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="sitef_terminal">Terminal</Label>
							<Input
								id="sitef_terminal"
								value={config.sitef_terminal ?? "PD000001"}
								onChange={(e) => set("sitef_terminal", e.target.value)}
								placeholder="PD000001"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="sitef_porta_pinpad">Porta do PIN pad</Label>
							<Input
								id="sitef_porta_pinpad"
								value={config.sitef_porta_pinpad ?? ""}
								onChange={(e) => set("sitef_porta_pinpad", e.target.value)}
								placeholder="COM5"
							/>
							<p className="text-xs text-muted-foreground">
								USB aparece como COM virtual no Gerenciador de Dispositivos.
							</p>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="sitef_parametros">Parâmetros extras</Label>
							<Input
								id="sitef_parametros"
								value={config.sitef_parametros ?? ""}
								onChange={(e) => set("sitef_parametros", e.target.value)}
								placeholder="[ParmsClient=1=...]"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="sitef_dll_path">
								Caminho da DLL CliSiTef (opcional)
							</Label>
							<Input
								id="sitef_dll_path"
								value={config.sitef_dll_path ?? ""}
								onChange={(e) => set("sitef_dll_path", e.target.value)}
								placeholder="C:\SiTef\CliSiTef64I.dll"
							/>
						</div>
						<p className="sm:col-span-2 text-xs text-muted-foreground">
							A CliSiTef roda só no processo main, em Windows. Sem a DLL ou fora
							do Windows, o pagamento misto continua e o cartão entra manual.
							{statusSitef
								? ` ${statusSitef.disponivel ? "SiTef pronto." : statusSitef.mensagem}`
								: ""}
							{statusSitef?.dllPath ? ` DLL: ${statusSitef.dllPath}` : ""}
							{statusSitef?.portaPinPad
								? ` PIN pad: ${statusSitef.portaPinPad}`
								: ""}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Impressora fiscal / cupom</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="impressora_tipo">Conexão</Label>
							<Select
								id="impressora_tipo"
								value={config.impressora_tipo ?? "sistema"}
								onChange={(e) => set("impressora_tipo", e.target.value)}
							>
								<option value="sistema">Sistema (USB / Windows)</option>
								<option value="rede">Rede (IP :9100)</option>
								<option value="arquivo">Arquivo (depuração)</option>
							</Select>
						</div>
						{(config.impressora_tipo ?? "sistema") === "sistema" ? (
							<div className="space-y-2">
								<Label htmlFor="impressora_nome">Impressora do Windows</Label>
								<Select
									id="impressora_nome"
									value={config.impressora_nome ?? ""}
									onChange={(e) => set("impressora_nome", e.target.value)}
								>
									<option value="">Padrão do Windows</option>
									{impressoras.map((p) => (
										<option key={p.name} value={p.name}>
											{p.name}
											{p.isDefault ? " (padrão)" : ""}
										</option>
									))}
								</Select>
							</div>
						) : (config.impressora_tipo ?? "sistema") === "rede" ? (
							<>
								<div className="space-y-2">
									<Label htmlFor="impressora_host">IP / hostname</Label>
									<Input
										id="impressora_host"
										value={config.impressora_host ?? ""}
										onChange={(e) => set("impressora_host", e.target.value)}
										placeholder="192.168.1.50"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="impressora_porta">Porta</Label>
									<Input
										id="impressora_porta"
										type="number"
										min={1}
										value={config.impressora_porta ?? "9100"}
										onChange={(e) => set("impressora_porta", e.target.value)}
									/>
								</div>
							</>
						) : null}
						<div className="sm:col-span-2 flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={testando !== null}
								onClick={() =>
									void testarDestino("fiscal", {
										tipo:
											config.impressora_tipo === "rede" ||
											config.impressora_tipo === "arquivo"
												? config.impressora_tipo
												: "sistema",
										nome: config.impressora_nome,
										host: config.impressora_host,
										porta: Number(config.impressora_porta) || 9100,
									})
								}
							>
								{testando === "fiscal" ? "Testando…" : "Testar impressão"}
							</Button>
							<p className="text-xs text-muted-foreground">
								USB e impressoras instaladas no Windows usam Sistema. Impressora
								térmica na LAN usa Rede (porta 9100, ESC/POS).
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Impressoras de produção</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						{mapeamentoGourmet.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum grupo gourmet sincronizado. Sincronize o catálogo para
								mapear cada setor a uma impressora (USB/Windows ou IP na rede).
							</p>
						) : (
							mapeamentoGourmet.map((grupo) => (
								<div
									key={grupo.idgrupogourmet}
									className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
								>
									<div className="space-y-2 sm:col-span-2">
										<Label>{grupo.nome}</Label>
									</div>
									<div className="space-y-2">
										<Label htmlFor={`imp-dest-${grupo.idgrupogourmet}`}>
											Conexão
										</Label>
										<Select
											id={`imp-dest-${grupo.idgrupogourmet}`}
											value={grupo.destino}
											onChange={(e) =>
												atualizarGourmet(grupo.idgrupogourmet, {
													destino: e.target.value,
												})
											}
										>
											<option value="">Não imprimir</option>
											<option value="sistema">Sistema (USB / Windows)</option>
											<option value="rede">Rede (IP :9100)</option>
										</Select>
									</div>
									{grupo.destino === "sistema" ? (
										<div className="space-y-2">
											<Label htmlFor={`imp-nome-${grupo.idgrupogourmet}`}>
												Impressora do Windows
											</Label>
											<Select
												id={`imp-nome-${grupo.idgrupogourmet}`}
												value={grupo.impressora_nome}
												onChange={(e) =>
													atualizarGourmet(grupo.idgrupogourmet, {
														impressora_nome: e.target.value,
													})
												}
											>
												<option value="">Selecione</option>
												{impressoras.map((p) => (
													<option key={p.name} value={p.name}>
														{p.name}
														{p.isDefault ? " (padrão)" : ""}
													</option>
												))}
											</Select>
										</div>
									) : null}
									{grupo.destino === "rede" ? (
										<>
											<div className="space-y-2">
												<Label htmlFor={`imp-host-${grupo.idgrupogourmet}`}>
													IP / hostname
												</Label>
												<Input
													id={`imp-host-${grupo.idgrupogourmet}`}
													value={grupo.host}
													onChange={(e) =>
														atualizarGourmet(grupo.idgrupogourmet, {
															host: e.target.value,
														})
													}
													placeholder="192.168.1.80"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`imp-porta-${grupo.idgrupogourmet}`}>
													Porta
												</Label>
												<Input
													id={`imp-porta-${grupo.idgrupogourmet}`}
													type="number"
													min={1}
													value={String(grupo.porta || 9100)}
													onChange={(e) =>
														atualizarGourmet(grupo.idgrupogourmet, {
															porta: Number(e.target.value) || 9100,
														})
													}
												/>
											</div>
										</>
									) : null}
									{(grupo.destino === "sistema" ||
										grupo.destino === "rede") && (
										<div className="sm:col-span-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={testando !== null}
												onClick={() =>
													void testarDestino(grupo.idgrupogourmet, {
														tipo: grupo.destino === "rede" ? "rede" : "sistema",
														nome: grupo.impressora_nome,
														host: grupo.host,
														porta: grupo.porta || 9100,
													})
												}
											>
												{testando === grupo.idgrupogourmet
													? "Testando…"
													: "Testar setor"}
											</Button>
										</div>
									)}
								</div>
							))
						)}
						<p className="text-xs text-muted-foreground">
							Ao enviar o pedido (POS) ou lançar item (mesa) / finalizar
							(balcão), os itens de cada grupo saem na impressora mapeada — sem
							preço. Setor sem impressora não imprime e não falha o pedido.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Certificado A1 (contingência)</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="certificado_path">Caminho do .pfx/.p12</Label>
							<Input
								id="certificado_path"
								value={config.certificado_path ?? ""}
								onChange={(e) => set("certificado_path", e.target.value)}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="certificado_senha">Senha do certificado</Label>
							<Input
								id="certificado_senha"
								type="password"
								value={config.certificado_senha ?? ""}
								onChange={(e) => set("certificado_senha", e.target.value)}
							/>
						</div>
						<p className="sm:col-span-2 text-xs text-muted-foreground">
							CSC/série/número são sincronizados da API quando online. O
							certificado fica apenas no main process, nunca no repositório.
						</p>
					</CardContent>
				</Card>

				{msg && <p className="text-sm">{msg}</p>}
			</div>

			<FunctionBar
				actions={[
					{
						key: "salvar",
						label: "Salvar",
						hotkey: "F5",
						variant: "default",
						onClick: () => void salvar(),
						disabled: loading,
					},
					{
						key: "voltar",
						label: "Voltar",
						hotkey: "Escape",
						variant: "outline",
						onClick: () => navigate(-1),
					},
				]}
			/>
		</div>
	);
}
