"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { saldoEstoqueService } from "@/services/saldo-estoque.service";

/**
 * Busca todos os saldos de estoque da empresa e retorna um mapa
 * { codigoProduto → quantidade } para uso no PDV.
 *
 * O `codigoproduto` no saldoestoque corresponde ao campo `codigo` (numérico)
 * dos produtos. A chave do mapa é sempre uma string.
 *
 * Produtos sem registro em saldoestoque não aparecem no mapa —
 * nesses casos a venda é permitida (produto sem controle de estoque).
 */
export function useSaldosEstoque(idempresa: string | undefined) {
	const { data, isLoading } = useQuery({
		queryKey: ["saldos-estoque", idempresa],
		queryFn: async () => {
			const resp = await saldoEstoqueService.listar({
				idempresa: idempresa!,
				limit: 500,
			});
			return resp.data;
		},
		enabled: !!idempresa,
		staleTime: 30_000,
	});

	const saldoPorCodigo = useMemo(() => {
		const map: Record<string, number> = {};
		for (const saldo of data ?? []) {
			if (saldo.codigoproduto) {
				map[saldo.codigoproduto] = Number.parseFloat(
					saldo.quantidade ?? "0",
				);
			}
		}
		return map;
	}, [data]);

	return { saldoPorCodigo, isLoadingSaldos: isLoading };
}
