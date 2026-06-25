"use client";

import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
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
	type CfopDePara,
	cfopDeParaService,
} from "@/services/cfop-depara.service";
import { ModalCfopDePara } from "./components/modal-cfop-depara";
import { PainelFluxoTributacaoImportacao } from "../components/painel-fluxo-tributacao-importacao";

export default function CfopDeParaPage() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [registroEdicao, setRegistroEdicao] = useState<CfopDePara | null>(null);
	const [pagina, setPagina] = useState(1);

	const { data, isLoading } = useQuery({
		queryKey: ["cfop-depara", empresa?.id, pagina],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return cfopDeParaService.listar({
				idempresa: empresa.id,
				page: pagina,
				limit: 10,
			});
		},
		enabled: !!empresa,
	});

	const excluirMutation = useMutation({
		mutationFn: async (id: string) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			await cfopDeParaService.excluir(id, empresa.id);
		},
		onSuccess: () => {
			toast.success("Mapeamento excluído");
			queryClient.invalidateQueries({ queryKey: ["cfop-depara", empresa?.id] });
		},
		onError: () => {
			toast.error("Não foi possível excluir o mapeamento");
		},
	});

	const abrirNovo = () => {
		setRegistroEdicao(null);
		setModalAberto(true);
	};

	const abrirEdicao = (registro: CfopDePara) => {
		setRegistroEdicao(registro);
		setModalAberto(true);
	};

	const fecharModal = () => {
		setModalAberto(false);
		setRegistroEdicao(null);
	};

	if (!empresa) {
		return (
			<div className="px-4">
				<p className="text-muted-foreground text-sm">
					Selecione uma empresa para gerenciar os CFOP de-para.
				</p>
			</div>
		);
	}

	const registros = data?.data ?? [];
	const paginacao = data?.paginacao;

	return (
		<main className="px-4 space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Mapeamento CFOP entrada → saída</h1>
					<p className="text-muted-foreground text-sm">
						Converte o CFOP da NF de compra no CFOP de saída do produto na
						importação.
					</p>
				</div>
				<Button onClick={abrirNovo}>
					<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
					Novo mapeamento
				</Button>
			</header>

			<PainelFluxoTributacaoImportacao variante="cfop-depara" />

			{isLoading ? (
				<div className="rounded-lg border">
					<TableSkeleton rows={5}>
						<TableHead>CFOP entrada</TableHead>
						<TableHead>CFOP saída</TableHead>
						<TableHead>UF</TableHead>
						<TableHead className="w-28 text-right">Ações</TableHead>
					</TableSkeleton>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>CFOP entrada</TableHead>
								<TableHead>CFOP saída</TableHead>
								<TableHead>UF</TableHead>
								<TableHead className="w-28 text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{registros.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground"
									>
										Nenhum mapeamento cadastrado. O sistema usará a conversão
										automática de CFOP (ex.: 1102 → 5102) na importação.
									</TableCell>
								</TableRow>
							) : (
								registros.map((registro) => (
									<TableRow key={registro.id}>
										<TableCell>{registro.codigoentrada ?? "-"}</TableCell>
										<TableCell>{registro.codigosaida ?? "-"}</TableCell>
										<TableCell>{registro.uf ?? "Todas"}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Editar mapeamento"
													onClick={() => abrirEdicao(registro)}
												>
													<IconPencil className="h-4 w-4" aria-hidden="true" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Excluir mapeamento"
													onClick={() => excluirMutation.mutate(registro.id)}
													disabled={excluirMutation.isPending}
												>
													<IconTrash className="h-4 w-4" aria-hidden="true" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{paginacao && paginacao.totalPages > 1 && (
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina <= 1}
						onClick={() => setPagina((valor) => valor - 1)}
					>
						Anterior
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {paginacao.page} de {paginacao.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina >= paginacao.totalPages}
						onClick={() => setPagina((valor) => valor + 1)}
					>
						Próxima
					</Button>
				</div>
			)}

			<ModalCfopDePara
				aberto={modalAberto}
				idempresa={empresa.id}
				id={registroEdicao?.id}
				registro={registroEdicao}
				onFechar={fecharModal}
				onSucesso={() => {
					toast.success(
						registroEdicao
							? "Mapeamento atualizado com sucesso"
							: "Mapeamento criado com sucesso",
					);
					queryClient.invalidateQueries({
						queryKey: ["cfop-depara", empresa.id],
					});
				}}
			/>
		</main>
	);
}
