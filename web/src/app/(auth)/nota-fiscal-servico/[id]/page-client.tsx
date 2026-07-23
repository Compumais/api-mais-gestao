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
	substituirNfse,
} from "@/services/nfse-emissao.service";
import { PageContainer } from "../../components/page-container";
import { AvisoAmbienteNfse } from "../components/aviso-ambiente-nfse";
import { CardErroNfse } from "../components/card-erro-nfse";
import { ResumoTomadorNfse } from "../components/resumo-tomador-nfse";

function extrairProtocolo(mensagem?: string | null): string | null {
	if (!mensagem) return null;
	const match = mensagem.match(/Protocolo:\s*([^\s.]+)/i);
	return match?.[1]?.trim() || null;
}

function notaEhDps(nota: {
	mensagemtransmissaonfe?: string | null;
	dadosimportacao?: { modo?: string; protocolo?: string | null } | null;
}): boolean {
	if (nota.dadosimportacao?.modo === "dps") return true;
	if (nota.dadosimportacao?.protocolo) return true;
	const msg = nota.mensagemtransmissaonfe ?? "";
	return /dps|protocolo|ambiente nacional/i.test(msg);
}

export default function DetalheNfsePage() {
	const params = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const [motivoCancelamento, setMotivoCancelamento] = useState("");
	const [idNotaSubstituta, setIdNotaSubstituta] = useState("");
	const [motivoSubstituicao, setMotivoSubstituicao] = useState("");
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
		onSuccess: (resultado) => {
			if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Cancelamento recebido. Protocolo: ${resultado.protocolo}`
						: "Cancelamento aguardando validação do ambiente nacional",
				);
			} else {
				toast.success("NFS-e cancelada");
			}
			queryClient.invalidateQueries({ queryKey: ["nfse-detalhe", params.id] });
		},
		onError: (error: Error) => {
			setErroOperacao({ titulo: "Erro ao cancelar", motivo: error.message });
			toast.error(error.message);
		},
	});

	const substituirMutation = useMutation({
		mutationFn: () =>
			substituirNfse(params.id, {
				idnotafiscalsubstituta: idNotaSubstituta,
				motivo: motivoSubstituicao,
			}),
		onSuccess: (resultado) => {
			if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Substituição recebida. Protocolo: ${resultado.protocolo}`
						: "Substituição aguardando validação do ambiente nacional",
				);
			} else {
				toast.success("NFS-e substituída (original cancelada)");
			}
			queryClient.invalidateQueries({ queryKey: ["nfse-detalhe", params.id] });
		},
		onError: (error: Error) => {
			setErroOperacao({ titulo: "Erro ao substituir", motivo: error.message });
			toast.error(error.message);
		},
	});

	const consultarMutation = useMutation({
		mutationFn: () => consultarNfsePorRps(params.id),
		onSuccess: (resultado) => {
			if (resultado.status === NFE_STATUS.CANCELADA) {
				toast.success(
					"Cancelamento/substituição confirmado no ambiente nacional",
				);
			} else if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Aguardando processamento. Protocolo: ${resultado.protocolo}`
						: "Ainda em processamento no ambiente nacional",
				);
			} else {
				toast.success(
					resultado.modo === "dps"
						? "Consulta DPS realizada"
						: "Consulta RPS realizada",
				);
			}
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
	const pendente = nota.status === NFE_STATUS.PENDENTE;
	const modoDps = notaEhDps(nota);
	const protocolo =
		nota.dadosimportacao?.protocolo?.trim() ||
		nota.dadosimportacao?.protocoloCancelamento?.trim() ||
		nota.dadosimportacao?.protocoloSubstituicao?.trim() ||
		extrairProtocolo(nota.mensagemtransmissaonfe);
	const eventoPendente =
		autorizada &&
		Boolean(
			nota.dadosimportacao?.protocoloCancelamento ||
				nota.dadosimportacao?.protocoloSubstituicao,
		);
	const mensagemPendenteDps =
		(pendente || eventoPendente) &&
		modoDps &&
		Boolean(nota.mensagemtransmissaonfe || protocolo);
	const mensagemRejeicao =
		nota.mensagemtransmissaonfe && !autorizada && !mensagemPendenteDps;

	return (
		<PageContainer>
			<main className="flex flex-col gap-6 py-4 px-4 max-w-3xl">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold">
							NFS-e {nota.numeronfse ?? "—"}
						</h1>
						<p className="text-muted-foreground text-sm">
							{modoDps ? "DPS" : "RPS"} {nota.serie}-{nota.numeronotafiscal} ·{" "}
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

				{mensagemPendenteDps ? (
					<div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm space-y-1">
						<p className="font-medium">
							{eventoPendente
								? "Evento DPS recebido — aguardando processamento"
								: "DPS recebida — aguardando processamento"}
						</p>
						{protocolo ? (
							<p>
								<span className="text-muted-foreground">Protocolo:</span>{" "}
								<span className="font-mono">{protocolo}</span>
							</p>
						) : null}
						<p className="text-muted-foreground">
							Use &quot;Consultar status DPS&quot; para atualizar após o
							processamento no ambiente nacional.
						</p>
					</div>
				) : null}

				{mensagemRejeicao && nota.mensagemtransmissaonfe ? (
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
					{!cancelada && (pendente || eventoPendente || !autorizada) ? (
						<Button
							variant="secondary"
							onClick={() => {
								setErroOperacao(null);
								consultarMutation.mutate();
							}}
							disabled={consultarMutation.isPending}
						>
							{consultarMutation.isPending
								? "Consultando..."
								: modoDps
									? "Consultar status DPS"
									: "Consultar RPS"}
						</Button>
					) : null}
					{autorizada && !eventoPendente ? (
						<div className="flex flex-col gap-4 w-full">
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
										cancelarMutation.isPending ||
										motivoCancelamento.length < 15
									}
								>
									Cancelar NFS-e
								</Button>
							</div>
							{modoDps ? (
								<div className="flex flex-col gap-2 w-full sm:max-w-md border-t pt-4">
									<p className="text-sm font-medium">Substituição DPS</p>
									<Input
										placeholder="ID da NFS-e substituta (UUID)"
										value={idNotaSubstituta}
										onChange={(e) => setIdNotaSubstituta(e.target.value)}
									/>
									<Input
										placeholder="Motivo da substituição (mín. 15 caracteres)"
										value={motivoSubstituicao}
										onChange={(e) => setMotivoSubstituicao(e.target.value)}
									/>
									<Button
										variant="outline"
										onClick={() => substituirMutation.mutate()}
										disabled={
											substituirMutation.isPending ||
											motivoSubstituicao.length < 15 ||
											idNotaSubstituta.length < 36
										}
									>
										Substituir NFS-e
									</Button>
								</div>
							) : null}
						</div>
					) : null}
				</div>
			</main>
		</PageContainer>
	);
}
