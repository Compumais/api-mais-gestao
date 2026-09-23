import { useEffect, useState } from "react";
import { onWhatsappEvent, pdvInvoke } from "@/lib/pdv-api";
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

export type MapeamentoGourmetDelivery = {
	idgrupogourmet: string;
	nome: string;
	destino: string;
	impressora_nome: string;
	host: string;
	porta: number;
};

type ConfigDelivery = Record<string, string>;

type StatusWhatsapp = {
	habilitado: boolean;
	status: string;
	ultimoQr: string | null;
	ultimoErro: string | null;
	conectado: boolean;
	indisponivel?: boolean;
	motivo?: string;
};

type Props = {
	config: ConfigDelivery;
	set: (chave: string, valor: string) => void;
	impressoras: Array<{ name: string; isDefault: boolean }>;
	mapeamentoGourmet: MapeamentoGourmetDelivery[];
	atualizarGourmet: (
		idgrupogourmet: string,
		patch: Partial<MapeamentoGourmetDelivery>,
	) => void;
	testando: string | null;
	onTestarImpressora: (params: {
		destino: string;
		nome?: string;
		host?: string;
		porta?: number;
	}) => void;
};

function rotuloStatusWa(status: string) {
	if (status === "conectado") return "Conectado";
	if (status === "aguardando_qr") return "Aguardando QR";
	if (status === "erro") return "Erro";
	return "Desconectado";
}

export function ConfigDeliveryTab({
	config,
	set,
	impressoras,
	mapeamentoGourmet,
	atualizarGourmet,
	testando,
	onTestarImpressora,
}: Props) {
	const [waStatus, setWaStatus] = useState<StatusWhatsapp | null>(null);
	const [waSvg, setWaSvg] = useState<string | null>(null);
	const [waLoading, setWaLoading] = useState(false);

	async function carregarWhatsapp() {
		try {
			const st = await pdvInvoke<StatusWhatsapp>("whatsapp.status");
			setWaStatus(st);
			if (st.ultimoQr) {
				const qr = await pdvInvoke<{ svg: string | null }>("whatsapp.obterQr");
				setWaSvg(qr.svg);
			} else {
				setWaSvg(null);
			}
		} catch {
			setWaStatus(null);
			setWaSvg(null);
		}
	}

	useEffect(() => {
		void carregarWhatsapp();
		const timer = setInterval(() => {
			void carregarWhatsapp();
		}, 2000);
		const off = onWhatsappEvent((payload) => {
			const p = payload as { tipo?: string };
			if (p.tipo === "qr" || p.tipo === "status") {
				void carregarWhatsapp();
			}
		});
		return () => {
			clearInterval(timer);
			off();
		};
	}, []);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Delivery / cardápio online</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<p className="sm:col-span-2 text-sm text-muted-foreground">
						Pedidos do cardápio público entram automaticamente nesta tela de
						Delivery. A identidade do cardápio (logo, horários, meios de
						pagamento) fica no ERP web em Cadastros → Cardápio delivery. Aqui
						você define taxa local e para quais impressoras a cozinha imprime.
					</p>
					<div className="space-y-2">
						<Label htmlFor="taxa_entrega_padrao_delivery">
							Taxa de entrega padrão
						</Label>
						<Input
							id="taxa_entrega_padrao_delivery"
							type="number"
							min={0}
							step="0.01"
							value={config.taxa_entrega_padrao ?? "0"}
							onChange={(e) => set("taxa_entrega_padrao", e.target.value)}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="bairros_entrega_delivery">
							Bairros / taxas (JSON)
						</Label>
						<Input
							id="bairros_entrega_delivery"
							value={config.bairros_entrega ?? "[]"}
							onChange={(e) => set("bairros_entrega", e.target.value)}
							placeholder='[{"bairro":"Centro","taxa":8}]'
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>WhatsApp (Baileys local)</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<p className="sm:col-span-2 text-sm text-muted-foreground">
						Conecte o WhatsApp deste PDV principal para enviar atualizações de
						status e conversar com o cliente em cada pedido de delivery.
					</p>
					<div className="space-y-2">
						<Label htmlFor="whatsapp_habilitado">Integração</Label>
						<Select
							id="whatsapp_habilitado"
							value={config.whatsapp_habilitado === "1" ? "1" : "0"}
							onChange={(e) => set("whatsapp_habilitado", e.target.value)}
						>
							<option value="0">Desabilitado</option>
							<option value="1">Habilitado</option>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Status da sessão</Label>
						<p className="text-sm font-medium">
							{waStatus?.indisponivel
								? waStatus.motivo
								: rotuloStatusWa(waStatus?.status ?? "desconectado")}
							{waStatus?.ultimoErro ? ` — ${waStatus.ultimoErro}` : ""}
						</p>
					</div>
					<div className="flex flex-wrap gap-2 sm:col-span-2">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={waLoading || waStatus?.indisponivel}
							onClick={() => {
								set("whatsapp_habilitado", "1");
								setWaLoading(true);
								setWaSvg(null);
								void pdvInvoke("whatsapp.reconectar")
									.then(() => carregarWhatsapp())
									.finally(() => setWaLoading(false));
							}}
						>
							{waLoading ? "Aguarde…" : "Conectar / gerar QR"}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={waLoading || waStatus?.indisponivel}
							onClick={() => {
								setWaLoading(true);
								void pdvInvoke("whatsapp.desconectar")
									.then(() => carregarWhatsapp())
									.finally(() => setWaLoading(false));
							}}
						>
							Desconectar
						</Button>
					</div>
					{waSvg ? (
						<div className="sm:col-span-2 flex flex-col items-center gap-2 rounded-md border bg-white p-4 text-slate-950">
							<p className="text-sm text-muted-foreground">
								Escaneie o QR no WhatsApp do celular (Aparelhos conectados).
							</p>
							<img
								src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(waSvg)}`}
								alt="QR Code WhatsApp"
								className="size-56 max-h-[40vh] max-w-[40vh] bg-white"
							/>
						</div>
					) : waLoading || waStatus?.status === "aguardando_qr" ? (
						<p className="sm:col-span-2 text-sm text-muted-foreground">
							Aguardando QR do WhatsApp…
						</p>
					) : null}

					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="whatsapp_msg_producao">
							Msg. pedido em produção
						</Label>
						<Input
							id="whatsapp_msg_producao"
							value={
								config.whatsapp_msg_producao ??
								"Olá {nome}, recebemos seu pedido #{protocolo} e já estamos preparando."
							}
							onChange={(e) => set("whatsapp_msg_producao", e.target.value)}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="whatsapp_msg_saiu">Msg. saiu para entrega</Label>
						<Input
							id="whatsapp_msg_saiu"
							value={
								config.whatsapp_msg_saiu ??
								"Seu pedido #{protocolo} saiu para entrega."
							}
							onChange={(e) => set("whatsapp_msg_saiu", e.target.value)}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="whatsapp_msg_retirada_pronta">
							Msg. pronto para retirada
						</Label>
						<Input
							id="whatsapp_msg_retirada_pronta"
							value={
								config.whatsapp_msg_retirada_pronta ??
								"Seu pedido #{protocolo} está pronto para retirada."
							}
							onChange={(e) =>
								set("whatsapp_msg_retirada_pronta", e.target.value)
							}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="whatsapp_msg_entregue">Msg. entregue</Label>
						<Input
							id="whatsapp_msg_entregue"
							value={
								config.whatsapp_msg_entregue ??
								"Pedido #{protocolo} entregue. Obrigado!"
							}
							onChange={(e) => set("whatsapp_msg_entregue", e.target.value)}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="whatsapp_msg_cancelado">Msg. cancelado</Label>
						<Input
							id="whatsapp_msg_cancelado"
							value={
								config.whatsapp_msg_cancelado ??
								"Olá {nome}, seu pedido #{protocolo} foi cancelado."
							}
							onChange={(e) => set("whatsapp_msg_cancelado", e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Use {"{nome}"} e {"{protocolo}"} nos textos.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Impressão de produção (delivery)</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="impressao_producao_modo_delivery">Modo</Label>
						<Select
							id="impressao_producao_modo_delivery"
							value={config.impressao_producao_modo ?? "itens"}
							onChange={(e) => set("impressao_producao_modo", e.target.value)}
						>
							<option value="itens">Por itens (uma via por setor)</option>
							<option value="pedido">Por pedido (cupom único)</option>
						</Select>
					</div>
					{(config.impressao_producao_modo ?? "itens") === "pedido" ? (
						<>
							<div className="space-y-2">
								<Label htmlFor="impressora_pedido_tipo_delivery">
									Impressora do pedido
								</Label>
								<Select
									id="impressora_pedido_tipo_delivery"
									value={config.impressora_pedido_tipo ?? ""}
									onChange={(e) =>
										set("impressora_pedido_tipo", e.target.value)
									}
								>
									<option value="">Usar a primeira impressora dos itens</option>
									<option value="sistema">Sistema (USB / Windows)</option>
									<option value="rede">Rede (IP :9100)</option>
								</Select>
							</div>
							{config.impressora_pedido_tipo === "sistema" ? (
								<div className="space-y-2">
									<Label htmlFor="impressora_pedido_nome_delivery">
										Impressora do Windows
									</Label>
									<Select
										id="impressora_pedido_nome_delivery"
										value={config.impressora_pedido_nome ?? ""}
										onChange={(e) =>
											set("impressora_pedido_nome", e.target.value)
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
							{config.impressora_pedido_tipo === "rede" ? (
								<>
									<div className="space-y-2">
										<Label htmlFor="impressora_pedido_host_delivery">
											IP / hostname
										</Label>
										<Input
											id="impressora_pedido_host_delivery"
											value={config.impressora_pedido_host ?? ""}
											onChange={(e) =>
												set("impressora_pedido_host", e.target.value)
											}
											placeholder="192.168.1.80"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="impressora_pedido_porta_delivery">
											Porta
										</Label>
										<Input
											id="impressora_pedido_porta_delivery"
											type="number"
											min={1}
											value={config.impressora_pedido_porta ?? "9100"}
											onChange={(e) =>
												set("impressora_pedido_porta", e.target.value)
											}
										/>
									</div>
								</>
							) : null}
						</>
					) : null}

					<div className="sm:col-span-2 space-y-3">
						<p className="text-sm font-medium">Setores (grupos gourmet)</p>
						{mapeamentoGourmet.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum grupo gourmet sincronizado. Sincronize o catálogo para
								apontar cozinha, bar, etc. a uma impressora.
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
										<Label htmlFor={`del-dest-${grupo.idgrupogourmet}`}>
											Conexão
										</Label>
										<Select
											id={`del-dest-${grupo.idgrupogourmet}`}
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
											<Label htmlFor={`del-nome-${grupo.idgrupogourmet}`}>
												Impressora do Windows
											</Label>
											<Select
												id={`del-nome-${grupo.idgrupogourmet}`}
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
												<Label htmlFor={`del-host-${grupo.idgrupogourmet}`}>
													IP / hostname
												</Label>
												<Input
													id={`del-host-${grupo.idgrupogourmet}`}
													value={grupo.host}
													onChange={(e) =>
														atualizarGourmet(grupo.idgrupogourmet, {
															host: e.target.value,
														})
													}
													placeholder="192.168.1.50"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`del-porta-${grupo.idgrupogourmet}`}>
													Porta
												</Label>
												<Input
													id={`del-porta-${grupo.idgrupogourmet}`}
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
									{grupo.destino ? (
										<div className="sm:col-span-2">
											<Button
												type="button"
												variant="secondary"
												size="sm"
												disabled={testando !== null}
												onClick={() =>
													onTestarImpressora({
														destino: grupo.destino,
														nome: grupo.impressora_nome,
														host: grupo.host,
														porta: grupo.porta || 9100,
													})
												}
											>
												{testando === `gourmet-${grupo.idgrupogourmet}`
													? "Testando…"
													: "Testar impressora"}
											</Button>
										</div>
									) : null}
								</div>
							))
						)}
						<p className="text-xs text-muted-foreground">
							Ao chegar um pedido do cardápio, a produção imprime nestas
							impressoras. Sem destino mapeado o pedido ainda entra, só não
							imprime o setor.
						</p>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
