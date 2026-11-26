import { BI_CATALOGO_GRAFICOS } from "@/constants/bi-catalogo.js";
import {
	atualizarConsultaBi,
	atualizarWidgetBi,
	buscarConsultaBiPorId,
	buscarLayoutDashboardBi,
	buscarWidgetBiComConsulta,
	criarConsultaBi,
	criarWidgetBi,
	excluirConsultaBi,
	excluirWidgetBi,
	listarConsultasBiPorEmpresa,
	listarSchemaRelatorios,
	listarWidgetsBiPorEmpresa,
	upsertLayoutDashboardBi,
} from "@/repositories/editor-sql-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import {
	ErroValidacaoSqlBi,
	extrairESubstituirParametros,
	validarEPrepararSqlBi,
} from "@/util/validar-sql-bi.js";
import type {
	BiColSpan,
	BiLayoutItem,
} from "../../../drizzle/tables/bi-dashboard-layout.js";
import type {
	BiMapeamentoGrafico,
	BiTipoGrafico,
} from "../../../drizzle/tables/bi-widget.js";
import {
	executarConsultaSqlService,
	limparCacheWidget,
	obterDoCacheWidget,
	salvarNoCacheWidget,
} from "./executar-consulta-sql.js";

const MAX_WIDGETS_POR_DASHBOARD = 12;

export async function obterSchemaBiService() {
	const views = await listarSchemaRelatorios();
	return httpOk({ views });
}

export async function listarCatalogoBiService() {
	return httpOk({ catalogo: BI_CATALOGO_GRAFICOS });
}

// --- Consultas ---

export async function listarConsultasBiService(idempresa: string) {
	const consultas = await listarConsultasBiPorEmpresa(idempresa);
	return httpOk({ consultas });
}

export async function criarConsultaBiService(params: {
	idempresa: string;
	idusuario: string;
	nome: string;
	descricao?: string | null;
	sql: string;
	origem?: "personalizada" | "catalogo";
}) {
	try {
		const { parametrosDetectados } = extrairESubstituirParametros(params.sql, {
			data_inicio: "2026-01-01",
			data_fim: "2026-01-31",
		});
		// Valida sintaxe e regras de segurança (preenchendo params customizados fictícios se houver)
		const paramsTeste: Record<string, string> = {
			data_inicio: "2026-01-01",
			data_fim: "2026-01-31",
		};
		for (const p of parametrosDetectados) {
			if (!paramsTeste[p]) paramsTeste[p] = "teste";
		}
		validarEPrepararSqlBi(params.sql, paramsTeste);

		const consulta = await criarConsultaBi({
			idempresa: params.idempresa,
			nome: params.nome.trim(),
			descricao: params.descricao?.trim() || null,
			sql: params.sql.trim(),
			parametros: parametrosDetectados.map((nome) => ({
				nome,
				tipo: nome.includes("data") ? "date" : "text",
			})),
			origem: params.origem ?? "personalizada",
			criadopor: params.idusuario,
		});
		return httpCriacao({ consulta });
	} catch (erro) {
		const msg =
			erro instanceof ErroValidacaoSqlBi
				? erro.message
				: "Não foi possível salvar a consulta SQL.";
		return httpBadRequest(msg);
	}
}

export async function atualizarConsultaBiService(params: {
	idempresa: string;
	id: string;
	nome?: string;
	descricao?: string | null;
	sql?: string;
}) {
	const existente = await buscarConsultaBiPorId(params.idempresa, params.id);
	if (!existente) {
		return httpNaoEncontrado("Consulta não encontrada.");
	}

	let parametros = existente.parametros;
	if (params.sql !== undefined) {
		try {
			const paramsTeste: Record<string, string> = {
				data_inicio: "2026-01-01",
				data_fim: "2026-01-31",
			};
			const pre = extrairESubstituirParametros(params.sql, paramsTeste);
			for (const p of pre.parametrosDetectados) {
				if (!paramsTeste[p]) paramsTeste[p] = "teste";
			}
			const validado = validarEPrepararSqlBi(params.sql, paramsTeste);
			parametros = validado.parametrosDetectados.map((nome) => ({
				nome,
				tipo: nome.includes("data") ? "date" : "text",
			}));
		} catch (erro) {
			const msg =
				erro instanceof ErroValidacaoSqlBi ? erro.message : "SQL inválido.";
			return httpBadRequest(msg);
		}
	}

	const atualizada = await atualizarConsultaBi(params.idempresa, params.id, {
		...(params.nome !== undefined ? { nome: params.nome.trim() } : {}),
		...(params.descricao !== undefined
			? { descricao: params.descricao?.trim() || null }
			: {}),
		...(params.sql !== undefined ? { sql: params.sql.trim(), parametros } : {}),
	});

	limparCacheWidget(params.idempresa);
	return httpOk({ consulta: atualizada });
}

export async function excluirConsultaBiService(idempresa: string, id: string) {
	const excluida = await excluirConsultaBi(idempresa, id);
	if (!excluida) {
		return httpNaoEncontrado("Consulta não encontrada.");
	}
	limparCacheWidget(idempresa);
	return httpOk({ excluida: true });
}

// --- Widgets ---

export async function listarWidgetsBiService(idempresa: string) {
	const registros = await listarWidgetsBiPorEmpresa(idempresa);
	return httpOk({
		widgets: registros.map((r) => ({
			...r.widget,
			consulta: r.consulta,
		})),
	});
}

export async function criarWidgetBiService(params: {
	idempresa: string;
	idusuario: string;
	idconsulta?: string;
	sql?: string;
	nomeConsulta?: string;
	titulo: string;
	subtitulo?: string | null;
	tipografico: BiTipoGrafico;
	mapeamento: BiMapeamentoGrafico;
	cachettlsegundos?: number;
	adicionarAoDashboard?: boolean;
	colSpan?: BiColSpan;
}) {
	let idconsulta = params.idconsulta;

	if (!idconsulta) {
		if (!params.sql) {
			return httpBadRequest("Informe uma consulta salva ou um SQL válido.");
		}
		const criada = await criarConsultaBiService({
			idempresa: params.idempresa,
			idusuario: params.idusuario,
			nome: params.nomeConsulta?.trim() || params.titulo.trim(),
			descricao: params.subtitulo ?? null,
			sql: params.sql,
			origem: "personalizada",
		});
		if (!criada.success || !criada.body?.consulta) {
			return criada;
		}
		idconsulta = criada.body.consulta.id;
	} else {
		const existente = await buscarConsultaBiPorId(params.idempresa, idconsulta);
		if (!existente) {
			return httpNaoEncontrado("Consulta vinculada não encontrada.");
		}
	}

	const widget = await criarWidgetBi({
		idempresa: params.idempresa,
		idconsulta,
		titulo: params.titulo.trim(),
		subtitulo: params.subtitulo?.trim() || null,
		tipografico: params.tipografico,
		mapeamento: params.mapeamento,
		cachettlsegundos: Math.min(Math.max(params.cachettlsegundos ?? 300, 30), 3600),
	});

	if (!widget) {
		return httpBadRequest("Erro ao criar widget.");
	}

	if (params.adicionarAoDashboard !== false) {
		const layoutAtual = await buscarLayoutDashboardBi(params.idempresa);
		const itensAtuais = layoutAtual?.itens ?? [];
		if (itensAtuais.length < MAX_WIDGETS_POR_DASHBOARD) {
			const novosItens: BiLayoutItem[] = [
				...itensAtuais,
				{
					widgetId: widget.id,
					ordem: itensAtuais.length,
					colSpan: params.colSpan ?? 6,
				},
			];
			await upsertLayoutDashboardBi({
				idempresa: params.idempresa,
				itens: novosItens,
				atualizadopor: params.idusuario,
			});
		}
	}

	return httpCriacao({ widget });
}

export async function instalarWidgetDoCatalogoService(params: {
	idempresa: string;
	idusuario: string;
	codigo: string;
}) {
	const item = BI_CATALOGO_GRAFICOS.find((c) => c.codigo === params.codigo);
	if (!item) {
		return httpNaoEncontrado("Gráfico não encontrado no catálogo.");
	}

	const layoutAtual = await buscarLayoutDashboardBi(params.idempresa);
	const itensAtuais = layoutAtual?.itens ?? [];
	if (itensAtuais.length >= MAX_WIDGETS_POR_DASHBOARD) {
		return httpBadRequest(
			`Limite máximo de ${MAX_WIDGETS_POR_DASHBOARD} widgets no painel atingido.`,
		);
	}

	const consultaRes = await criarConsultaBiService({
		idempresa: params.idempresa,
		idusuario: params.idusuario,
		nome: item.titulo,
		descricao: item.descricao,
		sql: item.sql,
		origem: "catalogo",
	});
	if (!consultaRes.success || !consultaRes.body?.consulta) {
		return consultaRes;
	}

	const widget = await criarWidgetBi({
		idempresa: params.idempresa,
		idconsulta: consultaRes.body.consulta.id,
		titulo: item.titulo,
		subtitulo: item.descricao,
		tipografico: item.tipoGrafico,
		mapeamento: item.mapeamento,
		cachettlsegundos: 300,
		codigocatalogo: item.codigo,
	});

	if (!widget) {
		return httpBadRequest("Erro ao instalar gráfico do catálogo.");
	}

	const novosItens: BiLayoutItem[] = [
		...itensAtuais,
		{
			widgetId: widget.id,
			ordem: itensAtuais.length,
			colSpan: item.larguraPadrao,
		},
	];

	await upsertLayoutDashboardBi({
		idempresa: params.idempresa,
		itens: novosItens,
		atualizadopor: params.idusuario,
	});

	return httpCriacao({
		widget: {
			...widget,
			consulta: consultaRes.body.consulta,
		},
	});
}

export async function atualizarWidgetBiService(params: {
	idempresa: string;
	id: string;
	titulo?: string;
	subtitulo?: string | null;
	tipografico?: BiTipoGrafico;
	mapeamento?: BiMapeamentoGrafico;
	cachettlsegundos?: number;
}) {
	const atualizado = await atualizarWidgetBi(params.idempresa, params.id, {
		...(params.titulo !== undefined ? { titulo: params.titulo.trim() } : {}),
		...(params.subtitulo !== undefined
			? { subtitulo: params.subtitulo?.trim() || null }
			: {}),
		...(params.tipografico !== undefined
			? { tipografico: params.tipografico }
			: {}),
		...(params.mapeamento !== undefined
			? { mapeamento: params.mapeamento }
			: {}),
		...(params.cachettlsegundos !== undefined
			? {
					cachettlsegundos: Math.min(
						Math.max(params.cachettlsegundos, 30),
						3600,
					),
				}
			: {}),
	});

	if (!atualizado) {
		return httpNaoEncontrado("Widget não encontrado.");
	}

	limparCacheWidget(params.idempresa, params.id);
	return httpOk({ widget: atualizado });
}

export async function excluirWidgetBiService(
	idempresa: string,
	id: string,
	idusuario?: string | null,
) {
	const excluido = await excluirWidgetBi(idempresa, id);
	if (!excluido) {
		return httpNaoEncontrado("Widget não encontrado.");
	}

	const layout = await buscarLayoutDashboardBi(idempresa);
	if (layout) {
		const filtrados = layout.itens
			.filter((it) => it.widgetId !== id)
			.map((it, idx) => ({ ...it, ordem: idx }));
		await upsertLayoutDashboardBi({
			idempresa,
			itens: filtrados,
			atualizadopor: idusuario ?? null,
		});
	}

	limparCacheWidget(idempresa, id);
	return httpOk({ excluido: true });
}

export async function executarWidgetBiService(params: {
	idempresa: string;
	idusuario?: string | null;
	widgetId: string;
	parametros?: Record<string, unknown>;
	forcarAtualizacao?: boolean;
}) {
	const encontrado = await buscarWidgetBiComConsulta(
		params.idempresa,
		params.widgetId,
	);
	if (!encontrado) {
		return httpNaoEncontrado("Widget não encontrado.");
	}

	const chaveParams = JSON.stringify(params.parametros ?? {});
	const chaveCache = `${params.idempresa}:${params.widgetId}:${chaveParams}`;

	if (!params.forcarAtualizacao) {
		const emCache = obterDoCacheWidget(chaveCache);
		if (emCache) {
			return httpOk({
				...emCache,
				doCache: true,
			});
		}
	}

	const resposta = await executarConsultaSqlService({
		idempresa: params.idempresa,
		idusuario: params.idusuario,
		sql: encontrado.consulta.sql,
		parametros: params.parametros,
		limiteLinhas: 500,
		origem: "widget",
		idrecurso: params.widgetId,
	});

	if (resposta.success && "body" in resposta && resposta.body) {
		salvarNoCacheWidget(
			chaveCache,
			resposta.body,
			encontrado.widget.cachettlsegundos,
		);
		return httpOk({
			...resposta.body,
			doCache: false,
		});
	}

	return resposta;
}

// --- Dashboard Layout ---

export async function obterDashboardPersonalizadoService(idempresa: string) {
	const [layout, registrosWidgets] = await Promise.all([
		buscarLayoutDashboardBi(idempresa),
		listarWidgetsBiPorEmpresa(idempresa),
	]);

	const widgetsPorId = new Map(
		registrosWidgets.map((r) => [
			r.widget.id,
			{ ...r.widget, consulta: r.consulta },
		]),
	);

	const itensValidos = (layout?.itens ?? [])
		.filter((it) => widgetsPorId.has(it.widgetId))
		.sort((a, b) => a.ordem - b.ordem)
		.map((it, idx) => ({
			...it,
			ordem: idx,
			widget: widgetsPorId.get(it.widgetId)!,
		}));

	return httpOk({
		nome: layout?.nome ?? "Meu Painel",
		itens: itensValidos,
		limiteWidgets: MAX_WIDGETS_POR_DASHBOARD,
	});
}

export async function salvarDashboardLayoutService(params: {
	idempresa: string;
	idusuario: string;
	nome?: string;
	itens: BiLayoutItem[];
}) {
	if (params.itens.length > MAX_WIDGETS_POR_DASHBOARD) {
		return httpBadRequest(
			`O painel suporta no máximo ${MAX_WIDGETS_POR_DASHBOARD} widgets.`,
		);
	}

	const widgetsEmpresa = await listarWidgetsBiPorEmpresa(params.idempresa);
	const idsValidos = new Set(widgetsEmpresa.map((r) => r.widget.id));

	const itensSanitizados: BiLayoutItem[] = params.itens
		.filter((it) => idsValidos.has(it.widgetId))
		.map((it, idx) => ({
			widgetId: it.widgetId,
			ordem: idx,
			colSpan: ([4, 6, 8, 12] as BiColSpan[]).includes(it.colSpan)
				? it.colSpan
				: 6,
		}));

	const layout = await upsertLayoutDashboardBi({
		idempresa: params.idempresa,
		nome: params.nome,
		itens: itensSanitizados,
		atualizadopor: params.idusuario,
	});

	return httpOk({ layout });
}
