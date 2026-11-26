"use client";

import { IconFileUpload } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { formatCurrency } from "@/app/(auth)/components/financeiro-lista-colunas";
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
import { conciliacaoCieloService } from "@/services/conciliacao-cielo.service";

function formatarData(valor: string | null | undefined) {
	if (!valor) return "-";
	const data = valor.slice(0, 10);
	const [ano, mes, dia] = data.split("-");
	if (!ano || !mes || !dia) return valor;
	return `${dia}/${mes}/${ano}`;
}

export default function ConciliacaoCieloPage() {
	const { empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
	const [conteudo, setConteudo] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["conciliacoes-cielo", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			conciliacaoCieloService.listar({
				idempresa: empresa!.id,
				limit: 50,
			}),
	});

	const importar = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Selecione uma empresa");
			if (!conteudo || !nomeArquivo) {
				throw new Error("Selecione o CSV de recebíveis da Cielo");
			}
			return conciliacaoCieloService.importar({
				idempresa: empresa.id,
				nomearquivo: nomeArquivo,
				conteudo,
			});
		},
		onSuccess: (resultado) => {
			queryClient.invalidateQueries({ queryKey: ["conciliacoes-cielo"] });
			toast.success(
				resultado.jaExistia
					? "Arquivo já importado — abrindo conciliação"
					: `${resultado.itens.length} lançamentos importados`,
			);
			router.push(`/conciliacao/cielo/${resultado.conciliacao.id}`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao importar CSV Cielo");
		},
	});

	async function handleArquivo(event: React.ChangeEvent<HTMLInputElement>) {
		const arquivo = event.target.files?.[0];
		if (!arquivo) return;
		if (!arquivo.name.toLowerCase().endsWith(".csv")) {
			toast.error("Selecione um arquivo .csv");
			return;
		}
		const buffer = await arquivo.arrayBuffer();
		const utf8 = new TextDecoder("utf-8").decode(buffer);
		const texto = utf8.includes("Data de pagamento;Data do")
			? utf8
			: new TextDecoder("windows-1252").decode(buffer);
		setConteudo(texto);
		setNomeArquivo(arquivo.name);
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8 px-4">
					<p className="text-muted-foreground">
						Selecione uma empresa para conciliar recebíveis Cielo.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<div>
						<h1 className="text-2xl font-bold">Conciliação Cielo</h1>
						<p className="text-sm text-muted-foreground">
							Importe o CSV de Recebíveis Detalhado e associe aos títulos a
							receber.
						</p>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4">
					<h2 className="text-lg font-semibold mb-2">Importar CSV</h2>
					<p className="text-sm text-muted-foreground mb-4">
						Use o relatório Cielo &quot;Recebíveis Detalhado - Lançamentos&quot;
						(separador ;).
					</p>
					<input
						ref={inputRef}
						type="file"
						accept=".csv,text/csv"
						className="hidden"
						onChange={handleArquivo}
					/>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => inputRef.current?.click()}
						>
							<IconFileUpload className="size-4" />
							Selecionar CSV
						</Button>
						{nomeArquivo && (
							<span className="text-sm text-muted-foreground">{nomeArquivo}</span>
						)}
						<Button
							type="button"
							disabled={!conteudo || importar.isPending}
							onClick={() => importar.mutate()}
						>
							{importar.isPending ? "Importando..." : "Importar e conciliar"}
						</Button>
					</div>
				</div>

				<div className="px-4">
					<div className="rounded-lg border bg-card">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Arquivo</TableHead>
									<TableHead>Período</TableHead>
									<TableHead>Lançamentos</TableHead>
									<TableHead>Líquido</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Importado em</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={7}>Carregando...</TableCell>
									</TableRow>
								)}
								{!isLoading && (data?.data ?? []).length === 0 && (
									<TableRow>
										<TableCell colSpan={7} className="text-muted-foreground">
											Nenhuma conciliação Cielo importada ainda.
										</TableCell>
									</TableRow>
								)}
								{(data?.data ?? []).map((item) => (
									<TableRow key={item.id}>
										<TableCell className="max-w-[220px] truncate">
											{item.nomearquivo}
										</TableCell>
										<TableCell>
											{formatarData(item.periodoinicio)} —{" "}
											{formatarData(item.periodofim)}
										</TableCell>
										<TableCell>{item.qtdlancamentos}</TableCell>
										<TableCell>{formatCurrency(item.valorliquido)}</TableCell>
										<TableCell>{item.status}</TableCell>
										<TableCell>
											{new Date(item.criadoem).toLocaleString("pt-BR")}
										</TableCell>
										<TableCell>
											<Button size="sm" variant="outline" asChild>
												<Link href={`/conciliacao/cielo/${item.id}`}>Abrir</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		</PageContainer>
	);
}
