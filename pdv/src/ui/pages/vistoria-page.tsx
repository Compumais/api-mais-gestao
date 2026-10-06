import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, rotuloModelo, type StatusContext } from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";
import { FunctionBar } from "@/ui/components/function-bar";
import { PdvShell } from "@/ui/components/pdv-shell";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/ui/components/ui/table";

type AcaoVistoria = "insercao" | "exclusao" | "fechamento";

type RegistroVistoria = {
	id: string;
	acao: AcaoVistoria;
	numero_mesa: number;
	nomecliente: string | null;
	usuario: string;
	origem: "pdv" | "pos";
	descricao: string | null;
	quantidade: number | null;
	precototal: number | null;
	valortotal: number | null;
	detalhe: string | null;
	criadoem: string;
};

const ABAS: Array<{ id: "" | AcaoVistoria; label: string }> = [
	{ id: "", label: "Tudo" },
	{ id: "insercao", label: "Inserções" },
	{ id: "exclusao", label: "Exclusões" },
	{ id: "fechamento", label: "Fechamentos" },
];

function hojeInput() {
	const agora = new Date();
	const mes = String(agora.getMonth() + 1).padStart(2, "0");
	const dia = String(agora.getDate()).padStart(2, "0");
	return `${agora.getFullYear()}-${mes}-${dia}`;
}

function rotuloAcao(acao: AcaoVistoria) {
	if (acao === "insercao") return "Inserção";
	if (acao === "exclusao") return "Exclusão";
	return "Fechamento";
}

function formatarQuando(iso: string) {
	const data = new Date(iso);
	if (Number.isNaN(data.getTime())) return iso;
	return data.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function VistoriaPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const [acao, setAcao] = useState<"" | AcaoVistoria>("");
	const [dia, setDia] = useState(hojeInput);
	const [numero, setNumero] = useState("");
	const [usuario, setUsuario] = useState("");
	const [linhas, setLinhas] = useState<RegistroVistoria[]>([]);
	const [carregando, setCarregando] = useState(false);
	const [msg, setMsg] = useState("");

	const carregar = useCallback(async () => {
		setCarregando(true);
		setMsg("");
		try {
			const numeroInformado = Number(numero);
			const data = await pdvInvoke<RegistroVistoria[]>("listarVistoria", {
				acao: acao || null,
				dia,
				numero: numero.trim() && Number.isFinite(numeroInformado)
					? numeroInformado
					: null,
				usuario: usuario.trim() || null,
			});
			setLinhas(Array.isArray(data) ? data : []);
		} catch (err) {
			setLinhas([]);
			setMsg(err instanceof Error ? err.message : "Falha ao carregar a vistoria");
		} finally {
			setCarregando(false);
		}
	}, [acao, dia, numero, usuario]);

	useEffect(() => {
		void carregar();
	}, [carregar]);

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			topbar={
				<Topbar
					title="Vistoria"
					subtitle={`Quem lançou, excluiu e fechou cada ${rotulo.singular.toLowerCase()}`}
					status={status}
				/>
			}
			footer={
				<FunctionBar
					actions={[
						{
							key: "voltar",
							label: "Voltar",
							hotkey: "Escape",
							variant: "outline",
							onClick: () => navigate(rotaHomePdv(status)),
						},
						{
							key: "atualizar",
							label: "Atualizar",
							variant: "secondary",
							onClick: () => void carregar(),
						},
					]}
				/>
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex gap-1 rounded-lg bg-muted p-1">
						{ABAS.map((aba) => (
							<Button
								key={aba.label}
								type="button"
								size="sm"
								variant={acao === aba.id ? "default" : "ghost"}
								onClick={() => setAcao(aba.id)}
							>
								{aba.label}
							</Button>
						))}
					</div>
					<label className="flex flex-col gap-1 text-xs font-semibold">
						Dia
						<Input
							type="date"
							value={dia}
							onChange={(evento) => setDia(evento.target.value)}
							className="h-9 w-40"
						/>
					</label>
					<label className="flex flex-col gap-1 text-xs font-semibold">
						{rotulo.singular}
						<Input
							inputMode="numeric"
							value={numero}
							placeholder="Número"
							onChange={(evento) => setNumero(evento.target.value)}
							className="h-9 w-28"
						/>
					</label>
					<label className="flex flex-col gap-1 text-xs font-semibold">
						Usuário
						<Input
							value={usuario}
							placeholder="Nome"
							onChange={(evento) => setUsuario(evento.target.value)}
							className="h-9 w-48"
						/>
					</label>
				</div>
				{msg ? (
					<p className="rounded-md border px-3 py-2 text-sm text-destructive">
						{msg}
					</p>
				) : null}
				<div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card shadow-sm">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Quando</TableHead>
								<TableHead>Ação</TableHead>
								<TableHead>{rotulo.singular}</TableHead>
								<TableHead>Cliente</TableHead>
								<TableHead>Usuário</TableHead>
								<TableHead>Origem</TableHead>
								<TableHead>Item</TableHead>
								<TableHead className="text-right">Qtd</TableHead>
								<TableHead className="text-right">Valor</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{linhas.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} className="py-10 text-center">
										{carregando
											? "Carregando…"
											: "Nenhum lançamento neste filtro."}
									</TableCell>
								</TableRow>
							) : (
								linhas.map((linha) => {
									const valor =
										linha.acao === "fechamento"
											? linha.valortotal
											: linha.precototal;
									return (
										<TableRow key={linha.id}>
											<TableCell className="whitespace-nowrap">
												{formatarQuando(linha.criadoem)}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"rounded-full px-2 py-0.5 text-xs font-semibold",
														linha.acao === "insercao" &&
															"bg-emerald-100 text-emerald-800",
														linha.acao === "exclusao" &&
															"bg-red-100 text-red-800",
														linha.acao === "fechamento" &&
															"bg-sky-100 text-sky-800",
													)}
												>
													{rotuloAcao(linha.acao)}
												</span>
											</TableCell>
											<TableCell>
												{linha.numero_mesa > 0
													? linha.numero_mesa
													: "Entrega"}
											</TableCell>
											<TableCell>{linha.nomecliente || "—"}</TableCell>
											<TableCell className="font-semibold">
												{linha.usuario}
											</TableCell>
											<TableCell>
												{linha.origem === "pos" ? "POS" : "PDV"}
											</TableCell>
											<TableCell>
												<div>{linha.descricao || "—"}</div>
												{linha.detalhe ? (
													<div className="text-xs text-muted-foreground">
														{linha.detalhe}
													</div>
												) : null}
											</TableCell>
											<TableCell className="text-right">
												{linha.quantidade != null
													? linha.quantidade.toLocaleString("pt-BR", {
															maximumFractionDigits: 3,
														})
													: "—"}
											</TableCell>
											<TableCell className="text-right">
												{valor != null ? money(valor) : "—"}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PdvShell>
	);
}
