"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NFE_STATUS, NFE_STATUS_LABELS } from "@/constants/nfe-status";
import {
	buscarNfsePorId,
	cancelarNfse,
	consultarNfsePorRps,
} from "@/services/nfse-emissao.service";
import { PageContainer } from "../../components/page-container";
import { AvisoAmbienteNfse } from "../components/aviso-ambiente-nfse";
import { CardErroNfse } from "../components/card-erro-nfse";
import { ResumoTomadorNfse } from "../components/resumo-tomador-nfse";

export default function DetalheNfsePage() {
	const params = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const [motivoCancelamento, setMotivoCancelamento] = useState("");
	const [erroOperacao, setErroOperacao] = useState<{
		titulo: string;
		motivo: string;
	} | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["nfse-detalhe", params.id],
		queryFn: () => buscarNfsePorId(params.id),
	});

	const cancelarMutation = useMutation({
		mutationFn: () => cancelarNfse(params.id, motivoCancelamento),
		onSuccess: () => {
			toast.success("NFS-e cancelada");
			queryClient.invalidateQueries({ queryKey: ["nfse-detalhe", params.id] });
		},
		onError: (error: Error) => {
			setErroOperacao({ titulo: "Erro ao cancelar", motivo: error.message });
			toast.error(error.message);
		},
	});

	const consultarMutation = useMutation({
		mutationFn: () => consultarNfsePorRps(params.id),
		onSuccess: () => {
			toast.success("Consulta RPS realizada");
			queryClient.invalidateQueries({ queryKey: ["nfse-detalhe", params.id] });
		},
		onError: (error: Error) => {
			setErroOperacao({ titulo: "Erro na consulta", motivo: error.message });
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<PageContainer>
				<p className="px-4 text-muted-foreground">Carregando...</p>
			</PageContainer>
		);
	}

	if (!data) {
		return (
			<PageContainer>
				<p className="px-4 text-muted-foreground">NFS-e não encontrada</p>
			</PageContainer>
		);
	}

	const nota = data.notaFiscal;
	const autorizada = nota.status === NFE_STATUS.AUTORIZADA;
	const cancelada = nota.status === NFE_STATUS.CANCELADA;

	return (
		<PageContainer>
			<main className="flex flex-col gap-6 py-4 px-4 max-w-3xl">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold">
							NFS-e {nota.numeronfse ?? "—"}
						</h1>
						<p className="text-muted-foreground text-sm">
							RPS {nota.serie}-{nota.numeronotafiscal} ·{" "}
							{NFE_STATUS_LABELS[nota.status ?? 90]}
						</p>
					</div>
					<AvisoAmbienteNfse ambiente={nota.tipoambientenfe} />
				</header>

				{erroOperacao ? (
					<CardErroNfse
						titulo={erroOperacao.titulo}
						motivo={erroOperacao.motivo}
					/>
				) : null}

				{nota.mensagemtransmissaonfe && !autorizada ? (
					<CardErroNfse
						titulo="NFS-e rejeitada"
						motivo={nota.mensagemtransmissaonfe}
					/>
				) : null}

				<ResumoTomadorNfse nota={nota} />

				<section className="space-y-2 text-sm">
					<p>
						<span className="text-muted-foreground">Total:</span> R${" "}
						{parseFloat(nota.valortotalnota ?? "0").toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</p>
					{nota.codigoautenticidadenfse ? (
						<p>
							<span className="text-muted-foreground">Verificação:</span>{" "}
							{nota.codigoautenticidadenfse}
						</p>
					) : null}
					{nota.linknfse ? (
						<p>
							<a
								href={nota.linknfse}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline"
							>
								Abrir NFS-e no portal
							</a>
						</p>
					) : null}
				</section>

				<section>
					<h2 className="font-semibold mb-2">Itens</h2>
					<ul className="space-y-1 text-sm">
						{data.itens.map((item) => (
							<li key={item.id}>
								{item.descricao} — {item.quantidade} × R${" "}
								{parseFloat(item.precounitario).toFixed(2)}
							</li>
						))}
					</ul>
				</section>

				<div className="flex flex-wrap gap-2">
					<Button variant="outline" asChild>
						<Link href="/nota-fiscal-servico">Voltar</Link>
					</Button>
					{!autorizada && !cancelada ? (
						<Button
							variant="secondary"
							onClick={() => consultarMutation.mutate()}
							disabled={consultarMutation.isPending}
						>
							Consultar RPS
						</Button>
					) : null}
					{autorizada ? (
						<div className="flex flex-col gap-2 w-full sm:w-auto">
							<Input
								placeholder="Motivo cancelamento (mín. 15 caracteres)"
								value={motivoCancelamento}
								onChange={(e) => setMotivoCancelamento(e.target.value)}
							/>
							<Button
								variant="destructive"
								onClick={() => cancelarMutation.mutate()}
								disabled={
									cancelarMutation.isPending || motivoCancelamento.length < 15
								}
							>
								Cancelar NFS-e
							</Button>
						</div>
					) : null}
				</div>
			</main>
		</PageContainer>
	);
}
