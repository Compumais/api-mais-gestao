import { useMutation } from "@tanstack/react-query";
import {
	entidadesService,
	type ConsultaCnpjEntidadeResposta,
} from "@/services/entidades.service";

type ConsultarCnpjParametros = {
	cnpj: string;
	idempresa?: string;
};

function extrairDigitosCnpj(cnpj: string): string {
	return cnpj.replace(/\D/g, "");
}

export function useConsultaCnpjEntidade() {
	const mutation = useMutation({
		mutationFn: async ({
			cnpj,
			idempresa,
		}: ConsultarCnpjParametros): Promise<ConsultaCnpjEntidadeResposta> => {
			const cnpjLimpo = extrairDigitosCnpj(cnpj);

			if (cnpjLimpo.length !== 14) {
				throw new Error("Informe um CNPJ válido com 14 dígitos");
			}

			return entidadesService.consultarCnpj(cnpjLimpo, idempresa);
		},
	});

	return {
		consultar: mutation.mutateAsync,
		isPending: mutation.isPending,
		data: mutation.data ?? null,
		reset: mutation.reset,
	};
}
