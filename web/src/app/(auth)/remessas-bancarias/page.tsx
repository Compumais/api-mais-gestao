"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { api } from "@/lib/axios";
import { remessaBancariaService } from "@/services/remessa-bancaria.service";

export default function RemessasBancariasPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["remessas-bancarias", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			remessaBancariaService.listar({ idempresa: empresa!.id, limit: 50 }),
	});

	const marcarEnviada = useMutation({
		mutationFn: (id: string) =>
			remessaBancariaService.marcarEnviada(id, empresa!.id),
		onSuccess: () => {
			toast.success("Remessa marcada como enviada");
			queryClient.invalidateQueries({ queryKey: ["remessas-bancarias"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
	});

	async function baixar(id: string, nome: string | null) {
		const response = await api.get(
			remessaBancariaService.urlDownload(id, empresa!.id),
			{ responseType: "blob" },
		);
		const blob = new Blob([response.data], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = nome || `remessa_${id}.rem`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Remessas bancárias</h1>
			</div>
			<div className="px-4 pb-4">
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Sequência</TableHead>
								<TableHead>Layout</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Arquivo</TableHead>
								<TableHead>Criada em</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={6}>Carregando...</TableCell>
								</TableRow>
							)}
							{(data?.data ?? []).map((r) => (
								<TableRow key={r.id}>
									<TableCell>{r.sequencia}</TableCell>
									<TableCell>{r.layout}</TableCell>
									<TableCell>{r.status}</TableCell>
									<TableCell>{r.nomearquivo || "-"}</TableCell>
									<TableCell>
										{new Date(r.criadoem).toLocaleString("pt-BR")}
									</TableCell>
									<TableCell className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => baixar(r.id, r.nomearquivo)}
										>
											Baixar CNAB
										</Button>
										{r.status !== "enviada" && (
											<Button
												size="sm"
												onClick={() => marcarEnviada.mutate(r.id)}
											>
												Marcar enviada
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
