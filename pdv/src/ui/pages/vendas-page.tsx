import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { rotuloPagamentoVenda } from "@/lib/pagamento";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, rotuloModelo, type StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { DialogInutilizarNfce } from "@/ui/components/dialog-inutilizar-nfce";
import { FunctionBar } from "@/ui/components/function-bar";
import { Topbar } from "@/ui/components/topbar";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";

type Venda = {
	id: string;
	origem: string;
	meio_pagamento: string;
	valortotal: number;
	valordinheiro?: number;
	valorpix?: number;
	valorcartao?: number;
	criadoem: string;
	sync_status: string;
	nfce_status: string;
};

function badgeSync(status: string) {
	if (status === "sincronizado") return "success" as const;
	if (status === "pendente") return "warning" as const;
	return "outline" as const;
}

function badgeNfce(status: string) {
	if (status === "autorizada") return "success" as const;
	if (status === "transmitida") return "warning" as const;
	if (
		status === "contingencia" ||
		status === "pendente_contingencia" ||
		status === "pendente"
	)
		return "warning" as const;
	if (status === "erro" || status === "erro_config" || status === "cancelada")
		return "destructive" as const;
	return "outline" as const;
}

function rotuloNfce(status: string) {
	if (status === "erro") return "rejeitada";
	if (status === "erro_config") return "erro config";
	if (status === "pendente_contingencia" || status === "pendente")
		return "pendente";
	if (status === "transmitida") return "enviada (aguardando SEFAZ)";
	if (status === "inutilizada") return "inutilizada";
	if (status === "cancelada") return "cancelada";
	return status;
}

function podeRetransmitir(status: string) {
	return (
		status === "erro" ||
		status === "erro_config" ||
		status === "contingencia" ||
		status === "pendente_contingencia" ||
		status === "inutilizada"
	);
}

function podeInutilizar(status: string) {
	return status === "erro";
}

export function VendasPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const { teclas } = useTeclasFuncao();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const [vendas, setVendas] = useState<Venda[]>([]);
	const [loading, setLoading] = useState(false);
	const [retransmitindoId, setRetransmitindoId] = useState<string | null>(null);
	const [inutilizarVendaId, setInutilizarVendaId] = useState<string | null>(
		null,
	);
	const [msg, setMsg] = useState("");

	async function load() {
		setLoading(true);
		try {
			setVendas(await pdvInvoke<Venda[]>("listarVendas"));
		} finally {
			setLoading(false);
		}
	}

	async function retransmitir(id: string) {
		setRetransmitindoId(id);
		setMsg("");
		try {
			const result = await pdvInvoke<{ modo: string; mensagem: string }>(
				"retransmitirNfce",
				id,
			);
			setMsg(result.mensagem);
			await load();
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao retransmitir");
		} finally {
			setRetransmitindoId(null);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: deve rodar apenas uma vez ao montar
	useEffect(() => {
		void load();
	}, []);

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title="Vendas do PDV"
				subtitle="Histórico local com status de sincronização e NFC-e"
				right={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => navigate(rotaHomePdv(status))}
					>
						Voltar{" "}
						{status?.moduloGourmet
							? `às ${rotulo.plural.toLowerCase()}`
							: "ao PDV"}
					</Button>
				}
			/>

			<div className="flex-1 overflow-auto p-3">
				{msg ? (
					<p className="mb-3 rounded-md border bg-secondary/40 px-3 py-2 text-sm">
						{msg}
					</p>
				) : null}
				<div className="overflow-hidden rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-secondary/60 text-left">
							<tr>
								<th className="px-3 py-2 font-medium">Data</th>
								<th className="px-3 py-2 font-medium">Origem</th>
								<th className="px-3 py-2 font-medium">Pagamento</th>
								<th className="px-3 py-2 font-medium">Total</th>
								<th className="px-3 py-2 font-medium">Sync</th>
								<th className="px-3 py-2 font-medium">NFC-e</th>
								<th className="px-3 py-2 font-medium" />
							</tr>
						</thead>
						<tbody>
							{vendas.map((v) => (
								<tr key={v.id} className="border-t">
									<td className="px-3 py-2">
										{new Date(v.criadoem).toLocaleString("pt-BR")}
									</td>
									<td className="px-3 py-2 capitalize">{v.origem}</td>
									<td className="px-3 py-2">{rotuloPagamentoVenda(v)}</td>
									<td className="px-3 py-2 font-medium">
										{money(v.valortotal)}
									</td>
									<td className="px-3 py-2">
										<Badge variant={badgeSync(v.sync_status)}>
											{v.sync_status}
										</Badge>
									</td>
									<td className="px-3 py-2">
										<Badge variant={badgeNfce(v.nfce_status)}>
											{rotuloNfce(v.nfce_status)}
										</Badge>
									</td>
									<td className="px-3 py-2">
										<div className="flex justify-end gap-1">
											{podeRetransmitir(v.nfce_status) ? (
												<Button
													size="sm"
													variant="outline"
													disabled={retransmitindoId === v.id}
													onClick={() => void retransmitir(v.id)}
												>
													{retransmitindoId === v.id
														? "Enviando…"
														: "Retransmitir"}
												</Button>
											) : null}
											{podeInutilizar(v.nfce_status) ? (
												<Button
													size="sm"
													variant="outline"
													disabled={retransmitindoId === v.id}
													onClick={() => setInutilizarVendaId(v.id)}
												>
													Inutilizar
												</Button>
											) : null}
											<Button
												size="sm"
												variant="ghost"
												onClick={() => void pdvInvoke("reimprimir", v.id)}
											>
												Reimprimir
											</Button>
										</div>
									</td>
								</tr>
							))}
							{vendas.length === 0 && (
								<tr>
									<td
										colSpan={7}
										className="px-3 py-8 text-center text-muted-foreground"
									>
										Nenhuma venda local ainda.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<DialogInutilizarNfce
				aberto={inutilizarVendaId != null}
				vendaId={inutilizarVendaId}
				onFechar={() => setInutilizarVendaId(null)}
				onSucesso={(mensagem) => {
					setMsg(mensagem);
					void load();
				}}
			/>

			<FunctionBar
				actions={[
					{
						key: "atualizar",
						label: "Atualizar",
						hotkey: teclas.sincronizar,
						variant: "secondary",
						onClick: () => void load(),
						disabled: loading,
					},
					{
						key: "voltar",
						label: "Voltar",
						hotkey: "Escape",
						variant: "outline",
						onClick: () => navigate(rotaHomePdv(status)),
					},
				]}
			/>
		</div>
	);
}
