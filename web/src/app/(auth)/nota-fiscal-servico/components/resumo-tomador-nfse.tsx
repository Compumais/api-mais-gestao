"use client";

import { useQuery } from "@tanstack/react-query";
import { ResumoDestinatarioNfe } from "@/app/(auth)/nota-fiscal-venda/components/resumo-destinatario-nfe";
import { maskCpfCnpj } from "@/lib/masks";
import { entidadesService } from "@/services/entidades.service";
import type { NotaFiscalServico } from "@/services/nfse-emissao.service";

type ResumoTomadorNfseProps = {
	nota: NotaFiscalServico;
};

export function ResumoTomadorNfse({ nota }: ResumoTomadorNfseProps) {
	const { data: entidade, isLoading } = useQuery({
		queryKey: ["entidade-tomador-nfse", nota.identidade],
		queryFn: () => entidadesService.buscar(nota.identidade!),
		enabled: !!nota.identidade,
	});

	if (isLoading) {
		return <p className="text-sm text-muted-foreground">Carregando tomador...</p>;
	}

	if (entidade) {
		return (
			<section className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
				<h2 className="font-semibold text-sm">Tomador do serviço</h2>
				<ResumoDestinatarioNfe dados={entidade} variant="compact" />
			</section>
		);
	}

	return (
		<section className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1 text-sm">
			<h2 className="font-semibold">Tomador do serviço</h2>
			<p>
				<span className="text-muted-foreground">Nome / Razão social:</span>{" "}
				{nota.razaosocial ?? "—"}
			</p>
			{nota.cnpjcpf ? (
				<p>
					<span className="text-muted-foreground">CPF/CNPJ:</span>{" "}
					<span className="font-mono">{maskCpfCnpj(nota.cnpjcpf)}</span>
				</p>
			) : null}
		</section>
	);
}
