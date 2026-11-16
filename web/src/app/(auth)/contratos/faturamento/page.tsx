"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function competenciaAtual() {
	const agora = new Date();
	return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export default function FaturamentoContratosPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [competencia, setCompetencia] = useState(competenciaAtual());
	const [selecionados, setSelecionados] = useState<string[]>([]);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["contratos-elegiveis", empresa?.id, competencia],
		enabled: Boolean(empresa?.id && competencia),
		queryFn: () =>
			contratoService.listarElegiveis({
				idempresa: empresa!.id,
				competencia,
			}),
	});

	const { data: lotes } = useQuery({
		queryKey: ["contratos-lotes", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			contratoService.listarLotes({ idempresa: empresa!.id, limit: 10 }),
	});

	const itens = data?.itens ?? [];
	const elegiveis = useMemo(
		() => itens.filter((i) => i.elegivel).map((i) => i.contrato.id),
		[itens],
	);

	const confirmar = useMutation({
		mutationFn: () =>
			contratoService.confirmarLote({
				idempresa: empresa!.id,
				competencia,
				idsContratos: selecionados,
			}),
		onSuccess: (resultado) => {
			toast.success(`Lote ${resultado.lote.status} processado`);
			setSelecionados([]);
			queryClient.invalidateQueries({ queryKey: ["contratos-elegiveis"] });
			queryClient.invalidateQueries({ queryKey: ["contratos-lotes"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha no faturamento"),
	});

	function toggle(id: string, checked: boolean) {
		setSelecionados((prev) =>
			checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
		);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Faturamento de contratos</h1>
				<Button asChild variant="outline">
					<Link href="/contratos">Voltar</Link>
				</Button>
			</div>

			<div className="px-4 pb-4 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="space-y-2">
						<Label>Competência</Label>
						<Input
							type="month"
							value={competencia}
							onChange={(e) => setCompetencia(e.target.value)}
						/>
					</div>
					<Button type="button" variant="outline" onClick={() => refetch()}>
						Atualizar prévia
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={() => setSelecionados(elegiveis)}
					>
						Selecionar elegíveis
					</Button>
					<Button
						disabled={selecionados.length === 0 || confirmar.isPending}
						onClick={() => confirmar.mutate()}
					>
						{confirmar.isPending
							? "Processando..."
							: `Confirmar lote (${selecionados.length})`}
					</Button>
				</div>

				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10" />
								<TableHead>Contrato</TableHead>
								<TableHead>Fluxo</TableHead>
								<TableHead>Valor</TableHead>
								<TableHead>Vencimento</TableHead>
								<TableHead>Pendências</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={6}>Carregando...</TableCell>
								</TableRow>
							)}
							{itens.map((item) => (
								<TableRow key={item.contrato.id}>
									<TableCell>
										<Checkbox
											checked={selecionados.includes(item.contrato.id)}
											disabled={!item.elegivel}
											onCheckedChange={(v) =>
												toggle(item.contrato.id, Boolean(v))
											}
										/>
									</TableCell>
									<TableCell>{item.contrato.descricao}</TableCell>
									<TableCell>{item.fluxoFaturamento}</TableCell>
									<TableCell>
										{Number(item.valor).toLocaleString("pt-BR", {
											style: "currency",
											currency: "BRL",
										})}
									</TableCell>
									<TableCell>{item.vencimento || "-"}</TableCell>
									<TableCell>
										{item.elegivel
											? "OK"
											: item.pendencias.join(", ") || "Bloqueado"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<div className="rounded-lg border bg-card p-4">
					<h2 className="font-semibold mb-3">Lotes recentes</h2>
					<ul className="space-y-2">
						{(lotes?.data ?? []).map((lote) => (
							<li key={lote.id} className="flex justify-between gap-2">
								<span>
									{lote.competencia} — {lote.status}
								</span>
								<Button asChild size="sm" variant="outline">
									<Link href={`/contratos/faturamento/${lote.id}`}>Abrir</Link>
								</Button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</PageContainer>
	);
}
