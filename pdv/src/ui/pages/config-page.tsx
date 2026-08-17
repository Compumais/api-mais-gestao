import {
	CloudDownload,
	CreditCard,
	LayoutGrid,
	Printer,
	Scale,
	Settings2,
	Ticket,
	Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type LeituraCodigoBarras,
	rotaHomePdv,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { aplicarTema } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ConfigAtalhos } from "@/ui/components/config-atalhos";
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

type AbaId =
	| "geral"
	| "atalhos"
	| "impressoras"
	| "tef"
	| "tecnibra"
	| "balanca"
	| "rede";

type StatusFiscal = {
	apelido: string;
	validade: string;
	serie: number | null;
	proximoNumero: number | null;
	ultimaSync: string;
	erro: string;
	caminho: string;
};

function formatarDataCurta(valor?: string): string {
	if (!valor) return "—";
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleString("pt-BR");
}

type StatusLan = {
	habilitada: boolean;
	ouvindo: boolean;
	porta: number;
	portaConfigurada?: number;
	ips: string[];
	erro: string | null;
	motivo?: string;
};

function layoutEtiquetaPreview(config: Config): string {
	const prefixo =
		(config.etiqueta_balanca_prefixo ?? "2").replace(/\D/g, "").slice(0, 1) ||
		"2";
	const n = Number(config.etiqueta_balanca_digitos_codigo ?? "4");
	const digitos = n === 5 || n === 6 ? n : 4;
	const extra =
		config.etiqueta_balanca_indicador_uso === "1"
			? "U"
			: digitos === 4
				? "0"
				: "";
	const valorLen = 13 - 1 - digitos - extra.length - 1;
	const marca = config.etiqueta_balanca_conteudo === "peso" ? "P" : "T";
	return `${prefixo}${"C".repeat(digitos)}${extra}${marca.repeat(Math.max(0, valorLen))}DV`;
}

const ABAS: Array<{
	id: AbaId;
	label: string;
	icon: typeof Settings2;
}> = [
	{ id: "geral", label: "Geral", icon: Settings2 },
	{ id: "atalhos", label: "Atalhos", icon: LayoutGrid },
	{ id: "impressoras", label: "Impressoras", icon: Printer },
	{ id: "tef", label: "TEF / SiTef", icon: CreditCard },
	{ id: "tecnibra", label: "Catraca Tecnibra", icon: Ticket },
	{ id: "balanca", label: "Balança", icon: Scale },
	{ id: "rede", label: "Rede / sync", icon: Wifi },
];

export function ConfigPage() {
	const navigate = useNavigate();
	const { refresh, status } = useOutletContext<StatusContext>();
	const [aba, setAba] = useState<AbaId>("geral");
	const [config, setConfig] = useState<Config>({});
	const [impressoras, setImpressoras] = useState<
		Array<{ name: string; isDefault: boolean }>
	>([]);
	const [mapeamentoGourmet, setMapeamentoGourmet] = useState<
		MapeamentoGourmet[]
	>([]);
	const [statusLan, setStatusLan] = useState<StatusLan | null>(null);
	const [statusFiscal, setStatusFiscal] = useState<StatusFiscal | null>(null);
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
	const [statusBalanca, setStatusBalanca] = useState<{
		habilitado: boolean;
		porta: string;
		baud: number;
		protocolo: string;
		conectado: boolean;
		mensagem: string;
	} | null>(null);
	const [portasBalanca, setPortasBalanca] = useState<string[]>([]);
	const [testeEtiqueta, setTesteEtiqueta] = useState("");
	const [resultadoTesteEtiqueta, setResultadoTesteEtiqueta] = useState("");
	const rotulo = rotuloModelo(
		config.modelo_atendimento === "comanda" ? "comanda" : "mesa",
	);
	const modoSecundario = (config.pdv_modo ?? "principal") === "secundario";
	const gourmet = Boolean(status?.moduloGourmet);
	const abasVisiveis = gourmet
		? ABAS
		: ABAS.filter((item) => item.id !== "tecnibra");

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
				setStatusLan(await pdvInvoke<StatusLan>("statusLan"));
			} catch {
				setStatusLan(null);
			}
			try {
				setStatusFiscal(await pdvInvoke<StatusFiscal>("statusFiscalPdv"));
			} catch {
				setStatusFiscal(null);
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
			try {
				setStatusBalanca(await pdvInvoke("balanca.status"));
			} catch {
				setStatusBalanca(null);
			}
			try {
				setPortasBalanca(await pdvInvoke<string[]>("balanca.listarPortas"));
			} catch {
				setPortasBalanca([]);
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
				pdv_modo: config.pdv_modo ?? "principal",
				pdv_principal_host: config.pdv_principal_host ?? "",
				pdv_principal_porta: config.pdv_principal_porta ?? "5050",
				qtd_mesas: config.qtd_mesas ?? "20",
				modelo_atendimento: config.modelo_atendimento ?? "mesa",
				tempo_ociosidade_min: config.tempo_ociosidade_min ?? "15",
				emitir_nfce: config.emitir_nfce ?? "1",
				tema: config.tema ?? "light",
				pix_chave: config.pix_chave ?? "",
				taxa_servico_percentual: config.taxa_servico_percentual ?? "10",
				couvert_valor: config.couvert_valor ?? "0",
				senha_gerencial: config.senha_gerencial ?? "",
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
				balanca_habilitada: config.balanca_habilitada ?? "0",
				balanca_porta: config.balanca_porta ?? "",
				balanca_baud: config.balanca_baud ?? "9600",
				balanca_protocolo: config.balanca_protocolo ?? "toledo",
				etiqueta_balanca_habilitada: config.etiqueta_balanca_habilitada ?? "0",
				etiqueta_balanca_prefixo: config.etiqueta_balanca_prefixo ?? "2",
				etiqueta_balanca_digitos_codigo:
					config.etiqueta_balanca_digitos_codigo ?? "4",
				etiqueta_balanca_conteudo: config.etiqueta_balanca_conteudo ?? "preco",
				etiqueta_balanca_centavos: config.etiqueta_balanca_centavos ?? "1",
				etiqueta_balanca_indicador_uso:
					config.etiqueta_balanca_indicador_uso ?? "0",
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
			try {
				setStatusBalanca(await pdvInvoke("balanca.status"));
			} catch {
				setStatusBalanca(null);
			}
			try {
				setStatusLan(await pdvInvoke<StatusLan>("statusLan"));
			} catch {
				setStatusLan(null);
			}
			setMsg("Configurações salvas");
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao salvar");
		} finally {
			setLoading(false);
		}
	}

	async function cargaLocal() {
		setTestando("carga");
		setMsg("");
		try {
			const result = await pdvInvoke<{
				origem: "nuvem" | "principal";
				produtos: number;
				grupos: number;
				gruposGourmet: number;
				atalhos: number;
			}>("cargaLocal");
			await refresh();
			try {
				setConfig(await pdvInvoke<Config>("getConfig"));
				setStatusFiscal(await pdvInvoke<StatusFiscal>("statusFiscalPdv"));
			} catch {
				// status fiscal opcional
			}
			const origem =
				result.origem === "principal" ? "PDV principal" : "nuvem (API)";
			setMsg(
				`Carga local da ${origem}: ${result.produtos} produtos · ${result.grupos} grupos · ${result.gruposGourmet} gourmet · ${result.atalhos} atalhos`,
			);
		} catch (err) {
			setMsg(
				err instanceof Error ? err.message : "Falha ao carregar dados da nuvem",
			);
		} finally {
			setTestando(null);
		}
	}

	async function buscarFiscalRetaguarda() {
		setTestando("fiscal");
		setMsg("");
		try {
			await pdvInvoke("sincronizarFiscalPdv");
			setConfig(await pdvInvoke<Config>("getConfig"));
			setStatusFiscal(await pdvInvoke<StatusFiscal>("statusFiscalPdv"));
			setMsg("Certificado, série e numeração atualizados do retaguarda.");
		} catch (err) {
			try {
				setStatusFiscal(await pdvInvoke<StatusFiscal>("statusFiscalPdv"));
			} catch {
				// ignore
			}
			setMsg(
				err instanceof Error
					? err.message
					: "Falha ao buscar dados fiscais do retaguarda",
			);
		} finally {
			setTestando(null);
		}
	}

	async function testarPrincipal() {
		setTestando("principal");
		setMsg("");
		try {
			const result = await pdvInvoke<{ mensagem: string }>("testarPrincipal", {
				host: config.pdv_principal_host ?? "",
				porta: config.pdv_principal_porta ?? "5050",
				numeropdv: config.numeropdv ?? "1",
			});
			setMsg(result.mensagem);
		} catch (err) {
			setMsg(
				err instanceof Error ? err.message : "Falha ao conectar no principal",
			);
		} finally {
			setTestando(null);
		}
	}

	async function reiniciarLan() {
		setTestando("lan");
		setMsg("");
		try {
			const lan = await pdvInvoke<StatusLan>("reiniciarLan");
			setStatusLan(lan);
			setMsg(
				lan.ouvindo
					? `API LAN ouvindo em 0.0.0.0:${lan.porta}`
					: (lan.erro ?? lan.motivo ?? "API LAN não está ouvindo"),
			);
		} catch (err) {
			setMsg(
				err instanceof Error ? err.message : "Falha ao reiniciar a API LAN",
			);
		} finally {
			setTestando(null);
		}
	}

	async function testarBalanca() {
		setTestando("balanca");
		setMsg("");
		try {
			const result = await pdvInvoke<{ mensagem: string }>("balanca.testar");
			setMsg(result.mensagem);
			try {
				setStatusBalanca(await pdvInvoke("balanca.status"));
			} catch {
				setStatusBalanca(null);
			}
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao ler a balança");
		} finally {
			setTestando(null);
		}
	}

	async function testarEtiqueta() {
		setTestando("etiqueta");
		setResultadoTesteEtiqueta("");
		try {
			const leitura = await pdvInvoke<LeituraCodigoBarras | null>(
				"buscarLeituraCodigoBarras",
				testeEtiqueta,
			);
			if (!leitura) {
				setResultadoTesteEtiqueta(
					"Não reconhecido como etiqueta MGV nem como EAN cadastrado.",
				);
				return;
			}
			const origem =
				leitura.origem === "etiqueta-balanca" ? "Etiqueta MGV" : "EAN / PLU";
			setResultadoTesteEtiqueta(
				`${origem}: ${leitura.produto.descricao} · qtd ${leitura.quantidade} · unitário ${leitura.precounitario.toFixed(2)} · total ${leitura.precototal.toFixed(2)}`,
			);
		} catch (err) {
			setResultadoTesteEtiqueta(
				err instanceof Error ? err.message : "Falha ao interpretar o código",
			);
		} finally {
			setTestando(null);
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
					<Button
						variant="secondary"
						size="sm"
						onClick={() => navigate(rotaHomePdv(status))}
					>
						Voltar
					</Button>
				}
			/>

			<div className="flex min-h-0 flex-1">
				<nav className="flex w-56 shrink-0 flex-col gap-1 border-r bg-secondary/40 p-2">
					{abasVisiveis.map((item) => {
						const Icon = item.icon;
						const ativa = aba === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setAba(item.id)}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition",
									ativa
										? "bg-primary text-primary-foreground"
										: "hover:bg-card",
								)}
							>
								<Icon className="size-4 shrink-0" />
								{item.label}
							</button>
						);
					})}
				</nav>

				<div className="min-h-0 flex-1 overflow-auto p-4">
					<div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
						{aba === "geral" && (
							<Card>
								<CardHeader>
									<CardTitle>Este PDV</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="numeropdv">Número do PDV</Label>
										<Input
											id="numeropdv"
											value={config.numeropdv ?? "1"}
											onChange={(e) => set("numeropdv", e.target.value)}
										/>
										<p className="text-xs text-muted-foreground">
											Único na loja. Dois PDVs com o mesmo número misturam
											caixa, cupom e NFC-e.
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="pdv_modo">Modo</Label>
										<Select
											id="pdv_modo"
											value={config.pdv_modo ?? "principal"}
											onChange={(e) => set("pdv_modo", e.target.value)}
										>
											<option value="principal">Principal (banco local)</option>
											<option value="secundario">
												Secundário (lê o principal)
											</option>
										</Select>
									</div>
									{modoSecundario ? (
										<>
											<div className="space-y-2">
												<Label htmlFor="pdv_principal_host">
													IP do PDV principal
												</Label>
												<Input
													id="pdv_principal_host"
													value={config.pdv_principal_host ?? ""}
													onChange={(e) =>
														set("pdv_principal_host", e.target.value)
													}
													placeholder="192.168.1.10"
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
													value={config.pdv_principal_porta ?? "5050"}
													onChange={(e) =>
														set("pdv_principal_porta", e.target.value)
													}
												/>
											</div>
											<div className="sm:col-span-2 flex flex-wrap items-center gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={testando !== null}
													onClick={() => void testarPrincipal()}
												>
													{testando === "principal"
														? "Testando…"
														: "Testar conexão"}
												</Button>
												<p className="text-xs text-muted-foreground">
													O secundário busca produtos e configurações de negócio
													no principal. SiTef, impressora e PIN pad continuam
													desta máquina.
												</p>
											</div>
										</>
									) : (
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											Este PDV guarda o banco local e sincroniza com a API.
											Outros terminais apontam para o IP desta máquina na porta
											LAN.
										</p>
									)}
									{gourmet ? (
										<>
											<div className="space-y-2">
												<Label htmlFor="modelo_atendimento">
													Modelo de atendimento
												</Label>
												<Select
													id="modelo_atendimento"
													value={config.modelo_atendimento ?? "mesa"}
													onChange={(e) =>
														set("modelo_atendimento", e.target.value)
													}
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
													onChange={(e) =>
														set("tempo_ociosidade_min", e.target.value)
													}
												>
													<option value="15">15 minutos</option>
													<option value="30">30 minutos</option>
												</Select>
											</div>
										</>
									) : (
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											Mesas e comandas exigem o módulo Gourmet no plano da
											empresa. Este PDV opera só em balcão.
										</p>
									)}
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
									{gourmet ? (
										<>
											<div className="space-y-2">
												<Label htmlFor="taxa_servico_percentual">
													Taxa de serviço (%)
												</Label>
												<Input
													id="taxa_servico_percentual"
													type="number"
													min={0}
													value={config.taxa_servico_percentual ?? "10"}
													onChange={(e) =>
														set("taxa_servico_percentual", e.target.value)
													}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="couvert_valor">
													Couvert por pessoa
												</Label>
												<Input
													id="couvert_valor"
													type="number"
													min={0}
													step="0.01"
													value={config.couvert_valor ?? "0"}
													onChange={(e) => set("couvert_valor", e.target.value)}
												/>
											</div>
											<div className="space-y-2 sm:col-span-2">
												<Label htmlFor="senha_gerencial">
													Senha gerencial (desconto)
												</Label>
												<Input
													id="senha_gerencial"
													type="password"
													value={config.senha_gerencial ?? ""}
													onChange={(e) =>
														set("senha_gerencial", e.target.value)
													}
													placeholder={
														config.senha_gerencial_definida === "1"
															? "Definida — deixe em branco para manter"
															: "Mínimo 4 caracteres"
													}
												/>
											</div>
										</>
									) : null}
									<div className="sm:col-span-2 flex flex-col gap-2 rounded-md border bg-secondary/30 p-3">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div>
												<p className="text-sm font-medium">Carga local</p>
												<p className="text-xs text-muted-foreground">
													{modoSecundario
														? "Baixa produtos, grupos e atalhos do PDV principal para este terminal."
														: "Baixa produtos, grupos, atalhos e CSC da API (nuvem) para o banco local."}
												</p>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={testando !== null || loading}
												onClick={() => void cargaLocal()}
											>
												<CloudDownload className="size-4" />
												{testando === "carga" ? "Carregando…" : "Carga local"}
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{aba === "atalhos" && (
							<ConfigAtalhos secundario={modoSecundario} onMensagem={setMsg} />
						)}

						{aba === "impressoras" && (
							<>
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
												<Label htmlFor="impressora_nome">
													Impressora do Windows
												</Label>
												<Select
													id="impressora_nome"
													value={config.impressora_nome ?? ""}
													onChange={(e) =>
														set("impressora_nome", e.target.value)
													}
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
														onChange={(e) =>
															set("impressora_host", e.target.value)
														}
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
														onChange={(e) =>
															set("impressora_porta", e.target.value)
														}
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
												{testando === "fiscal"
													? "Testando…"
													: "Testar impressão"}
											</Button>
											<p className="text-xs text-muted-foreground">
												USB e impressoras instaladas no Windows usam Sistema.
												Impressora térmica na LAN usa Rede (porta 9100,
												ESC/POS).
											</p>
										</div>
									</CardContent>
								</Card>

								{gourmet ? (
									<Card>
										<CardHeader>
											<CardTitle>Impressoras de produção</CardTitle>
										</CardHeader>
										<CardContent className="grid gap-4">
											{mapeamentoGourmet.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													Nenhum grupo gourmet sincronizado. Sincronize o
													catálogo para mapear cada setor a uma impressora
													(USB/Windows ou IP na rede).
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
															<Label
																htmlFor={`imp-dest-${grupo.idgrupogourmet}`}
															>
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
																<option value="sistema">
																	Sistema (USB / Windows)
																</option>
																<option value="rede">Rede (IP :9100)</option>
															</Select>
														</div>
														{grupo.destino === "sistema" ? (
															<div className="space-y-2">
																<Label
																	htmlFor={`imp-nome-${grupo.idgrupogourmet}`}
																>
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
																	<Label
																		htmlFor={`imp-host-${grupo.idgrupogourmet}`}
																	>
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
																	<Label
																		htmlFor={`imp-porta-${grupo.idgrupogourmet}`}
																	>
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
																			tipo:
																				grupo.destino === "rede"
																					? "rede"
																					: "sistema",
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
												Ao enviar o pedido (POS) ou lançar item (mesa) /
												finalizar (balcão), os itens de cada grupo saem na
												impressora mapeada — sem preço. Setor sem impressora não
												imprime e não falha o pedido.
											</p>
										</CardContent>
									</Card>
								) : null}
							</>
						)}

						{aba === "tef" && (
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
											onChange={(e) =>
												set("sitef_porta_pinpad", e.target.value)
											}
											placeholder="COM5"
										/>
										<p className="text-xs text-muted-foreground">
											USB aparece como COM virtual no Gerenciador de
											Dispositivos.
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
										A CliSiTef roda só no processo main, em Windows. Sem a DLL
										ou fora do Windows, o pagamento misto continua e o cartão
										entra manual.
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
						)}

						{aba === "tecnibra" && gourmet && (
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
											onChange={(e) =>
												set("tecnibra_habilitada", e.target.value)
											}
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
											onChange={(e) =>
												set("tecnibra_intervalo_ms", e.target.value)
											}
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
										A receptora lê este arquivo: comanda presente = saída
										bloqueada; ausente = liberada. Pasta padrão da IHM:
										C:\Tecnibra\IHM Receptora\Comandas.xml
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
						)}

						{aba === "balanca" && (
							<>
								<Card>
									<CardHeader>
										<CardTitle>Balança serial</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="balanca_habilitada">Integração</Label>
											<Select
												id="balanca_habilitada"
												value={config.balanca_habilitada ?? "0"}
												onChange={(e) =>
													set("balanca_habilitada", e.target.value)
												}
											>
												<option value="0">Desligada</option>
												<option value="1">Ligada</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="balanca_protocolo">Protocolo</Label>
											<Select
												id="balanca_protocolo"
												value={config.balanca_protocolo ?? "toledo"}
												onChange={(e) =>
													set("balanca_protocolo", e.target.value)
												}
											>
												<option value="toledo">Toledo (STX/ETX)</option>
												<option value="filizola">Filizola (gramas)</option>
												<option value="continuo">Contínuo ASCII</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="balanca_porta">Porta</Label>
											<Input
												id="balanca_porta"
												list="portas-balanca"
												value={config.balanca_porta ?? ""}
												onChange={(e) => set("balanca_porta", e.target.value)}
												placeholder="COM3 ou /dev/ttyUSB0"
											/>
											<datalist id="portas-balanca">
												{portasBalanca.map((porta) => (
													<option key={porta} value={porta} />
												))}
											</datalist>
										</div>
										<div className="space-y-2">
											<Label htmlFor="balanca_baud">Velocidade (bps)</Label>
											<Select
												id="balanca_baud"
												value={config.balanca_baud ?? "9600"}
												onChange={(e) => set("balanca_baud", e.target.value)}
											>
												<option value="1200">1200</option>
												<option value="2400">2400</option>
												<option value="4800">4800</option>
												<option value="9600">9600</option>
												<option value="19200">19200</option>
											</Select>
										</div>
										<div className="sm:col-span-2">
											<Button
												type="button"
												variant="outline"
												disabled={testando === "balanca"}
												onClick={() => void testarBalanca()}
											>
												{testando === "balanca"
													? "Lendo…"
													: "Testar leitura de peso"}
											</Button>
										</div>
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											Produtos com a unidade de sistema KG (Quilograma) abrem a
											tela de peso ao lançar em mesa, comanda ou balcão. Com a
											integração ligada, se a balança responder o peso entra
											sozinho; senão o operador digita.
											{statusBalanca ? ` ${statusBalanca.mensagem}.` : ""}
										</p>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Etiquetas da balança (MGV / EAN-13)</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_habilitada">
												Leitura no PDV
											</Label>
											<Select
												id="etiqueta_balanca_habilitada"
												value={config.etiqueta_balanca_habilitada ?? "0"}
												onChange={(e) =>
													set("etiqueta_balanca_habilitada", e.target.value)
												}
											>
												<option value="0">Desligada</option>
												<option value="1">Ligada</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_prefixo">
												Primeiro dígito (prefixo)
											</Label>
											<Input
												id="etiqueta_balanca_prefixo"
												value={config.etiqueta_balanca_prefixo ?? "2"}
												maxLength={1}
												onChange={(e) =>
													set(
														"etiqueta_balanca_prefixo",
														e.target.value.replace(/\D/g, "").slice(0, 1),
													)
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_digitos_codigo">
												Dígitos de código (PLU)
											</Label>
											<Select
												id="etiqueta_balanca_digitos_codigo"
												value={config.etiqueta_balanca_digitos_codigo ?? "4"}
												onChange={(e) =>
													set("etiqueta_balanca_digitos_codigo", e.target.value)
												}
											>
												<option value="4">4 (como no MGV6 da loja)</option>
												<option value="5">5</option>
												<option value="6">6</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_conteudo">
												O que vem no código
											</Label>
											<Select
												id="etiqueta_balanca_conteudo"
												value={config.etiqueta_balanca_conteudo ?? "preco"}
												onChange={(e) =>
													set("etiqueta_balanca_conteudo", e.target.value)
												}
											>
												<option value="preco">Preço total</option>
												<option value="peso">Peso / quantidade</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_centavos">
												Trabalhar com centavos
											</Label>
											<Select
												id="etiqueta_balanca_centavos"
												value={config.etiqueta_balanca_centavos ?? "1"}
												onChange={(e) =>
													set("etiqueta_balanca_centavos", e.target.value)
												}
											>
												<option value="1">
													Sim (6 dígitos = R$ 00.000,00)
												</option>
												<option value="0">Não</option>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="etiqueta_balanca_indicador_uso">
												Indicador de uso
											</Label>
											<Select
												id="etiqueta_balanca_indicador_uso"
												value={config.etiqueta_balanca_indicador_uso ?? "0"}
												onChange={(e) =>
													set("etiqueta_balanca_indicador_uso", e.target.value)
												}
											>
												<option value="0">Não</option>
												<option value="1">Sim</option>
											</Select>
										</div>
										<p className="sm:col-span-2 font-mono text-sm">
											Composição: {layoutEtiquetaPreview(config)}
										</p>
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											Padrão da captura MGV6: prefixo 2, 4 dígitos de código,
											zero fixo, 6 dígitos de preço total e DV. O PLU é o código
											do produto no cadastro. Faça uma carga local depois de
											ligar para sincronizar os códigos. Salve antes de testar.
										</p>
										<div className="sm:col-span-2 space-y-2">
											<Label htmlFor="teste_etiqueta">Testar código lido</Label>
											<div className="flex flex-col gap-2 sm:flex-row">
												<Input
													id="teste_etiqueta"
													value={testeEtiqueta}
													onChange={(e) => setTesteEtiqueta(e.target.value)}
													placeholder="Bipe ou cole o EAN-13 da etiqueta"
													className="font-mono"
												/>
												<Button
													type="button"
													variant="outline"
													disabled={
														testando === "etiqueta" || !testeEtiqueta.trim()
													}
													onClick={() => void testarEtiqueta()}
												>
													{testando === "etiqueta" ? "Lendo…" : "Interpretar"}
												</Button>
											</div>
											{resultadoTesteEtiqueta ? (
												<p className="text-xs text-muted-foreground">
													{resultadoTesteEtiqueta}
												</p>
											) : null}
										</div>
									</CardContent>
								</Card>
							</>
						)}

						{aba === "rede" && (
							<>
								<Card>
									<CardHeader>
										<CardTitle>Banco e API</CardTitle>
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
												Banco local deste terminal (não é o Postgres da API).
												Padrão: postgresql://pdv:pdv@127.0.0.1:5433/pdv_local
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
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>POS na LAN</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="lan_habilitada">
												Expor API para o POS
											</Label>
											<Select
												id="lan_habilitada"
												value={config.lan_habilitada ?? "1"}
												onChange={(e) => set("lan_habilitada", e.target.value)}
												disabled={modoSecundario}
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
												disabled={modoSecundario}
											/>
										</div>
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											{modoSecundario
												? "PDV secundário não expõe API LAN — o POS e outros terminais apontam para o principal."
												: statusLan?.ouvindo
													? `API LAN ouvindo em 0.0.0.0:${statusLan.porta}. POS e PDVs secundários: ${
															(statusLan.ips ?? []).length
																? statusLan.ips
																		.map(
																			(ip) => `http://${ip}:${statusLan.porta}`,
																		)
																		.join(", ")
																: "nenhum IP de rede detectado"
														}. No emulador use 10.0.2.2.`
													: `API LAN não está ouvindo${
															statusLan?.erro || statusLan?.motivo
																? ` — ${statusLan.erro ?? statusLan.motivo}`
																: ""
														}. Salve as configurações ou reinicie a API.`}
										</p>
										{!modoSecundario ? (
											<div className="sm:col-span-2">
												<Button
													type="button"
													variant="outline"
													disabled={testando === "lan"}
													onClick={() => void reiniciarLan()}
												>
													{testando === "lan"
														? "Reiniciando…"
														: "Reiniciar API LAN"}
												</Button>
											</div>
										) : null}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>NFC-e (retaguarda)</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-xs text-muted-foreground">
												Certificado
											</p>
											<p className="text-sm">
												{statusFiscal?.apelido || "Não sincronizado"}
											</p>
										</div>
										<div className="space-y-1">
											<p className="text-xs text-muted-foreground">Validade</p>
											<p className="text-sm">
												{formatarDataCurta(statusFiscal?.validade)}
											</p>
										</div>
										<div className="space-y-1">
											<p className="text-xs text-muted-foreground">Série</p>
											<p className="text-sm">{statusFiscal?.serie ?? "—"}</p>
										</div>
										<div className="space-y-1">
											<p className="text-xs text-muted-foreground">
												Próximo número
											</p>
											<p className="text-sm">
												{statusFiscal?.proximoNumero ?? "—"}
											</p>
										</div>
										<div className="space-y-1 sm:col-span-2">
											<p className="text-xs text-muted-foreground">
												Última sync
											</p>
											<p className="text-sm">
												{formatarDataCurta(statusFiscal?.ultimaSync)}
											</p>
										</div>
										{statusFiscal?.erro ? (
											<p className="sm:col-span-2 text-sm text-destructive">
												{statusFiscal.erro}
											</p>
										) : null}
										<p className="sm:col-span-2 text-xs text-muted-foreground">
											Este terminal precisa estar cadastrado no retaguarda com o
											mesmo número do PDV e série NFC-e própria. O certificado
											A1 é baixado automaticamente.
										</p>
										{!modoSecundario ? (
											<div className="sm:col-span-2">
												<Button
													type="button"
													variant="outline"
													disabled={testando === "fiscal"}
													onClick={() => void buscarFiscalRetaguarda()}
												>
													{testando === "fiscal"
														? "Buscando…"
														: "Buscar do retaguarda"}
												</Button>
											</div>
										) : null}
									</CardContent>
								</Card>
							</>
						)}

						{msg && <p className="text-sm">{msg}</p>}
					</div>
				</div>
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
