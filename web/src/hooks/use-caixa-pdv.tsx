"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	getNumeropdv,
	parseValor,
	STATUS_CAIXA,
	extrairPagamentosResumo,
	somarPagamentosResumo,
	pagamentosResumoVazio,
	type PagamentosResumo,
} from "@/lib/gourmet-utils";
import type { FechamentoCaixa } from "@/services/fechamento-caixa.service";
import { fechamentoCaixaService } from "@/services/fechamento-caixa.service";
import { contaMesaService, type ContaMesa } from "@/services/conta-mesa.service";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvGourmetService } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvItemService } from "@/services/venda-pdv-item.service";

export interface ResumoTurnoCaixa {
	qtdVendas: number;
	pagamentos: PagamentosResumo;
	totalVendas: number;
	suprimento: number;
	saldoapurado: number;
}

async function somarItensVenda(idempresa: string, idvenda: string): Promise<number> {
	let total = 0;
	let page = 1;
	const limit = 100;

	while (true) {
		const itensResp = await vendaPdvItemService.listar({
			idempresa,
			idvenda,
			page,
			limit,
		});

		for (const item of itensResp.data) {
			total += parseValor(item.precototal);
		}

		if (
			page >= itensResp.paginacao.totalPages ||
			itensResp.data.length < limit
		) {
			break;
		}

		page += 1;
	}

	return total;
}

async function resolverPagamentosVenda(
	venda: VendaPdvGourmet,
	contasPorId: Map<string, ContaMesa>,
): Promise<PagamentosResumo> {
	if (venda.idcontamesa) {
		const conta = contasPorId.get(venda.idcontamesa);
		if (conta) {
			return extrairPagamentosResumo(conta);
		}
	}

	const temPagamentoNaVenda =
		venda.valordinheiro != null ||
		venda.valorcartao != null ||
		venda.valorpix != null ||
		venda.valorprepago != null ||
		venda.valortotal != null;

	if (temPagamentoNaVenda) {
		return extrairPagamentosResumo(venda);
	}

	const totalItens = await somarItensVenda(venda.idempresa, venda.id);
	return {
		dinheiro: totalItens,
		cartao: 0,
		pix: 0,
		prepago: 0,
		total: totalItens,
	};
}

async function calcularResumoTurno(
	caixa: FechamentoCaixa,
	idempresa: string,
	numeropdv: number,
): Promise<ResumoTurnoCaixa> {
	const dataInicio = caixa.datacriacao ?? caixa.datahora ?? undefined;
	const inicioMs = dataInicio ? new Date(dataInicio).getTime() : null;

	const vendas: Awaited<
		ReturnType<typeof vendaPdvGourmetService.listar>
	>["data"] = [];
	let page = 1;
	const limit = 100;

	while (true) {
		const vendasResp = await vendaPdvGourmetService.listar({
			idempresa,
			numeropdv,
			dataInicio,
			page,
			limit,
		});

		const vendasPagina = vendasResp.data.filter((venda) => {
			if (inicioMs == null || !venda.datacriacao) return true;
			return new Date(venda.datacriacao).getTime() >= inicioMs;
		});

		vendas.push(...vendasPagina);

		if (
			page >= vendasResp.paginacao.totalPages ||
			vendasResp.data.length < limit
		) {
			break;
		}

		page += 1;
	}

	const contaIds = [
		...new Set(
			vendas
				.map((venda) => venda.idcontamesa)
				.filter((id): id is string => !!id),
		),
	];
	const contasPorId = new Map<string, ContaMesa>();
	await Promise.all(
		contaIds.map(async (id) => {
			contasPorId.set(id, await contaMesaService.buscar(id));
		}),
	);

	let pagamentos = pagamentosResumoVazio();
	for (const venda of vendas) {
		const pagamentoVenda = await resolverPagamentosVenda(venda, contasPorId);
		pagamentos = somarPagamentosResumo(pagamentos, pagamentoVenda);
	}

	const suprimento = parseValor(caixa.suprimentoinicial);
	const saldoapurado = suprimento + pagamentos.dinheiro;

	return {
		qtdVendas: vendas.length,
		pagamentos,
		totalVendas: pagamentos.total,
		suprimento,
		saldoapurado,
	};
}

interface CaixaPdvContextValue {
	caixaAberto: FechamentoCaixa | null;
	estaAberto: boolean;
	isLoading: boolean;
	numeropdv: number;
	abrirCaixa: (suprimentoinicial: string) => Promise<void>;
	fecharCaixa: (params: {
		saldoinformado: string;
		observacao?: string;
	}) => Promise<void>;
	buscarResumoTurno: () => Promise<ResumoTurnoCaixa | null>;
	isAbrindo: boolean;
	isFechando: boolean;
}

const CaixaPdvContext = createContext<CaixaPdvContextValue | null>(null);

export function CaixaPdvProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const numeropdv = getNumeropdv();

	const queryKey = ["caixa-pdv-aberto", empresa?.id, numeropdv] as const;

	const { data: caixaAberto, isLoading } = useQuery({
		queryKey,
		queryFn: async () => {
			const resp = await fechamentoCaixaService.listar({
				idempresa: empresa!.id,
				pdv: numeropdv,
				status: STATUS_CAIXA.ABERTO,
				limit: 1,
			});
			return resp.data[0] ?? null;
		},
		enabled: !!empresa?.id,
		staleTime: 10_000,
	});

	const abrirMutation = useMutation({
		mutationFn: async (suprimentoinicial: string) => {
			if (!empresa?.id || !user?.id) {
				throw new Error("Empresa ou usuário não selecionado");
			}

			const existente = await fechamentoCaixaService.listar({
				idempresa: empresa.id,
				pdv: numeropdv,
				status: STATUS_CAIXA.ABERTO,
				limit: 1,
			});

			if (existente.data.length > 0) {
				throw new Error("Já existe um caixa aberto para este PDV");
			}

			const agora = new Date().toISOString();

			return fechamentoCaixaService.criar({
				idempresa: empresa.id,
				pdv: numeropdv,
				idusuario: user.id,
				idusuariosuprimento: user.id,
				suprimentoinicial: parseValor(suprimentoinicial).toFixed(2),
				status: STATUS_CAIXA.ABERTO,
				local: 1,
				datahora: agora,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["caixa-pdv-aberto"] });
			queryClient.invalidateQueries({ queryKey: ["fechamentos-caixa"] });
			toast.success("Caixa aberto com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao abrir caixa");
		},
	});

	const fecharMutation = useMutation({
		mutationFn: async ({
			saldoinformado,
			observacao,
		}: {
			saldoinformado: string;
			observacao?: string;
		}) => {
			if (!empresa?.id || !user?.id || !caixaAberto) {
				throw new Error("Caixa não está aberto");
			}

			const resumo = await calcularResumoTurno(
				caixaAberto,
				empresa.id,
				numeropdv,
			);

			const saldoInformadoNum = parseValor(saldoinformado);
			const diferenca = saldoInformadoNum - resumo.saldoapurado;
			const sobra = Math.max(0, diferenca);
			const falta = Math.max(0, -diferenca);

			return fechamentoCaixaService.atualizar(caixaAberto.id, {
				status: STATUS_CAIXA.FECHADO,
				saldoapurado: resumo.saldoapurado.toFixed(2),
				saldoinformado: saldoInformadoNum.toFixed(2),
				saldoconferido: saldoInformadoNum.toFixed(2),
				sobra: sobra.toFixed(2),
				falta: falta.toFixed(2),
				idusuariofechamento: user.id,
				observacao: observacao ?? null,
				datahora: new Date().toISOString(),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["caixa-pdv-aberto"] });
			queryClient.invalidateQueries({ queryKey: ["fechamentos-caixa"] });
			toast.success("Caixa fechado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao fechar caixa");
		},
	});

	const buscarResumoTurno = useCallback(async () => {
		if (!empresa?.id || !caixaAberto) return null;
		return calcularResumoTurno(caixaAberto, empresa.id, numeropdv);
	}, [caixaAberto, empresa?.id, numeropdv]);

	const value = useMemo<CaixaPdvContextValue>(
		() => ({
			caixaAberto: caixaAberto ?? null,
			estaAberto: !!caixaAberto,
			isLoading,
			numeropdv,
			abrirCaixa: async (suprimentoinicial) => {
				await abrirMutation.mutateAsync(suprimentoinicial);
			},
			fecharCaixa: async (params) => {
				await fecharMutation.mutateAsync(params);
			},
			buscarResumoTurno,
			isAbrindo: abrirMutation.isPending,
			isFechando: fecharMutation.isPending,
		}),
		[
			caixaAberto,
			isLoading,
			numeropdv,
			abrirMutation,
			fecharMutation,
			buscarResumoTurno,
		],
	);

	return (
		<CaixaPdvContext.Provider value={value}>{children}</CaixaPdvContext.Provider>
	);
}

export function useCaixaPdv() {
	const ctx = useContext(CaixaPdvContext);
	if (!ctx) {
		throw new Error("useCaixaPdv deve ser usado dentro de CaixaPdvProvider");
	}
	return ctx;
}

export { calcularResumoTurno };
