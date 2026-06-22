"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { contaCorrenteLancamentoService } from "@/services/conta-corrente-lancamento.service";
import type { PlanoContas } from "@/services/plano-contas.service";
import {
	classeStatusImportacaoOfx,
	formatarDataOfx,
	formatarValorOfx,
	labelStatusImportacaoOfx,
	labelTipoOfx,
	type LinhaImportacaoOfx,
	tipomovimentoPorTipoOfx,
	truncarDocumento,
} from "@/util/ofx-importacao";

interface TabelaImportacaoOfxProps {
	idcontacorrente: string;
	linhas: LinhaImportacaoOfx[];
	onLinhasChange: (linhas: LinhaImportacaoOfx[]) => void;
	planosEntrada: PlanoContas[];
	planosSaida: PlanoContas[];
}

function opcoesPlanoContas(planos: PlanoContas[]) {
	return planos.map((plano) => {
		const nivel = plano.codigo ? (plano.codigo.match(/\./g) || []).length : 0;
		const prefix = "\u00A0\u00A0".repeat(nivel);
		return {
			value: plano.id,
			label: `${prefix}${plano.codigo ? `${plano.codigo} - ` : ""}${plano.nome || plano.id}`,
		};
	});
}

export function TabelaImportacaoOfx({
	idcontacorrente,
	linhas,
	onLinhasChange,
	planosEntrada,
	planosSaida,
}: TabelaImportacaoOfxProps) {
	const queryClient = useQueryClient();
	const [linhaConfirmando, setLinhaConfirmando] = useState<string | null>(null);

	const opcoesPorTipo = useMemo(
		() => ({
			E: opcoesPlanoContas(planosEntrada),
			S: opcoesPlanoContas(planosSaida),
		}),
		[planosEntrada, planosSaida],
	);

	const { mutate: confirmarLinha } = useMutation({
		mutationFn: async ({
			linha,
			idplanocontas,
		}: {
			linha: LinhaImportacaoOfx;
			idplanocontas: string;
		}) => {
			return contaCorrenteLancamentoService.criar({
				idcontacorrente,
				datahora: linha.data,
				tipo: linha.tipo === "C" ? "E" : "S",
				valor: linha.valor,
				historico: linha.historico,
				documento: linha.documento || undefined,
				idplanocontas,
				dataconciliacao: linha.data,
			});
		},
		onSuccess: (lancamento, { linha }) => {
			onLinhasChange(
				linhas.map((item) =>
					item.idTemporario === linha.idTemporario
						? {
								...item,
								status: "importada",
								idLancamentoCriado: lancamento.id,
							}
						: item,
				),
			);
			queryClient.invalidateQueries({
				queryKey: ["conta-corrente-lancamentos"],
			});
			toast.success("Movimentação importada com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao confirmar importação");
		},
		onSettled: () => {
			setLinhaConfirmando(null);
		},
	});

	const atualizarPlano = (idTemporario: string, idplanocontas: string) => {
		onLinhasChange(
			linhas.map((linha) =>
				linha.idTemporario === idTemporario
					? { ...linha, idplanocontasSelecionado: idplanocontas || undefined }
					: linha,
			),
		);
	};

	const ignorarLinha = (idTemporario: string) => {
		onLinhasChange(
			linhas.map((linha) =>
				linha.idTemporario === idTemporario
					? { ...linha, status: "ignorada" }
					: linha,
			),
		);
	};

	const handleConfirmar = (linha: LinhaImportacaoOfx) => {
		if (!linha.idplanocontasSelecionado) {
			toast.error("Selecione um plano de contas");
			return;
		}

		setLinhaConfirmando(linha.idTemporario);
		confirmarLinha({
			linha,
			idplanocontas: linha.idplanocontasSelecionado,
		});
	};

	if (linhas.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Transações do extrato</h2>
			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Data</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead className="text-right">Valor</TableHead>
							<TableHead>Histórico</TableHead>
							<TableHead>Documento</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="min-w-[220px]">Plano de contas</TableHead>
							<TableHead className="text-right">Ação</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{linhas.map((linha) => {
							const tipomovimento = tipomovimentoPorTipoOfx(linha.tipo);
							const opcoes = opcoesPorTipo[tipomovimento];
							const acaoDesabilitada =
								linha.status !== "pendente" ||
								linhaConfirmando === linha.idTemporario;

							return (
								<TableRow key={linha.idTemporario}>
									<TableCell>{formatarDataOfx(linha.data)}</TableCell>
									<TableCell>{labelTipoOfx(linha.tipo)}</TableCell>
									<TableCell className="text-right">
										R$ {formatarValorOfx(linha.valor)}
									</TableCell>
									<TableCell className="max-w-[240px] truncate">
										{linha.historico}
									</TableCell>
									<TableCell className="max-w-[120px] truncate">
										{truncarDocumento(linha.documento)}
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className={classeStatusImportacaoOfx(linha.status)}
										>
											{labelStatusImportacaoOfx(linha.status)}
										</Badge>
									</TableCell>
									<TableCell>
										<Combobox
											options={opcoes}
											value={linha.idplanocontasSelecionado ?? ""}
											onChange={(value) =>
												atualizarPlano(linha.idTemporario, value)
											}
											placeholder="Selecione o plano"
											searchPlaceholder="Buscar plano..."
											emptyMessage="Nenhum plano encontrado."
											disabled={linha.status !== "pendente"}
										/>
									</TableCell>
									<TableCell className="text-right">
										{linha.status === "pendente" ? (
											<div className="flex justify-end gap-2">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => ignorarLinha(linha.idTemporario)}
													disabled={acaoDesabilitada}
												>
													Ignorar
												</Button>
												<Button
													type="button"
													size="sm"
													onClick={() => handleConfirmar(linha)}
													disabled={
														acaoDesabilitada ||
														!linha.idplanocontasSelecionado
													}
												>
													{linhaConfirmando === linha.idTemporario
														? "Confirmando..."
														: "Confirmar"}
												</Button>
											</div>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
