"use client";

import {
	IconChartBar,
	IconCopy,
	IconPencil,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatarQuantidade,
	labelProdutoCotacao,
	STATUS_COTACAO_COMPRA,
} from "@/constants/compras-constants";
import { cotacoesCompraService } from "@/services/cotacoes-compra.service";

export default function DetalheCotacaoPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();
	const id = params.id;

	const { data, isLoading } = useQuery({
		queryKey: ["cotacao-compra", id],
		queryFn: () => cotacoesCompraService.buscar(id),
	});

	const { mutate: abrir, isPending: abrindo } = useMutation({
		mutationFn: () => cotacoesCompraService.abrir(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cotacao-compra", id] });
			queryClient.invalidateQueries({ queryKey: ["cotacoes-compra"] });
			toast.success("Cotação aberta para os fornecedores");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	if (!data) {
		return (
			<PageContainer>
				<p className="p-8 text-center text-muted-foreground">
					Cotação não encontrada.
				</p>
			</PageContainer>
		);
	}

	const status = STATUS_COTACAO_COMPRA[data.status];
	const linkPublico = data.tokenpublico
		? `${typeof window !== "undefined" ? window.location.origin : ""}/cotacao-compra/${data.tokenpublico}`
		: "";

	async function copiarLink() {
		if (!linkPublico) return;
		await navigator.clipboard.writeText(linkPublico);
		toast.success("Link copiado");
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<div>
						<h1 className="text-2xl font-bold">
							Cotação #{data.codigo} — {data.titulo}
						</h1>
						<div className="mt-2 flex items-center gap-2">
							<Badge variant={status?.variant ?? "outline"}>
								{status?.label ?? data.status}
							</Badge>
							{data.validade && (
								<span className="text-sm text-muted-foreground">
									Validade: {data.validade}
								</span>
							)}
							<span className="text-sm text-muted-foreground">
								{data.totalpropostas} proposta(s)
							</span>
						</div>
					</div>
					<div className="flex gap-2">
						{data.status === "R" && (
							<>
								<Button
									variant="outline"
									onClick={() =>
										router.push(`/compras/cotacoes/${data.id}/editar`)
									}
								>
									<IconPencil className="size-4" />
									Editar
								</Button>
								<Button onClick={() => abrir()} disabled={abrindo}>
									<IconPlayerPlay className="size-4" />
									Abrir para fornecedores
								</Button>
							</>
						)}
						{(data.status === "A" || data.status === "E") && (
							<Button
								variant="outline"
								onClick={() =>
									router.push(`/compras/cotacoes/${data.id}/comparativo`)
								}
							>
								<IconChartBar className="size-4" />
								Comparativo
							</Button>
						)}
					</div>
				</div>

				{data.status === "A" && linkPublico && (
					<div className="mx-4 rounded-lg border bg-card p-4">
						<p className="mb-2 text-sm font-medium">
							Link para os fornecedores
						</p>
						<div className="flex gap-2">
							<Input readOnly value={linkPublico} />
							<Button type="button" variant="outline" onClick={copiarLink}>
								<IconCopy className="size-4" />
								Copiar
							</Button>
						</div>
					</div>
				)}

				{data.observacao && (
					<p className="px-4 text-sm text-muted-foreground">{data.observacao}</p>
				)}

				<div className="mx-4 rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Produto</TableHead>
								<TableHead>Qtd</TableHead>
								<TableHead>UM</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(data.itens ?? []).map((item) => (
								<TableRow key={item.id}>
									<TableCell>{labelProdutoCotacao(item)}</TableCell>
									<TableCell>{formatarQuantidade(item.quantidade)}</TableCell>
									<TableCell>{item.unidademedida ?? "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
