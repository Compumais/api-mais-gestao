import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovaVendaPdvGourmet,
	VendaPdvGourmet,
} from "@/model/venda-pdv-gourmet-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarVendaPdvGourmet,
	excluirVendaPdvGourmet,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	gerarContasReceberVendaPdvService,
	type PagamentoErpVendaPdv,
} from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";
import { registrarRecebimentosVendaService } from "@/service/venda-pdv-gourmet/registrar-recebimentos-venda.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarVendaPdvGourmetParametros = {
	dadosVendaPdvGourmet: NovaVendaPdvGourmet;
	idusuario: string;
	pagamentosErp?: PagamentoErpVendaPdv[] | undefined;
};

export async function criarVendaPdvGourmetService({
	dadosVendaPdvGourmet,
	idusuario,
	pagamentosErp,
}: CriarVendaPdvGourmetParametros): Promise<
	HttpResponse<VendaPdvGourmet | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosVendaPdvGourmet.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarVendaPdvGourmet(dadosVendaPdvGourmet);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_venda_pdv_gourmet",
		idusuario,
		recurso: "venda_pdv_gourmet",
		idrecurso: registro.id,
		idempresa: dadosVendaPdvGourmet.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeropdv: registro.numeropdv,
			idcontamesa: registro.idcontamesa,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirVendaPdvGourmet(registro.id);
		return httpErroInterno();
	}

	const recebimentos = await registrarRecebimentosVendaService({
		venda: registro,
		idusuario,
	});

	if (!recebimentos.success) {
		await excluirVendaPdvGourmet(registro.id);
		return {
			success: false,
			status: 400,
			error: recebimentos.mensagem,
			code: "RECEBIMENTOS_VENDA_ERRO",
		};
	}

	const formasErp = pagamentosErp?.filter((f) => f.valor > 0) ?? [];

	if (formasErp.length > 0) {
		if (!dadosVendaPdvGourmet.identidade?.trim()) {
			await excluirVendaPdvGourmet(registro.id);
			return {
				success: false,
				status: 400,
				error: "Cliente obrigatório para pagamento a prazo no PDV",
				code: "CLIENTE_PRAZO_OBRIGATORIO",
			};
		}

		const contasReceber = await gerarContasReceberVendaPdvService({
			venda: registro,
			idusuario,
			identidade: dadosVendaPdvGourmet.identidade,
			idcondicaopagto: dadosVendaPdvGourmet.idcondicaopagto ?? undefined,
			pagamentosErp: formasErp,
		});

		if (!contasReceber.success) {
			await excluirVendaPdvGourmet(registro.id);
			return {
				success: false,
				status: contasReceber.status,
				error: contasReceber.error ?? "Erro ao gerar contas a receber",
				code: contasReceber.code ?? "CONTAS_RECEBER_PDV_ERRO",
			};
		}
	}

	return httpCriacao<VendaPdvGourmet>(registro);
}
