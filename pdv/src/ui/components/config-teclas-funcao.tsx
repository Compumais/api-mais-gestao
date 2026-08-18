import { useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	ACOES_TECLA,
	type AcaoTecla,
	CHAVE_TECLAS_FUNCAO,
	conflitosTeclas,
	type MapaTeclasFuncao,
	normalizarHotkey,
	parseTeclasFuncao,
	ROTULO_ACAO_TECLA,
	serializarTeclasFuncao,
	TECLAS_FUNCAO_PADRAO,
} from "@/lib/teclas-funcao";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";

const ESCOPO_VENDA: AcaoTecla[] = [
	"finalizar",
	"receber",
	"fechar_caixa",
	"sair",
	"sincronizar",
	"historico",
];
const ESCOPO_PAGAMENTO: AcaoTecla[] = ["dinheiro", "pix", "cartao"];

export function ConfigTeclasFuncao({
	valorInicial,
	onMensagem,
	onSalvo,
}: {
	valorInicial?: string;
	onMensagem: (msg: string) => void;
	onSalvo?: (mapa: MapaTeclasFuncao) => void;
}) {
	const [mapa, setMapa] = useState<MapaTeclasFuncao>(() =>
		parseTeclasFuncao(valorInicial),
	);
	const [capturando, setCapturando] = useState<AcaoTecla | null>(null);
	const [salvando, setSalvando] = useState(false);

	const conflitosVenda = conflitosTeclas(mapa, ESCOPO_VENDA);
	const conflitosPagamento = conflitosTeclas(mapa, ESCOPO_PAGAMENTO);
	const temConflito =
		conflitosVenda.length > 0 || conflitosPagamento.length > 0;

	function atribuir(acao: AcaoTecla, tecla: string) {
		setMapa((prev) => ({ ...prev, [acao]: tecla }));
		setCapturando(null);
	}

	async function salvar() {
		setSalvando(true);
		try {
			await pdvInvoke("saveConfig", {
				[CHAVE_TECLAS_FUNCAO]: serializarTeclasFuncao(mapa),
			});
			onSalvo?.(mapa);
			onMensagem("Teclas rápidas salvas neste PDV.");
		} catch (err) {
			onMensagem(
				err instanceof Error ? err.message : "Falha ao salvar teclas rápidas",
			);
		} finally {
			setSalvando(false);
		}
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Clique em gravar e pressione a tecla. F8 no pagamento vale para PIX; na
				venda, Finalizar só dispara com o modal fechado.
			</p>
			<div className="grid gap-3 sm:grid-cols-2">
				{ACOES_TECLA.map((acao) => (
					<div key={acao} className="space-y-1 rounded-md border p-3">
						<Label>{ROTULO_ACAO_TECLA[acao]}</Label>
						<div className="flex items-center gap-2">
							<span className="min-w-16 rounded bg-muted px-2 py-1 text-center text-sm font-semibold">
								{mapa[acao]}
							</span>
							<Button
								type="button"
								size="sm"
								variant={capturando === acao ? "default" : "outline"}
								onKeyDown={(e) => {
									if (capturando !== acao) return;
									e.preventDefault();
									e.stopPropagation();
									const tecla = normalizarHotkey(e.nativeEvent);
									if (tecla) atribuir(acao, tecla);
								}}
								onClick={() =>
									setCapturando((atual) => (atual === acao ? null : acao))
								}
							>
								{capturando === acao ? "Pressione…" : "Gravar"}
							</Button>
						</div>
					</div>
				))}
			</div>
			{temConflito ? (
				<p className="text-sm text-amber-700 dark:text-amber-400">
					Há teclas repetidas no mesmo contexto (venda ou pagamento). Ajuste
					antes de usar.
				</p>
			) : null}
			<div className="flex flex-wrap gap-2">
				<Button type="button" disabled={salvando} onClick={() => void salvar()}>
					{salvando ? "Salvando…" : "Salvar teclas"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => setMapa({ ...TECLAS_FUNCAO_PADRAO })}
				>
					Restaurar padrões
				</Button>
			</div>
		</div>
	);
}
