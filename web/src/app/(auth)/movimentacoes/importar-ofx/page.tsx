"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import { planoContasService } from "@/services/plano-contas.service";
import type { LinhaImportacaoOfx } from "@/util/ofx-importacao";
import { FormImportarOfx } from "../components/form-importar-ofx";
import { TabelaImportacaoOfx } from "../components/tabela-importacao-ofx";

export default function ImportarOfxPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [idcontacorrente, setIdContaCorrente] = useState(
		searchParams.get("idcontacorrente") ?? "",
	);
	const [linhas, setLinhas] = useState<LinhaImportacaoOfx[]>([]);

	useEffect(() => {
		const idDaUrl = searchParams.get("idcontacorrente");
		if (idDaUrl) {
			setIdContaCorrente(idDaUrl);
		}
	}, [searchParams]);

	const { data: contasCorrentesData } = useQuery({
		queryKey: ["contas-correntes", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return contasCorrentesService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { data: planosEntradaData } = useQuery({
		queryKey: ["plano-contas", empresa?.id, "E"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				limit: 100,
				listarTudo: true,
				tipomovimento: "E",
			});
		},
		enabled: !!empresa,
	});

	const { data: planosSaidaData } = useQuery({
		queryKey: ["plano-contas", empresa?.id, "S"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				limit: 100,
				listarTudo: true,
				tipomovimento: "S",
			});
		},
		enabled: !!empresa,
	});

	const contasCorrentes = contasCorrentesData?.data ?? [];
	const voltarUrl = idcontacorrente
		? `/movimentacoes?idcontacorrente=${idcontacorrente}`
		: "/movimentacoes";

	const handleContaChange = (id: string) => {
		setIdContaCorrente(id);
		setLinhas([]);
		const params = new URLSearchParams(searchParams.toString());
		params.set("idcontacorrente", id);
		router.replace(`/movimentacoes/importar-ofx?${params.toString()}`);
	};

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8 px-4">
					<p className="text-muted-foreground">
						Selecione uma empresa para importar o extrato OFX.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href={voltarUrl} aria-label="Voltar para movimentações">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<h1 className="text-2xl font-bold">Importar OFX</h1>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4">
					<FormImportarOfx
						idcontacorrente={idcontacorrente}
						onIdContaCorrenteChange={handleContaChange}
						contasCorrentes={contasCorrentes}
						onPreview={setLinhas}
					/>
				</div>

				{linhas.length > 0 && (
					<div className="px-4">
						<TabelaImportacaoOfx
							idcontacorrente={idcontacorrente}
							linhas={linhas}
							onLinhasChange={setLinhas}
							planosEntrada={planosEntradaData?.data ?? []}
							planosSaida={planosSaidaData?.data ?? []}
						/>
					</div>
				)}
			</div>
		</PageContainer>
	);
}
