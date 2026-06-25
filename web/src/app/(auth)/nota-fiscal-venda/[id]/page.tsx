"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Download, Printer, Send, Ban, FileX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { NFE_STATUS, NFE_AMBIENTE_LABELS, emissaoFoiAutorizada } from "@/constants/nfe-status";
import { obterInfoRejeicao } from "@/constants/nfe-rejeicoes";
import {
	buscarNfeEmitidaPorId,
	downloadXmlNfe,
	abrirDanfeNfe,
	transmitirNfe,
	cancelarNfe,
	inutilizarNfe,
} from "@/services/nfe-emissao.service";
import { entidadesService } from "@/services/entidades.service";
import { obterCodigoRejeicaoNota, obterMotivoRejeicaoNota } from "@/util/nfe-rejeicao-util";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useNfeConfiguracao } from "@/hooks/use-nfe-configuracao";
import { AvisoAmbienteNfe } from "../components/aviso-ambiente-nfe";
import { StatusNfeBadge } from "../components/status-nfe-badge";
import { ResumoDestinatarioNfe } from "../components/resumo-destinatario-nfe";
import { ModalConfirmacaoProducao } from "../components/modal-confirmacao-producao";
import { ModalEventoNfe } from "../components/modal-evento-nfe";
import { PageContainer } from "../../components/page-container";
import {
	notaPodeSerCancelada,
	notaPodeSerInutilizada,
} from "@/util/validar-eventos-nfe";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(parseFloat(value));
};

const formatDate = (date: string | null | undefined) => {
	if (!date) return "-";
	try {
		return new Date(date).toLocaleDateString("pt-BR");
	} catch {
		return date;
	}
};

function copiarParaClipboard(texto: string) {
	navigator.clipboard.writeText(texto).catch(() => {});
}

async function handleImprimirDanfe(id: string) {
	try {
		await abrirDanfeNfe(id);
	} catch (erro) {
		toast.error("Não foi possível abrir o DANFE", {
			description: erro instanceof Error ? erro.message : "Erro desconhecido",
		});
	}
}

async function handleDownloadXml(id: string) {
	try {
		const blob = await downloadXmlNfe(id, "autorizado");
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `nfe-${id}.xml`;
		a.click();
		URL.revokeObjectURL(url);
	} catch {
		alert("Não foi possível baixar o XML.");
	}
}

export default function DetalheNfePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const queryClient = useQueryClient();
	const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
	const [modalEvento, setModalEvento] = useState<"cancelar" | "inutilizar" | null>(
		null,
	);

	const { data: nf, isLoading } = useQuery({
		queryKey: ["nfe-detalhe", id],
		queryFn: () => buscarNfeEmitidaPorId(id),
		enabled: !!id,
	});

	const { data: entidadeDestinatario } = useQuery({
		queryKey: ["entidade-destinatario-nfe", nf?.identidade],
		queryFn: async () => {
			const identidade = nf?.identidade;
			if (!identidade) throw new Error("Destinatário não informado");
			return entidadesService.buscar(identidade);
		},
		enabled: !!nf?.identidade,
	});

	const dadosDestinatario = useMemo(() => {
		if (entidadeDestinatario) return entidadeDestinatario;
		if (!nf?.razaosocial && !nf?.cnpjcpf) return null;
		return {
			razaosocial: nf.razaosocial,
			cnpjcpf: nf.cnpjcpf,
			inscricaoestadual: nf.inscricaoestadual,
			endereco: nf.endereco,
			numeroendereco: nf.numeroendereco,
			bairro: nf.bairro,
			cep: nf.cep,
			cidade: nf.cidade,
			estado: nf.estado,
		};
	}, [entidadeDestinatario, nf]);

	const { data: itensData } = useQuery({
		queryKey: ["nfe-itens", id],
		queryFn: async () => {
			const { data } = await api.get<{
				notaFiscal: unknown;
				itens: unknown[];
			}>(`/notas-fiscais/${id}`);
			return data.itens ?? [];
		},
		enabled: !!id,
	});

	const { nfeConfiguracao } = useNfeConfiguracao(nf?.idempresa);

	const { mutate: transmitir, isPending: transmitindo } = useMutation({
		mutationFn: (confirmarProducao: boolean) =>
			transmitirNfe(id, confirmarProducao),
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({ queryKey: ["nfe-detalhe", id] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-itens", id] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-emitidas"] });

			if (!emissaoFoiAutorizada(resultado)) {
				toast.error(
					`NF-e rejeitada${resultado.cStat ? ` (código ${resultado.cStat})` : ""}`,
					{
						description:
							resultado.xMotivo ?? "Verifique os dados e tente novamente.",
					},
				);
				return;
			}

			toast.success("NF-e transmitida e autorizada!", {
				description: `Chave: ${resultado.chave ?? "—"}`,
			});

			void abrirDanfeNfe(resultado.idnotafiscal).catch((erro) => {
				toast.warning("NF-e autorizada, mas não foi possível abrir o DANFE", {
					description:
						erro instanceof Error ? erro.message : "Erro desconhecido",
				});
			});

			router.refresh();
		},
		onError: (erro) => {
			toast.error("Erro ao transmitir NF-e", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	function handleTransmitir() {
		if (nfeConfiguracao?.ambiente === 1) {
			setModalConfirmacaoAberto(true);
			return;
		}

		transmitir(false);
	}

	function handleConfirmarTransmissaoProducao() {
		setModalConfirmacaoAberto(false);
		transmitir(true);
	}

	const { mutate: cancelar, isPending: cancelando } = useMutation({
		mutationFn: (justificativa: string) => cancelarNfe(id, justificativa),
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({ queryKey: ["nfe-detalhe", id] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-emitidas"] });
			setModalEvento(null);
			toast.success("NF-e cancelada com sucesso", {
				description: resultado.xMotivo ?? undefined,
			});
		},
		onError: (erro) => {
			toast.error("Não foi possível cancelar a NF-e", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: inutilizar, isPending: inutilizando } = useMutation({
		mutationFn: (justificativa: string) => inutilizarNfe(id, justificativa),
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({ queryKey: ["nfe-detalhe", id] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-emitidas"] });
			setModalEvento(null);
			toast.success("Numeração inutilizada com sucesso", {
				description: resultado.xMotivo ?? undefined,
			});
		},
		onError: (erro) => {
			toast.error("Não foi possível inutilizar a numeração", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-16">
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</PageContainer>
		);
	}

	if (!nf) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-16">
					<p className="text-muted-foreground">NF-e não encontrada.</p>
				</div>
			</PageContainer>
		);
	}

	const ehRejeitada = nf.status === NFE_STATUS.REJEITADA;
	const ehPendente = nf.status === NFE_STATUS.PENDENTE;
	const ehAutorizada = nf.status === NFE_STATUS.AUTORIZADA;
	const ehCancelada =
		nf.status === NFE_STATUS.CANCELADA ||
		nf.status === NFE_STATUS.CANCELADA_FORA_PRAZO;
	const ehInutilizada = nf.status === NFE_STATUS.INUTILIZADA;
	const podeTransmitir = ehPendente || ehRejeitada;
	const regraCancelamento = notaPodeSerCancelada(nf);
	const regraInutilizacao = notaPodeSerInutilizada(nf);
	const codigoRejeicao = obterCodigoRejeicaoNota(nf);
	const motivoRejeicao = obterMotivoRejeicaoNota(nf);
	const codigoRejeicaoNumero = codigoRejeicao ? Number(codigoRejeicao) : null;
	const rejeicaoInfo =
		ehRejeitada && codigoRejeicaoNumero
			? obterInfoRejeicao(codigoRejeicaoNumero)
			: null;

	return (
		<PageContainer>
			<div className="flex flex-col gap-5 py-4 md:py-6 max-w-5xl mx-auto px-4">
				<div className="flex items-center gap-3">
					<Link href="/nota-fiscal-venda">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div className="flex-1">
						<h1 className="text-xl font-bold">
							NF-e {nf.serie && nf.numeronotafiscal
								? `${nf.serie}-${nf.numeronotafiscal}`
								: "Detalhe"}
						</h1>
						<p className="text-sm text-muted-foreground">
							Emissão: {formatDate(nf.emissao ?? nf.datainclusao)}
						</p>
					</div>
					<StatusNfeBadge
						status={nf.status}
						cStat={codigoRejeicao}
						xMotivo={motivoRejeicao}
						size="lg"
					/>
				</div>

				<AvisoAmbienteNfe ambiente={nf.tipoambientenfe} />

				{ehPendente && (
					<div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
						<div className="flex items-center gap-2 text-amber-900">
							<AlertTriangle className="h-5 w-5" />
							<span className="font-semibold">NF-e pendente de transmissão</span>
						</div>
						<p className="text-sm text-amber-900">
							Esta nota foi salva, mas ainda não foi enviada à SEFAZ. Use{" "}
							<strong>Transmitir para SEFAZ</strong> para concluir a emissão com
							os dados já cadastrados.
						</p>
						{motivoRejeicao && (
							<p className="text-xs text-amber-800">{motivoRejeicao}</p>
						)}
					</div>
				)}

				{/* Card de rejeição */}
				{ehRejeitada && (
					<div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
						<div className="flex items-center gap-2 text-red-800">
							<AlertTriangle className="h-5 w-5" />
							<span className="font-semibold">NF-e Rejeitada pela SEFAZ</span>
						</div>

						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div>
								<p className="text-xs text-red-600 font-medium uppercase tracking-wide">
									Código
								</p>
								<p className="text-sm font-mono text-red-800">
									{codigoRejeicao ?? "—"}
								</p>
							</div>
							<div>
								<p className="text-xs text-red-600 font-medium uppercase tracking-wide">
									Motivo
								</p>
								<p className="text-sm text-red-800">
									{motivoRejeicao ?? "—"}
								</p>
							</div>
						</div>

						{rejeicaoInfo && (
							<>
								<Separator className="border-red-200" />
								<div>
									<p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">
										Como corrigir
									</p>
									<p className="text-sm text-red-700">{rejeicaoInfo.instrucao}</p>
								</div>
							</>
						)}
					</div>
				)}

				{ehAutorizada && !regraCancelamento.permitido && regraCancelamento.motivo && (
					<div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
						<strong className="text-foreground">Cancelamento:</strong>{" "}
						{regraCancelamento.motivo}
					</div>
				)}

				{(ehCancelada || ehInutilizada) && nf.justificativacancelamentonfe && (
					<div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
						<p className="font-medium">
							{ehCancelada ? "NF-e cancelada" : "Numeração inutilizada"}
						</p>
						<p className="text-muted-foreground">
							Justificativa: {nf.justificativacancelamentonfe}
						</p>
						{nf.cancelamento && (
							<p className="text-xs text-muted-foreground">
								Evento em {formatDate(nf.cancelamento)}
							</p>
						)}
					</div>
				)}

				{/* Dados gerais */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Dados da Nota</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
						<div>
							<p className="text-muted-foreground text-xs font-medium uppercase">Série / Número</p>
							<p className="font-medium">{nf.serie ?? "—"} / {nf.numeronotafiscal ?? "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium uppercase">Modelo</p>
							<p>{nf.modelo ?? "55"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium uppercase">Ambiente</p>
							<p>{nf.tipoambientenfe ? (NFE_AMBIENTE_LABELS[nf.tipoambientenfe] ?? nf.tipoambientenfe) : "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium uppercase">Protocolo</p>
							<p className="font-mono text-xs">{nf.protocolonfe ?? "—"}</p>
						</div>
						<div className="col-span-2 sm:col-span-3">
							<p className="text-muted-foreground text-xs font-medium uppercase">Chave de Acesso</p>
							<div className="flex items-center gap-2">
								<p
									className="font-mono text-xs break-all cursor-pointer hover:text-primary"
									title="Clique para copiar"
									onClick={() => nf.chavenfe && copiarParaClipboard(nf.chavenfe)}
							onKeyDown={(e) => e.key === "Enter" && nf.chavenfe && copiarParaClipboard(nf.chavenfe)}
								>
									{nf.chavenfe ?? "—"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Destinatário */}
				{dadosDestinatario && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Destinatário</CardTitle>
						</CardHeader>
						<CardContent>
							<ResumoDestinatarioNfe dados={dadosDestinatario} />
						</CardContent>
					</Card>
				)}

				{/* Itens */}
				{itensData && itensData.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Itens</CardTitle>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>#</TableHead>
										<TableHead>Descrição</TableHead>
										<TableHead>UN</TableHead>
										<TableHead className="text-right">Qtd</TableHead>
										<TableHead className="text-right">Vlr Unit.</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead>CFOP</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(itensData as Array<Record<string, unknown>>).map((item, index) => (
										<TableRow key={String(item.id ?? index)}>
											<TableCell className="text-muted-foreground text-sm">
												{Number(item.contador ?? index + 1)}
											</TableCell>
											<TableCell>{String(item.descricao ?? "—")}</TableCell>
											<TableCell>{String(item.unidade ?? "UN")}</TableCell>
											<TableCell className="text-right">
												{String(item.quantidade ?? "0")}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(String(item.precounitario ?? "0"))}
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(String(item.total ?? "0"))}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{String(item.cfop ?? "—")}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{/* Totais */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Totais</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col items-end gap-1 text-sm">
						<div className="flex gap-8">
							<span className="text-muted-foreground">Total da NF-e:</span>
							<span className="font-bold text-base">
								{formatCurrency(nf.valortotalnota)}
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Ações */}
				<div className="flex gap-3 justify-end flex-wrap">
					{podeTransmitir && (
						<Button
							className="gap-2"
							onClick={handleTransmitir}
							disabled={transmitindo}
						>
							<Send className="h-4 w-4" />
							{transmitindo ? "Transmitindo..." : "Transmitir para SEFAZ"}
						</Button>
					)}
					{podeTransmitir && (
						<Link href={`/nota-fiscal-venda/nova?reemitir=${id}`}>
							<Button variant="outline">
								{ehRejeitada ? "Corrigir e reemitir" : "Editar antes de transmitir"}
							</Button>
						</Link>
					)}
					{ehAutorizada && (
						<Button
							variant="default"
							className="gap-2"
							onClick={() => handleImprimirDanfe(id)}
						>
							<Printer className="h-4 w-4" />
							Imprimir DANFE
						</Button>
					)}
					{ehAutorizada && nf.chavenfe && (
						<Button
							variant="outline"
							className="gap-2"
							onClick={() => handleDownloadXml(id)}
						>
							<Download className="h-4 w-4" />
							Download XML
						</Button>
					)}
					{regraCancelamento.permitido && (
						<Button
							variant="destructive"
							className="gap-2"
							onClick={() => setModalEvento("cancelar")}
							disabled={cancelando}
						>
							<Ban className="h-4 w-4" />
							Cancelar NF-e
						</Button>
					)}
					{regraInutilizacao.permitido && (
						<Button
							variant="outline"
							className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
							onClick={() => setModalEvento("inutilizar")}
							disabled={inutilizando}
						>
							<FileX2 className="h-4 w-4" />
							Inutilizar numeração
						</Button>
					)}
					<Link href="/nota-fiscal-venda">
						<Button variant="ghost">Voltar</Button>
					</Link>
				</div>

				<ModalConfirmacaoProducao
					open={modalConfirmacaoAberto}
					onClose={() => setModalConfirmacaoAberto(false)}
					onConfirmar={handleConfirmarTransmissaoProducao}
					carregando={transmitindo}
				/>

				<ModalEventoNfe
					open={modalEvento === "cancelar"}
					onClose={() => setModalEvento(null)}
					onConfirmar={(justificativa) => cancelar(justificativa)}
					carregando={cancelando}
					titulo="Cancelar NF-e"
					descricao="O cancelamento só é permitido em até 24 horas após a autorização. Informe uma justificativa clara (mínimo 15 caracteres)."
					rotuloConfirmar="Confirmar cancelamento"
				/>

				<ModalEventoNfe
					open={modalEvento === "inutilizar"}
					onClose={() => setModalEvento(null)}
					onConfirmar={(justificativa) => inutilizar(justificativa)}
					carregando={inutilizando}
					titulo="Inutilizar numeração"
					descricao="Use quando a NF-e não foi autorizada (pendente ou rejeitada) e o número não será mais utilizado. A justificativa deve ter no mínimo 15 caracteres."
					rotuloConfirmar="Confirmar inutilização"
				/>
			</div>
		</PageContainer>
	);
}
