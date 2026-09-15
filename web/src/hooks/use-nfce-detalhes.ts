"use client";

import { useQuery } from "@tanstack/react-query";
import { nfceService } from "@/services/nfce.service";

export function useNfceDetalhes(params: {
	idempresa: string;
	idnotafiscal: string | null;
	enabled?: boolean;
}) {
	const enabled =
		(params.enabled ?? true) && !!params.idempresa && !!params.idnotafiscal;

	return useQuery({
		queryKey: ["nfce-detalhes", params.idempresa, params.idnotafiscal],
		queryFn: () =>
			nfceService.buscarDetalhes({
				idempresa: params.idempresa,
				idnotafiscal: params.idnotafiscal as string,
			}),
		enabled,
	});
}

export function useInterpretarRejeicaoNfce(params: {
	idempresa: string;
	idnotafiscal: string | null;
	enabled?: boolean;
}) {
	const enabled =
		(params.enabled ?? true) && !!params.idempresa && !!params.idnotafiscal;

	return useQuery({
		queryKey: [
			"nfce-interpretar-rejeicao",
			params.idempresa,
			params.idnotafiscal,
		],
		queryFn: () =>
			nfceService.interpretarRejeicao({
				idempresa: params.idempresa,
				idnotafiscal: params.idnotafiscal as string,
			}),
		enabled,
		staleTime: 1000 * 60 * 5,
		retry: false,
	});
}
