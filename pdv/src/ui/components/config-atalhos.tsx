import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/ui/components/ui/card";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

function moverItem(lista: ProdutoLocal[], id: string, delta: number) {
	const idx = lista.findIndex((p) => p.id === id);
	const destino = idx + delta;
	if (idx < 0 || destino < 0 || destino >= lista.length) return lista;
	const next = [...lista];
	const [item] = next.splice(idx, 1);
	next.splice(destino, 0, item);
	return next;
}

export function ConfigAtalhos({
	secundario,
	onMensagem,
}: {
	secundario: boolean;
	onMensagem: (texto: string) => void;
}) {
	const [atalhos, setAtalhos] = useState<ProdutoLocal[]>([]);
	const [busca, setBusca] = useState("");
	const [resultados, setResultados] = useState<ProdutoLocal[]>([]);
	const [carregando, setCarregando] = useState(false);
	const [salvando, setSalvando] = useState(false);

	const idsAtalho = useMemo(() => new Set(atalhos.map((p) => p.id)), [atalhos]);

	async function recarregar() {
		setAtalhos(await pdvInvoke<ProdutoLocal[]>("listarAtalhos"));
	}

	useEffect(() => {
		void recarregar().catch(() => setAtalhos([]));
	}, []);

	useEffect(() => {
		const termo = busca.trim();
		if (termo.length < 1) {
			setResultados([]);
			return;
		}
		const timer = setTimeout(() => {
			void (async () => {
				setCarregando(true);
				try {
					const lista = await pdvInvoke<ProdutoLocal[]>(
						"buscarProdutos",
						termo,
					);
					setResultados(lista.filter((p) => !idsAtalho.has(p.id)));
				} catch {
					setResultados([]);
				} finally {
					setCarregando(false);
				}
			})();
		}, 300);
		return () => clearTimeout(timer);
	}, [busca, idsAtalho]);

	async function persistir(proxima: ProdutoLocal[]) {
		if (secundario) return;
		setSalvando(true);
		onMensagem("");
		try {
			const result = await pdvInvoke<{
				quantidade: number;
				nuvem: boolean;
			}>("salvarAtalhos", proxima.map((p) => p.id));
			setAtalhos(proxima);
			onMensagem(
				result.nuvem
					? `${result.quantidade} atalho(s) gravados neste PDV e na nuvem.`
					: `${result.quantidade} atalho(s) gravados neste PDV. A nuvem será atualizada quando houver conexão.`,
			);
		} catch (err) {
			onMensagem(
				err instanceof Error ? err.message : "Falha ao salvar atalhos",
			);
			await recarregar();
		} finally {
			setSalvando(false);
		}
	}

	function adicionar(produto: ProdutoLocal) {
		if (idsAtalho.has(produto.id)) return;
		void persistir([...atalhos, produto]);
		setBusca("");
		setResultados([]);
	}

	function remover(id: string) {
		void persistir(atalhos.filter((p) => p.id !== id));
	}

	function reordenar(id: string, delta: number) {
		void persistir(moverItem(atalhos, id, delta));
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Atalhos de produtos</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<p className="text-xs text-muted-foreground">
					{secundario
						? "Neste PDV secundário os atalhos vêm do principal. Configure lá e use Carga local."
						: "Os atalhos aparecem no topo da venda (mesa, comanda e balcão). A ordem da lista é a ordem na tela."}
				</p>

				{!secundario ? (
					<div className="space-y-2">
						<Label htmlFor="busca-atalho">Buscar produto</Label>
						<Input
							id="busca-atalho"
							value={busca}
							onChange={(e) => setBusca(e.target.value)}
							placeholder="Nome, código ou EAN"
							disabled={salvando}
						/>
						{carregando ? (
							<p className="text-xs text-muted-foreground">Buscando…</p>
						) : null}
						{resultados.length > 0 ? (
							<ul className="max-h-56 overflow-auto rounded-md border">
								{resultados.map((p) => (
									<li
										key={p.id}
										className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{p.descricao}
											</p>
											<p className="text-xs text-muted-foreground">
												{money(p.preco)}
												{p.unidademedida ? ` · ${p.unidademedida}` : ""}
											</p>
										</div>
										<Button
											type="button"
											size="sm"
											variant="outline"
											disabled={salvando}
											onClick={() => adicionar(p)}
										>
											<Plus className="size-4" />
											Adicionar
										</Button>
									</li>
								))}
							</ul>
						) : busca.trim() && !carregando ? (
							<p className="text-xs text-muted-foreground">
								Nenhum produto encontrado no catálogo local.
							</p>
						) : null}
					</div>
				) : null}

				<div className="space-y-2">
					<p className="text-sm font-medium">
						Atalhos atuais ({atalhos.length})
					</p>
					{atalhos.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Nenhum atalho configurado.
						</p>
					) : (
						<ul className="rounded-md border">
							{atalhos.map((p, idx) => (
								<li
									key={p.id}
									className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
								>
									<span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
										{idx + 1}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{p.descricao}</p>
										<p className="text-xs text-muted-foreground">
											{money(p.preco)}
											{p.unidademedida ? ` · ${p.unidademedida}` : ""}
										</p>
									</div>
									{secundario ? null : (
										<div className="flex shrink-0 gap-1">
											<Button
												type="button"
												size="icon"
												variant="ghost"
												disabled={salvando || idx === 0}
												onClick={() => reordenar(p.id, -1)}
												aria-label="Subir"
											>
												<ChevronUp className="size-4" />
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												disabled={salvando || idx === atalhos.length - 1}
												onClick={() => reordenar(p.id, 1)}
												aria-label="Descer"
											>
												<ChevronDown className="size-4" />
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												disabled={salvando}
												onClick={() => remover(p.id)}
												aria-label="Remover"
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
