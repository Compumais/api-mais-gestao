"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import {
	formatarDataBr,
	formatarMoeda,
	ROTULO_PERIODO_LOCACAO,
} from "@/lib/locacao-calculo";
import { locacaoService } from "@/services/locacao.service";
import { FecharLocacaoDialog } from "../components/fechar-locacao-dialog";

const SITUACAO: Record<string, string> = {
	aberta: "Aberta",
	fechada: "Fechada",
	cancelada: "Cancelada",
};

export default function LocacaoDetalhePage() {
	const params = useParams<{ id: string }>();
	const { empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [fecharAberto, setFecharAberto] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: ["locacao", params.id, empresa?.id],
		enabled: Boolean(params.id && empresa?.id),
		queryFn: () => locacaoService.buscar(params.id, empresa!.id),
	});

	const cancelar = useMutation({
		mutationFn: () => locacaoService.cancelar(params.id, empresa!.id),
		onSuccess: () => {
			toast.success("Locação cancelada");
			queryClient.invalidateQueries({ queryKey: ["locacao", params.id] });
			queryClient.invalidateQueries({ queryKey: ["locacoes"] });
			queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
		},
		onError: (erro: Error) => toast.error(erro.message || "Falha ao cancelar"),
	});

	const endereco = [
		data?.endereco,
		data?.numeroendereco,
		data?.complemento,
		data?.bairro,
		data?.cep,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold">Locação {data?.codigo ?? ""}</h1>
					{data && (
						<p className="text-sm text-muted-foreground">
							{data.nomecliente} · {SITUACAO[data.situacao] ?? data.situacao}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => router.push("/locacoes")}>
						Voltar
					</Button>
					{data?.situacao === "aberta" && (
						<>
							<Button asChild variant="outline">
								<Link href={`/locacoes/${data.id}/editar`}>Editar</Link>
							</Button>
							<Button
								variant="outline"
								disabled={cancelar.isPending}
								onClick={() => cancelar.mutate()}
							>
								Cancelar locação
							</Button>
							<Button onClick={() => setFecharAberto(true)}>
								Fechar contrato
							</Button>
						</>
					)}
				</div>
			</div>
			<div className="px-4 pb-4 grid gap-4">
				{isLoading && <p>Carregando...</p>}
				{data && (
					<>
						<div className="rounded-lg border bg-card p-4 text-sm grid gap-1">
							<p>Início: {formatarDataBr(data.datainicio)}</p>
							<p>Endereço de alocação: {endereco || "Não informado"}</p>
							{data.datadevolucao && (
								<p>Devolução: {formatarDataBr(data.datadevolucao)}</p>
							)}
							{data.formapagamento && (
								<p>
									Pagamento:{" "}
									{data.formapagamento === "avista"
										? "À vista"
										: `A prazo, vencimento ${formatarDataBr(data.vencimento)}`}
								</p>
							)}
							<p>
								Período {formatarMoeda(data.valorperiodo)} + diárias{" "}
								{formatarMoeda(data.valormora)} ={" "}
								<strong>{formatarMoeda(data.valortotal)}</strong>
							</p>
						</div>
						<div className="rounded-lg border bg-card">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Equipamento</TableHead>
										<TableHead>Período</TableHead>
										<TableHead>Qtd.</TableHead>
										<TableHead>Prevista</TableHead>
										<TableHead>Atraso</TableHead>
										<TableHead>Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.itens?.map((item) => (
										<TableRow key={item.id}>
											<TableCell>
												{item.codigoequipamento} - {item.descricaoequipamento}
											</TableCell>
											<TableCell>
												{ROTULO_PERIODO_LOCACAO[item.periodo]}
											</TableCell>
											<TableCell>{item.quantidade}</TableCell>
											<TableCell>{formatarDataBr(item.dataprevista)}</TableCell>
											<TableCell>{item.diasatraso}</TableCell>
											<TableCell>{formatarMoeda(item.valortotal)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</>
				)}
			</div>
			{data?.situacao === "aberta" && (
				<FecharLocacaoDialog
					locacaoId={data.id}
					aberto={fecharAberto}
					onFechar={() => setFecharAberto(false)}
					onConcluido={() => {
						toast.success("Locação fechada");
						setFecharAberto(false);
						queryClient.invalidateQueries({ queryKey: ["locacao", params.id] });
						queryClient.invalidateQueries({ queryKey: ["locacoes"] });
						queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
						queryClient.invalidateQueries({ queryKey: ["financeiro"] });
					}}
				/>
			)}
		</PageContainer>
	);
}
