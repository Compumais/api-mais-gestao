import { useEffect, useMemo, useState } from "react";
import {
	type BotaoMeioPagamento,
	CHAVE_TECLADO_VIRTUAL_PAGAMENTO,
	MEIOS_PAGAMENTO_PADRAO,
	montarBotoesMeiosPagamento,
	tecladoVirtualPagamentoAtivo,
} from "@/lib/pagamento";
import { pdvInvoke } from "@/lib/pdv-api";
import type { MeioPagamentoLocal } from "@/lib/pdv-types";
import {
	type AcaoTecla,
	CHAVE_TECLAS_FUNCAO,
	conflitosTeclas,
	conflitosTeclasMeios,
	ESCOPO_VENDA,
	type MapaTeclasFuncao,
	type MapaTeclasMeios,
	normalizarHotkey,
	parseTeclasFuncao,
	parseTeclasMeiosPagamento,
	ROTULO_ACAO_TECLA,
	resolverTeclasMeiosPagamento,
	serializarTeclasFuncao,
	TECLA_MEIO_NENHUMA,
	TECLAS_FUNCAO_PADRAO,
} from "@/lib/teclas-funcao";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { Select } from "@/ui/components/ui/select";

function CampoTecla({
	id,
	label,
	hint,
	tecla,
	capturando,
	onCapturar,
	onAtribuir,
	onLimpar,
}: {
	id: string;
	label: string;
	hint?: string;
	tecla: string;
	capturando: string | null;
	onCapturar: (id: string | null) => void;
	onAtribuir: (id: string, tecla: string) => void;
	onLimpar?: (id: string) => void;
}) {
	return (
		<div className="space-y-1 rounded-md border p-3">
			<Label>{label}</Label>
			{hint ? (
				<p className="text-[11px] text-muted-foreground">{hint}</p>
			) : null}
			<div className="flex items-center gap-2">
				<span className="min-w-16 rounded bg-muted px-2 py-1 text-center text-sm font-semibold">
					{tecla || "—"}
				</span>
				<Button
					type="button"
					size="sm"
					variant={capturando === id ? "default" : "outline"}
					onKeyDown={(e) => {
						if (capturando !== id) return;
						e.preventDefault();
						e.stopPropagation();
						const gravada = normalizarHotkey(e.nativeEvent);
						if (gravada) onAtribuir(id, gravada);
					}}
					onClick={() => onCapturar(capturando === id ? null : id)}
				>
					{capturando === id ? "Pressione…" : "Gravar"}
				</Button>
				{onLimpar ? (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={!tecla}
						onClick={() => onLimpar(id)}
					>
						Limpar
					</Button>
				) : null}
			</div>
		</div>
	);
}

export function ConfigTeclasFuncao({
	valorInicial,
	tecladoVirtualInicial,
	onMensagem,
	onSalvo,
}: {
	valorInicial?: string;
	tecladoVirtualInicial?: string;
	onMensagem: (msg: string) => void;
	onSalvo?: (
		mapa: MapaTeclasFuncao,
		tecladoVirtual: string,
		meios: MapaTeclasMeios,
	) => void;
}) {
	const [mapa, setMapa] = useState<MapaTeclasFuncao>(() =>
		parseTeclasFuncao(valorInicial),
	);
	const [teclasMeios, setTeclasMeios] = useState<MapaTeclasMeios>(() =>
		parseTeclasMeiosPagamento(valorInicial),
	);
	const [formas, setFormas] = useState<BotaoMeioPagamento[]>([]);
	const [formasRetaguarda, setFormasRetaguarda] = useState(false);
	const [tecladoVirtual, setTecladoVirtual] = useState(() =>
		tecladoVirtualPagamentoAtivo(tecladoVirtualInicial) ? "1" : "0",
	);
	const [capturando, setCapturando] = useState<string | null>(null);
	const [salvando, setSalvando] = useState(false);

	useEffect(() => {
		setMapa(parseTeclasFuncao(valorInicial));
		setTeclasMeios(parseTeclasMeiosPagamento(valorInicial));
	}, [valorInicial]);

	useEffect(() => {
		setTecladoVirtual(
			tecladoVirtualPagamentoAtivo(tecladoVirtualInicial) ? "1" : "0",
		);
	}, [tecladoVirtualInicial]);

	useEffect(() => {
		void pdvInvoke<MeioPagamentoLocal[]>("listarMeiosPagamento")
			.then((lista) => {
				setFormas(montarBotoesMeiosPagamento(lista));
				setFormasRetaguarda(lista.length > 0);
			})
			.catch(() => {
				setFormas(MEIOS_PAGAMENTO_PADRAO);
				setFormasRetaguarda(false);
			});
	}, []);

	const teclasExibidas = useMemo(
		() => resolverTeclasMeiosPagamento(formas, mapa, teclasMeios),
		[formas, mapa, teclasMeios],
	);
	const conflitosVenda = conflitosTeclas(mapa, ESCOPO_VENDA);
	const conflitosPagamento = conflitosTeclasMeios(teclasExibidas);
	const temConflito =
		conflitosVenda.length > 0 || conflitosPagamento.length > 0;

	function atribuirAcao(acao: AcaoTecla, tecla: string) {
		setMapa((prev) => ({ ...prev, [acao]: tecla }));
		setCapturando(null);
	}

	function atribuirMeio(id: string, tecla: string) {
		setTeclasMeios((prev) => ({ ...prev, [id]: tecla }));
		setCapturando(null);
	}

	function limparMeio(id: string) {
		setTeclasMeios((prev) => ({ ...prev, [id]: TECLA_MEIO_NENHUMA }));
		setCapturando(null);
	}

	async function salvar() {
		setSalvando(true);
		try {
			const meiosParaSalvar: MapaTeclasMeios = {};
			for (const forma of formas) {
				if (teclasMeios[forma.id] === TECLA_MEIO_NENHUMA) {
					meiosParaSalvar[forma.id] = TECLA_MEIO_NENHUMA;
					continue;
				}
				const tecla = teclasExibidas[forma.id]?.trim();
				if (tecla) {
					meiosParaSalvar[forma.id] = tecla;
				}
			}
			await pdvInvoke("saveConfig", {
				[CHAVE_TECLAS_FUNCAO]: serializarTeclasFuncao(mapa, meiosParaSalvar),
				[CHAVE_TECLADO_VIRTUAL_PAGAMENTO]: tecladoVirtual,
			});
			setTeclasMeios(meiosParaSalvar);
			onSalvo?.(mapa, tecladoVirtual, meiosParaSalvar);
			onMensagem("Atalhos de teclado salvos neste PDV.");
		} catch (err) {
			onMensagem(
				err instanceof Error
					? err.message
					: "Falha ao salvar atalhos de teclado",
			);
		} finally {
			setSalvando(false);
		}
	}

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<div>
					<h3 className="text-sm font-semibold">Operação do PDV</h3>
					<p className="text-sm text-muted-foreground">
						Valem na tela de venda, com o pagamento fechado. Conflitos só são
						checados entre estas teclas.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{ESCOPO_VENDA.map((acao) => (
						<CampoTecla
							key={acao}
							id={acao}
							label={ROTULO_ACAO_TECLA[acao]}
							tecla={mapa[acao]}
							capturando={capturando}
							onCapturar={setCapturando}
							onAtribuir={(id, tecla) => atribuirAcao(id as AcaoTecla, tecla)}
						/>
					))}
				</div>
			</section>

			<section className="space-y-3">
				<div>
					<h3 className="text-sm font-semibold">Meios de pagamento</h3>
					<p className="text-sm text-muted-foreground">
						{formasRetaguarda
							? "Uma tecla por forma cadastrada na retaguarda. Só disparam no modal de pagamento."
							: "Nenhuma forma sincronizada. Usando dinheiro, PIX e cartão. Sincronize o PDV para listar as formas da retaguarda."}
					</p>
				</div>
				<div className="space-y-2 rounded-md border p-3">
					<Label htmlFor="teclado_virtual_pagamento">Teclado virtual</Label>
					<Select
						id="teclado_virtual_pagamento"
						value={tecladoVirtual}
						onChange={(e) => setTecladoVirtual(e.target.value)}
					>
						<option value="1">Mostrar no pagamento (touch)</option>
						<option value="0">Ocultar — só teclado físico</option>
					</Select>
					<p className="text-xs text-muted-foreground">
						O teclado físico continua lançando o valor mesmo com os botões
						ocultos.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{formas.length === 0 ? (
						<p className="text-sm text-muted-foreground sm:col-span-2">
							Carregando formas de pagamento…
						</p>
					) : (
						formas.map((forma) => (
							<CampoTecla
								key={forma.id}
								id={forma.id}
								label={forma.label}
								hint={forma.aprazo === 1 ? "A prazo" : undefined}
								tecla={teclasExibidas[forma.id] ?? ""}
								capturando={capturando}
								onCapturar={setCapturando}
								onAtribuir={atribuirMeio}
								onLimpar={limparMeio}
							/>
						))
					)}
				</div>
			</section>

			{temConflito ? (
				<p className="text-sm text-amber-700 dark:text-amber-400">
					Há teclas repetidas no mesmo contexto (venda ou pagamento). Ajuste
					antes de usar.
				</p>
			) : null}
			<div className="flex flex-wrap gap-2">
				<Button type="button" disabled={salvando} onClick={() => void salvar()}>
					{salvando ? "Salvando…" : "Salvar atalhos"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						setMapa({ ...TECLAS_FUNCAO_PADRAO });
						setTeclasMeios({});
						setTecladoVirtual("1");
					}}
				>
					Restaurar padrões
				</Button>
			</div>
		</div>
	);
}
