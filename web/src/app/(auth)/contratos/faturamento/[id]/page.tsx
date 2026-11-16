"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { contratoService } from "@/services/contrato.service";

export default function DetalheLoteFaturamentoPage() {
	const params = useParams<{ id: string }>();
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["contrato-lote", params.id, empresa?.id],
		enabled: Boolean(params.id && empresa?.id),
		queryFn: () => contratoService.buscarLote(params.id, empresa!.id),
		refetchInterval: 10_000,
	});

	const retomar = useMutation({
		mutationFn: (idcobranca: string) =>
			contratoService.retomarCobranca(idcobranca, empresa!.id),
		onSuccess: () => {
			toast.success("Cobrança retomada");
			queryClient.invalidateQueries({
				queryKey: ["contrato-lote", params.id],
			});
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao retomar"),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4">
				<div>
					<h1 className="text-2xl font-bold">Lote de faturamento</h1>
					{data?.lote && (
						<p className="text-muted-foreground">
							Competência {data.lote.competencia} — {data.lote.status}
						</p>
					)}
				</div>
				<Button asChild variant="outline">
					<Link href="/contratos/faturamento">Voltar</Link>
				</Button>
			</div>

			<div className="px-4 pb-4">
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Contrato</TableHead>
								<TableHead>Fluxo</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Etapa</TableHead>
								<TableHead>Documentos</TableHead>
								<TableHead>Erro</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={7}>Carregando...</TableCell>
								</TableRow>
							)}
							{(data?.cobrancas ?? []).map((c) => (
								<TableRow key={c.id}>
									<TableCell className="font-mono text-xs">
										{c.idcontrato.slice(0, 8)}
									</TableCell>
									<TableCell>{c.fluxofaturamento}</TableCell>
									<TableCell>{c.statusfaturamento}</TableCell>
									<TableCell>{c.etapaatual || "-"}</TableCell>
									<TableCell className="text-xs space-y-1">
										{c.idnotafiscal && <div>NFS-e: {c.idnotafiscal.slice(0, 8)}</div>}
										{c.idfinanceiro && <div>Título: {c.idfinanceiro.slice(0, 8)}</div>}
										{c.idremessaitem && <div>Remessa item: {c.idremessaitem.slice(0, 8)}</div>}
									</TableCell>
									<TableCell className="max-w-[220px] truncate text-xs">
										{c.ultimoerro || "-"}
									</TableCell>
									<TableCell>
										{(c.statusfaturamento === "erro" ||
											c.statusfaturamento === "aguardando_autorizacao_nfse") && (
											<Button
												size="sm"
												variant="outline"
												disabled={retomar.isPending}
												onClick={() => retomar.mutate(c.id)}
											>
												Retomar
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
