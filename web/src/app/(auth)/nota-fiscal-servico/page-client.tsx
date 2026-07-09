"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NFE_STATUS_LABELS } from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { maskCpfCnpj } from "@/lib/masks";
import { listarNfsesEmitidas } from "@/services/nfse-emissao.service";
import { PageContainer } from "../components/page-container";
import { AvisoAmbienteNfse } from "./components/aviso-ambiente-nfse";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(parseFloat(value));
};

const formatDateTime = (date: string | null | undefined) => {
	if (!date) return "-";
	return new Date(date).toLocaleString("pt-BR");
};

export default function NotaFiscalServicoPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data, isLoading } = useQuery({
		queryKey: ["nfse-emissao", empresa?.id],
		queryFn: () =>
			listarNfsesEmitidas({ idempresa: empresa!.id, page: 1, limit: 50 }),
		enabled: !!empresa?.id,
	});

	if (!empresa) {
		return (
			<PageContainer>
				<p className="text-muted-foreground px-4">
					Selecione uma empresa para visualizar as NFS-e
				</p>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-3 px-4">
					<div>
						<h1 className="text-2xl font-bold">Nota fiscal de serviço</h1>
						<p className="text-muted-foreground text-sm">
							Emissão manual de NFS-e (RPS)
						</p>
					</div>
					<div className="flex items-center gap-2">
						<AvisoAmbienteNfse ambiente={2} />
						<Button asChild>
							<Link href="/nota-fiscal-servico/nova">
								<Plus className="h-4 w-4 mr-2" aria-hidden="true" />
								Nova NFS-e
							</Link>
						</Button>
					</div>
				</div>

				<div className="px-4">
					{isLoading ? (
						<p className="text-muted-foreground">Carregando...</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>RPS</TableHead>
									<TableHead>NFS-e</TableHead>
									<TableHead>Tomador</TableHead>
									<TableHead>Data</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(data?.data ?? []).length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="text-center text-muted-foreground"
										>
											Nenhuma NFS-e emitida
										</TableCell>
									</TableRow>
								) : (
									data?.data.map((nota) => (
										<TableRow key={nota.id}>
											<TableCell>
												<Link
													href={`/nota-fiscal-servico/${nota.id}`}
													className="font-medium hover:underline"
												>
													{nota.serie}-{nota.numeronotafiscal}
												</Link>
											</TableCell>
											<TableCell>{nota.numeronfse ?? "—"}</TableCell>
											<TableCell className="max-w-[240px]">
												<div className="truncate font-medium">
													{nota.razaosocial ?? "—"}
												</div>
												{nota.cnpjcpf ? (
													<div className="truncate text-xs text-muted-foreground font-mono">
														{maskCpfCnpj(nota.cnpjcpf)}
													</div>
												) : null}
											</TableCell>
											<TableCell>
												{formatDateTime(nota.emissao ?? nota.datahoraemissao)}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(nota.valortotalnota)}
											</TableCell>
											<TableCell>
												{NFE_STATUS_LABELS[nota.status ?? 90] ?? nota.status}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
