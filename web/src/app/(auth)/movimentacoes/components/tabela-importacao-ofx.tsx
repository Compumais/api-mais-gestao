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
import {
	contaCorrenteLancamentoService,
} from "@/services/conta-corrente-lancamento.service";
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

type DadosLancamentoOfx = {
	datahora: string;
	tipo: "E" | "S";
	valor: string;
	historico: string;
	documento?: string;
	idplanocontas: string;
	dataconciliacao: string;
};

function montarDadosLancamento(
	linha: LinhaImportacaoOfx,
	idplanocontas: string,
): DadosLancamentoOfx {
	return {
		datahora: linha.data,
		tipo: linha.tipo === "C" ? "E" : "S",
		valor: linha.valor,
		historico: linha.historico,
		documento: linha.documento || undefined,
		idplanocontas,
		dataconciliacao: linha.data,
	};
}

function linhaPermiteAcao(status: LinhaImportacaoOfx["status"]): boolean {
	return status === "pendente" || status === "existente";
}

export function TabelaImportacaoOfx({
	idcontacorrente,
	linhas,
	onLinhasChange,
	planosEntrada,
	planosSaida,
}: TabelaImportacaoOfxProps) {
	const queryClient = useQueryClient();
	const [linhaProcessando, setLinhaProcessando] = useState<string | null>(null);

	const opcoesPorTipo = useMemo(
		() => ({
			E: opcoesPlanoContas(planosEntrada),
			S: opcoesPlanoContas(planosSaida),
		}),
		[planosEntrada, planosSaida],
	);

	const invalidarListagem = () => {
		queryClient.invalidateQueries({
			queryKey: ["conta-corrente-lancamentos"],
		});
	};

	const marcarLinhaImportada = (
		linha: LinhaImportacaoOfx,
		idLancamento: string,
	) => {
		onLinhasChange(
			linhas.map((item) =>
				item.idTemporario === linha.idTemporario
					? {
							...item,
							status: "importada",
							idLancamentoCriado: idLancamento,
						}
					: item,
			),
		);
	};

	const { mutate: realizarLancamento } = useMutation({
		mutationFn: async ({
			linha,
			idplanocontas,
		}: {
			linha: LinhaImportacaoOfx;
			idplanocontas: string;
		}) => {
			return contaCorrenteLancamentoService.criar({
				idcontacorrente,
				...montarDadosLancamento(linha, idplanocontas),
			});
		},
		onSuccess: (lancamento, { linha }) => {
			marcarLinhaImportada(linha, lancamento.id);
			invalidarListagem();
			toast.success("Movimentação importada com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao realizar lançamento");
		},
		onSettled: () => {
			setLinhaProcessando(null);
		},
	});

	const { mutate: atualizarLancamento } = useMutation({
		mutationFn: async ({
			linha,
			idplanocontas,
		}: {
			linha: LinhaImportacaoOfx;
			idplanocontas: string;
		}) => {
			if (!linha.idLancamentoExistente) {
				throw new Error("Lançamento existente não identificado");
			}

			return contaCorrenteLancamentoService.atualizar(
				linha.idLancamentoExistente,
				montarDadosLancamento(linha, idplanocontas),
			);
		},
		onSuccess: (lancamento, { linha }) => {
			marcarLinhaImportada(linha, lancamento.id);
			invalidarListagem();
			toast.success("Movimentação atualizada com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar lançamento");
		},
		onSettled: () => {
			setLinhaProcessando(null);
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

	const validarPlanoSelecionado = (linha: LinhaImportacaoOfx): boolean => {
		if (!linha.idplanocontasSelecionado) {
			toast.error("Selecione um plano de contas");
			return false;
		}

		return true;
	};

	const handleRealizarLancamento = (linha: LinhaImportacaoOfx) => {
		if (!validarPlanoSelecionado(linha)) {
			return;
		}

		setLinhaProcessando(linha.idTemporario);
		realizarLancamento({
			linha,
			idplanocontas: linha.idplanocontasSelecionado as string,
		});
	};

	const handleAtualizar = (linha: LinhaImportacaoOfx) => {
		if (!validarPlanoSelecionado(linha)) {
			return;
		}

		if (!linha.idLancamentoExistente) {
			toast.error("Lançamento existente não identificado");
			return;
		}

		setLinhaProcessando(linha.idTemporario);
		atualizarLancamento({
			linha,
			idplanocontas: linha.idplanocontasSelecionado as string,
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
							const permiteAcao = linhaPermiteAcao(linha.status);
							const acaoDesabilitada =
								!permiteAcao || linhaProcessando === linha.idTemporario;
							const processando = linhaProcessando === linha.idTemporario;

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
											disabled={!permiteAcao}
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
													onClick={() => handleRealizarLancamento(linha)}
													disabled={
														acaoDesabilitada ||
														!linha.idplanocontasSelecionado
													}
												>
													{processando
														? "Processando..."
														: "Realizar lançamento"}
												</Button>
											</div>
										) : linha.status === "existente" ? (
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
													onClick={() => handleAtualizar(linha)}
													disabled={
														acaoDesabilitada ||
														!linha.idplanocontasSelecionado
													}
												>
													{processando ? "Processando..." : "Atualizar"}
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
