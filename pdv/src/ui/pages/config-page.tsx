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
	impressora_nome: string;
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
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
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
				certificado_path: config.certificado_path ?? "",
				certificado_senha: config.certificado_senha ?? "",
				lan_habilitada: config.lan_habilitada ?? "1",
				lan_porta: config.lan_porta ?? "5050",
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
			setMsg("Configurações salvas");
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao salvar");
		} finally {
			setLoading(false);
		}
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
						<CardTitle>Impressora fiscal / cupom</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="impressora_tipo">Tipo</Label>
							<Select
								id="impressora_tipo"
								value={config.impressora_tipo ?? "sistema"}
								onChange={(e) => set("impressora_tipo", e.target.value)}
							>
								<option value="sistema">Sistema (driver do Windows)</option>
								<option value="arquivo">Arquivo (depuração)</option>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="impressora_nome">Nome da impressora</Label>
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
								mapear cada setor a uma impressora Windows.
							</p>
						) : (
							mapeamentoGourmet.map((grupo) => (
								<div key={grupo.idgrupogourmet} className="space-y-2">
									<Label htmlFor={`imp-gourmet-${grupo.idgrupogourmet}`}>
										{grupo.nome}
									</Label>
									<Select
										id={`imp-gourmet-${grupo.idgrupogourmet}`}
										value={grupo.impressora_nome}
										onChange={(e) =>
											setMapeamentoGourmet((prev) =>
												prev.map((item) =>
													item.idgrupogourmet === grupo.idgrupogourmet
														? { ...item, impressora_nome: e.target.value }
														: item,
												),
											)
										}
									>
										<option value="">Não imprimir</option>
										{impressoras.map((p) => (
											<option key={p.name} value={p.name}>
												{p.name}
												{p.isDefault ? " (padrão)" : ""}
											</option>
										))}
									</Select>
								</div>
							))
						)}
						<p className="text-xs text-muted-foreground">
							Ao enviar o pedido (POS) ou lançar item (mesa) / finalizar
							(balcão), os itens de cada grupo saem na impressora mapeada — sem
							preço. Grupo sem impressora não imprime e não falha o pedido.
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
