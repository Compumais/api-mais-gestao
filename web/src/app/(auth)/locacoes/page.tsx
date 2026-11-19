"use client";

import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
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
import { useEmpresa } from "@/hooks/use-empresa";
import { formatarDataBr, formatarMoeda } from "@/lib/locacao-calculo";
import { locacaoService } from "@/services/locacao.service";

const SITUACAO: Record<string, string> = {
	aberta: "Aberta",
	fechada: "Fechada",
	cancelada: "Cancelada",
};

export default function LocacoesPage() {
	const { empresa } = useEmpresa();
	const [codigo, setCodigo] = useState("");
	const { data, isLoading } = useQuery({
		queryKey: ["locacoes", empresa?.id, codigo],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			locacaoService.listar({
				idempresa: empresa!.id,
				codigo: codigo || undefined,
				limit: 50,
			}),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Locações</h1>
				<Button asChild>
					<Link href="/locacoes/novo">
						<IconPlus className="mr-2 size-4" />
						Nova
					</Link>
				</Button>
			</div>
			<div className="px-4 pb-4">
				<Input
					placeholder="Filtrar por código"
					value={codigo}
					onChange={(evento) => setCodigo(evento.target.value)}
					className="max-w-sm mb-4"
				/>
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Cliente</TableHead>
								<TableHead>Início</TableHead>
								<TableHead>Situação</TableHead>
								<TableHead>Total</TableHead>
								<TableHead className="w-[80px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={6}>Carregando...</TableCell>
								</TableRow>
							)}
							{data?.data.map((item) => (
								<TableRow key={item.id}>
									<TableCell>{item.codigo}</TableCell>
									<TableCell>{item.nomecliente}</TableCell>
									<TableCell>{formatarDataBr(item.datainicio)}</TableCell>
									<TableCell>
										{SITUACAO[item.situacao] ?? item.situacao}
									</TableCell>
									<TableCell>{formatarMoeda(item.valortotal)}</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button asChild size="sm" variant="outline">
												<Link href={`/locacoes/${item.id}`}>Abrir</Link>
											</Button>
											{item.situacao === "aberta" && (
												<Button asChild size="icon" variant="ghost">
													<Link href={`/locacoes/${item.id}/editar`}>
														<IconPencil className="size-4" />
													</Link>
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
							{!isLoading && data?.data.length === 0 && (
								<TableRow>
									<TableCell colSpan={6}>Nenhuma locação encontrada.</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
