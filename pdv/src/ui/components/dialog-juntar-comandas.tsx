import { useEffect, useMemo, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { MesaResumo } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ContaPreview = {
	id: string;
	numero_mesa: number;
	valortotal: number;
	itens: Array<{
		id: string;
		descricao: string;
		quantidade: number;
		precototal: number;
		pago?: number;
	}>;
};

type Etapa = "selecao" | "confirmacao";

export function DialogJuntarComandas({
	aberto,
	destinoNumero,
	mesas,
	loading = false,
	onCancelar,
	onConfirmar,
}: {
	aberto: boolean;
	destinoNumero: number;
	destinoId?: string;
	mesas: MesaResumo[];
	loading?: boolean;
	onCancelar: () => void;
	onConfirmar: (idsOrigem: string[]) => void | Promise<void>;
}) {
	const [etapa, setEtapa] = useState<Etapa>("selecao");
	const [busca, setBusca] = useState("");
	const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
	const [previews, setPreviews] = useState<ContaPreview[]>([]);
	const [carregandoPreview, setCarregandoPreview] = useState(false);
	const [erro, setErro] = useState<string | null>(null);

	useEscapeFechaModal(aberto && !loading, () => {
		if (etapa === "confirmacao") {
			setEtapa("selecao");
			return;
		}
		onCancelar();
	});

	useEffect(() => {
		if (!aberto) {
			setEtapa("selecao");
			setBusca("");
			setSelecionadas(new Set());
			setPreviews([]);
			setErro(null);
		}
	}, [aberto]);

	const opcoes = useMemo(() => {
		const termo = busca.trim().toLowerCase();
		return mesas
			.filter((m) => {
				if (m.numero === destinoNumero) return false;
				if (m.status !== "ocupada" || !m.idconta) return false;
				if (!termo) return true;
				return (
					String(m.numero).includes(termo) ||
					(m.nomecliente?.toLowerCase().includes(termo) ?? false)
				);
			})
			.sort((a, b) => a.numero - b.numero);
	}, [mesas, destinoNumero, busca]);

	function toggle(idconta: string) {
		setSelecionadas((prev) => {
			const next = new Set(prev);
			if (next.has(idconta)) next.delete(idconta);
			else next.add(idconta);
			return next;
		});
	}

	async function irParaConfirmacao() {
		const ids = [...selecionadas];
		if (!ids.length) {
			setErro("Selecione ao menos uma comanda.");
			return;
		}
		setErro(null);
		setCarregandoPreview(true);
		try {
			const contas = await Promise.all(
				ids.map((id) => pdvInvoke<ContaPreview>("obterContaMesa", id)),
			);
			setPreviews(
				contas
					.filter(Boolean)
					.sort((a, b) => a.numero_mesa - b.numero_mesa),
			);
			setEtapa("confirmacao");
		} catch (err) {
			setErro(
				err instanceof Error
					? err.message
					: "Não foi possível carregar o consumo das comandas",
			);
		} finally {
			setCarregandoPreview(false);
		}
	}

	if (!aberto) return null;

	const numerosOrigem = previews.map((p) => p.numero_mesa);
	const textoNumeros =
		numerosOrigem.length === 1
			? String(numerosOrigem[0])
			: numerosOrigem.length === 2
				? `${numerosOrigem[0]} e ${numerosOrigem[1]}`
				: `${numerosOrigem.slice(0, -1).join(", ")} e ${numerosOrigem[numerosOrigem.length - 1]}`;

	if (etapa === "confirmacao") {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
				<div className="pdv-surface flex max-h-[95vh] w-[36rem] max-w-[95vw] flex-col gap-4 overflow-hidden p-5">
					<div>
						<h2 className="text-lg font-semibold">Confirmar união</h2>
						<p className="text-sm text-muted-foreground">
							Deseja realmente unir as comandas {textoNumeros} na comanda{" "}
							{destinoNumero}?
						</p>
					</div>
					<div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
						{previews.map((conta) => {
							const itensAbertos = conta.itens.filter(
								(i) => !i.pago || i.pago === 0,
							);
							return (
								<div
									key={conta.id}
									className="rounded-lg border p-3 text-sm"
								>
									<div className="mb-2 flex items-baseline justify-between gap-2 font-semibold">
										<span>Comanda {conta.numero_mesa}</span>
										<span>{money(conta.valortotal)}</span>
									</div>
									{itensAbertos.length === 0 ? (
										<p className="text-muted-foreground">Sem itens abertos</p>
									) : (
										<ul className="space-y-1 text-muted-foreground">
											{itensAbertos.map((item) => (
												<li
													key={item.id}
													className="flex justify-between gap-2"
												>
													<span className="truncate">
														{item.quantidade}× {item.descricao}
													</span>
													<span className="shrink-0 tabular-nums">
														{money(item.precototal)}
													</span>
												</li>
											))}
										</ul>
									)}
								</div>
							);
						})}
					</div>
					{erro ? <p className="text-sm text-destructive">{erro}</p> : null}
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="flex-1"
							disabled={loading}
							onClick={() => setEtapa("selecao")}
						>
							Voltar
						</Button>
						<Button
							className="flex-1"
							disabled={loading}
							onClick={() =>
								void onConfirmar(previews.map((p) => p.id).filter(Boolean))
							}
						>
							{loading ? "Juntando..." : "Confirmar união"}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
			<div className="pdv-surface flex max-h-[95vh] w-[32rem] max-w-[95vw] flex-col gap-4 overflow-hidden p-5">
				<div>
					<h2 className="text-lg font-semibold">
						Juntar na comanda {destinoNumero}
					</h2>
					<p className="text-sm text-muted-foreground">
						Busque e selecione uma ou mais comandas ocupadas para unir nesta.
					</p>
				</div>
				<Input
					placeholder="Buscar por número ou cliente"
					value={busca}
					onChange={(e) => setBusca(e.target.value)}
					autoFocus
				/>
				<div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
					{opcoes.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							Nenhuma comanda ocupada encontrada.
						</p>
					) : (
						opcoes.map((m) => {
							const id = m.idconta as string;
							const marcada = selecionadas.has(id);
							return (
								<button
									key={m.numero}
									type="button"
									onClick={() => toggle(id)}
									className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
										marcada
											? "border-primary bg-primary/10"
											: "hover:border-primary/50"
									}`}
								>
									<span
										className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
											marcada
												? "border-primary bg-primary text-primary-foreground"
												: "border-muted-foreground/40"
										}`}
									>
										{marcada ? "✓" : ""}
									</span>
									<div className="min-w-0 flex-1">
										<div className="font-semibold">Comanda {m.numero}</div>
										{m.nomecliente ? (
											<div className="truncate text-xs text-muted-foreground">
												{m.nomecliente}
											</div>
										) : null}
									</div>
									<span className="font-medium tabular-nums">
										{money(m.valortotal)}
									</span>
								</button>
							);
						})
					)}
				</div>
				{erro ? <p className="text-sm text-destructive">{erro}</p> : null}
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						disabled={loading || carregandoPreview}
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button
						className="flex-1"
						disabled={
							loading || carregandoPreview || selecionadas.size === 0
						}
						onClick={() => void irParaConfirmacao()}
					>
						{carregandoPreview
							? "Carregando..."
							: `Continuar (${selecionadas.size})`}
					</Button>
				</div>
			</div>
		</div>
	);
}
