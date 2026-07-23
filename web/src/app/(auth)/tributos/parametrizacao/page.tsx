"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import {
	type ParametrizacaoTributosFormData,
	parametrizacaoTributosFormSchema,
} from "@/schemas/parametrizacao-tributos.schema";
import {
	type ParametrizacaoTributos,
	parametrizacaoTributosService,
} from "@/services/parametrizacao-tributos.service";
import { formatarCstProduto } from "@/util/cst-produto-util";
import { FormularioParametrizacaoTributos } from "../components/formulario-parametrizacao-tributos";
import { PainelFluxoTributacaoImportacao } from "../components/painel-fluxo-tributacao-importacao";

function normalizarCstOuCsosn(
	valor: string | null | undefined,
	tamanho: number,
): string | null {
	const formatado = formatarCstProduto(valor, tamanho);
	return formatado || null;
}

const VALORES_PADRAO: ParametrizacaoTributosFormData = {
	codigocfopentrada: "",
	cstentrada: null,
	csosnentrada: null,
	ncm: null,
	taxaicmsentrada: null,
	uf: null,
	ignorarprimeirodigitocst: false,
	idcfopsaidanfe: null,
	cstnfe: null,
	csosnnfe: null,
	taxaicmsnfe: null,
	idcfopsaidanfce: null,
	cstnfce: null,
	csosnnfce: null,
	taxaicmsnfce: null,
	aliquotapis: null,
	cstpis: null,
	aliquotacofins: null,
	cstcofins: null,
	cstipi: null,
	idenquadramentoipi: null,
	percentualmva: null,
	percentualirrf: null,
	tipoproduto: "00",
};

function textoOuNulo(valor?: string | null): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function mapRegistroParaForm(
	registro: ParametrizacaoTributos,
): ParametrizacaoTributosFormData {
	return {
		codigocfopentrada: registro.codigocfopentrada ?? "",
		cstentrada: normalizarCstOuCsosn(registro.cstentrada, 2),
		csosnentrada: normalizarCstOuCsosn(registro.csosnentrada, 3),
		ncm: registro.ncm,
		taxaicmsentrada: registro.taxaicmsentrada,
		uf: registro.uf,
		ignorarprimeirodigitocst: registro.ignorarprimeirodigitocst === 1,
		idcfopsaidanfe: registro.idcfopsaidanfe,
		cstnfe: normalizarCstOuCsosn(registro.cstnfe, 2),
		csosnnfe: normalizarCstOuCsosn(registro.csosnnfe, 3),
		taxaicmsnfe: registro.taxaicmsnfe,
		idcfopsaidanfce: registro.idcfopsaidanfce,
		cstnfce: normalizarCstOuCsosn(registro.cstnfce, 2),
		csosnnfce: normalizarCstOuCsosn(registro.csosnnfce, 3),
		taxaicmsnfce: registro.taxaicmsnfce,
		aliquotapis: registro.aliquotapis,
		cstpis: normalizarCstOuCsosn(registro.cstpis, 2),
		aliquotacofins: registro.aliquotacofins,
		cstcofins: normalizarCstOuCsosn(registro.cstcofins, 2),
		cstipi: normalizarCstOuCsosn(registro.cstipi, 2),
		idenquadramentoipi: registro.idenquadramentoipi,
		percentualmva: registro.percentualmva,
		percentualirrf: registro.percentualirrf,
		tipoproduto: registro.tipoproduto ?? "00",
	};
}

function mapFormParaPayload(
	dados: ParametrizacaoTributosFormData,
	idempresa: string,
) {
	return {
		idempresa,
		codigocfopentrada: dados.codigocfopentrada.trim(),
		cstentrada: textoOuNulo(dados.cstentrada),
		csosnentrada: textoOuNulo(dados.csosnentrada),
		ncm: textoOuNulo(dados.ncm),
		taxaicmsentrada: textoOuNulo(dados.taxaicmsentrada),
		uf: textoOuNulo(dados.uf)?.toUpperCase() ?? null,
		ignorarprimeirodigitocst: dados.ignorarprimeirodigitocst ? 1 : 0,
		idcfopsaidanfe: dados.idcfopsaidanfe ?? null,
		cstnfe: textoOuNulo(dados.cstnfe),
		csosnnfe: textoOuNulo(dados.csosnnfe),
		taxaicmsnfe: textoOuNulo(dados.taxaicmsnfe),
		idcfopsaidanfce: dados.idcfopsaidanfce ?? null,
		cstnfce: textoOuNulo(dados.cstnfce),
		csosnnfce: textoOuNulo(dados.csosnnfce),
		taxaicmsnfce: textoOuNulo(dados.taxaicmsnfce),
		aliquotapis: textoOuNulo(dados.aliquotapis),
		cstpis: textoOuNulo(dados.cstpis),
		aliquotacofins: textoOuNulo(dados.aliquotacofins),
		cstcofins: textoOuNulo(dados.cstcofins),
		cstipi: textoOuNulo(dados.cstipi),
		idenquadramentoipi: dados.idenquadramentoipi ?? null,
		percentualmva: textoOuNulo(dados.percentualmva),
		percentualirrf: textoOuNulo(dados.percentualirrf),
		tipoproduto: textoOuNulo(dados.tipoproduto) ?? "00",
	};
}

export default function ParametrizacaoTributosPage() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [pagina, setPagina] = useState(1);
	const [busca, setBusca] = useState("");
	const [dialogFormularioAberto, setDialogFormularioAberto] = useState(false);
	const [modoFormulario, setModoFormulario] = useState<"novo" | "edicao">("novo");
	const [registroEdicao, setRegistroEdicao] =
		useState<ParametrizacaoTributos | null>(null);
	const [excluirDialogAberto, setExcluirDialogAberto] = useState(false);
	const [registroExclusao, setRegistroExclusao] =
		useState<ParametrizacaoTributos | null>(null);

	const form = useForm<ParametrizacaoTributosFormData>({
		resolver: zodResolver(parametrizacaoTributosFormSchema),
		defaultValues: VALORES_PADRAO,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["parametrizacao-tributos", empresa?.id, pagina, busca],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return parametrizacaoTributosService.listar({
				idempresa: empresa.id,
				page: pagina,
				limit: 10,
				busca: busca || undefined,
			});
		},
		enabled: !!empresa,
	});

	const salvarMutation = useMutation({
		mutationFn: async (dados: ParametrizacaoTributosFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const payload = mapFormParaPayload(dados, empresa.id);

			if (modoFormulario === "edicao" && registroEdicao) {
				return parametrizacaoTributosService.atualizar(
					registroEdicao.id,
					payload,
				);
			}

			return parametrizacaoTributosService.criar(payload);
		},
		onSuccess: () => {
			toast.success(
				modoFormulario === "edicao"
					? "Parametrização atualizada com sucesso"
					: "Parametrização criada com sucesso",
			);
			fecharDialogFormulario();
			queryClient.invalidateQueries({
				queryKey: ["parametrizacao-tributos", empresa?.id],
			});
		},
		onError: () => {
			toast.error("Não foi possível salvar a parametrização");
		},
	});

	const excluirMutation = useMutation({
		mutationFn: async (id: string) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			await parametrizacaoTributosService.excluir(id, empresa.id);
		},
		onSuccess: () => {
			toast.success("Parametrização excluída");
			if (registroEdicao?.id === registroExclusao?.id) {
				fecharDialogFormulario();
			}
			setExcluirDialogAberto(false);
			setRegistroExclusao(null);
			queryClient.invalidateQueries({
				queryKey: ["parametrizacao-tributos", empresa?.id],
			});
		},
		onError: () => {
			toast.error("Não foi possível excluir a parametrização");
		},
	});

	const abrirDialogNovo = () => {
		setModoFormulario("novo");
		setRegistroEdicao(null);
		form.reset(VALORES_PADRAO);
		setDialogFormularioAberto(true);
	};

	const abrirDialogEdicao = (registro: ParametrizacaoTributos) => {
		setModoFormulario("edicao");
		setRegistroEdicao(registro);
		form.reset(mapRegistroParaForm(registro));
		setDialogFormularioAberto(true);
	};

	const fecharDialogFormulario = () => {
		setDialogFormularioAberto(false);
		setRegistroEdicao(null);
		form.reset(VALORES_PADRAO);
	};

	const abrirDialogExclusao = (registro: ParametrizacaoTributos) => {
		setRegistroExclusao(registro);
		setExcluirDialogAberto(true);
	};

	const confirmarExclusao = () => {
		if (registroExclusao) {
			excluirMutation.mutate(registroExclusao.id);
		}
	};

	if (!empresa) {
		return (
			<div className="px-4">
				<p className="text-muted-foreground text-sm">
					Selecione uma empresa para gerenciar a parametrização de tributos.
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
					<h1 className="text-2xl font-bold">Parametrização de tributos</h1>
					<p className="text-muted-foreground text-sm">
						Regras de tributação de saída aplicadas automaticamente na
						importação de NF de compra.
					</p>
				</div>
				<Button type="button" onClick={abrirDialogNovo}>
					<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
					Nova regra
				</Button>
			</header>

			<PainelFluxoTributacaoImportacao variante="parametrizacao" />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Input
					placeholder="Buscar por CFOP, NCM ou CST..."
					value={busca}
					onChange={(evento) => {
						setBusca(evento.target.value);
						setPagina(1);
					}}
					className="max-w-sm"
				/>
			</div>

			{isLoading ? (
				<div className="rounded-lg border">
					<TableSkeleton rows={5}>
						<TableHead>CFOP entrada</TableHead>
						<TableHead>CST/CSOSN</TableHead>
						<TableHead>NCM</TableHead>
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
								<TableHead>CST/CSOSN</TableHead>
								<TableHead>NCM</TableHead>
								<TableHead>UF</TableHead>
								<TableHead className="w-28 text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{registros.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-muted-foreground"
									>
										Nenhuma regra cadastrada.
									</TableCell>
								</TableRow>
							) : (
								registros.map((registro) => (
									<TableRow key={registro.id}>
										<TableCell>{registro.codigocfopentrada ?? "-"}</TableCell>
										<TableCell>
											{registro.cstentrada || registro.csosnentrada || "-"}
										</TableCell>
										<TableCell>{registro.ncm ?? "-"}</TableCell>
										<TableCell>{registro.uf ?? "Todas"}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Editar regra"
													onClick={() => abrirDialogEdicao(registro)}
												>
													<IconPencil className="h-4 w-4" aria-hidden="true" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Excluir regra"
													onClick={() => abrirDialogExclusao(registro)}
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

			<Dialog
				open={dialogFormularioAberto}
				onOpenChange={(aberto) => {
					if (!aberto) fecharDialogFormulario();
				}}
			>
				<DialogContent
					className="max-h-[90vh] max-w-3xl overflow-y-auto"
					onOpenAutoFocus={(evento) => evento.preventDefault()}
					onCloseAutoFocus={(evento) => evento.preventDefault()}
					onPointerDownOutside={(evento) => {
						const alvo = evento.target as HTMLElement | null;
						if (alvo?.closest?.("[data-slot='select-content']")) {
							evento.preventDefault();
						}
					}}
					onInteractOutside={(evento) => {
						const alvo = evento.target as HTMLElement | null;
						if (alvo?.closest?.("[data-slot='select-content']")) {
							evento.preventDefault();
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>
							{modoFormulario === "edicao" ? "Editar regra" : "Nova regra"}
						</DialogTitle>
					</DialogHeader>
					{dialogFormularioAberto && (
						<FormularioParametrizacaoTributos
							form={form}
							onSubmit={(dados) => salvarMutation.mutate(dados)}
							isPending={salvarMutation.isPending}
							submitLabel={
								modoFormulario === "edicao"
									? "Salvar alterações"
									: "Cadastrar regra"
							}
							showCancel
							onCancel={fecharDialogFormulario}
							cancelLabel="Cancelar"
						/>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={excluirDialogAberto}
				onOpenChange={(aberto) => {
					setExcluirDialogAberto(aberto);
					if (!aberto) setRegistroExclusao(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir regra de parametrização?</AlertDialogTitle>
						<AlertDialogDescription>
							Deseja realmente excluir esta regra
							{registroExclusao?.codigocfopentrada
								? ` (CFOP ${registroExclusao.codigocfopentrada})`
								: ""}
							? Esta ação é irreversível e não poderá ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmarExclusao}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{excluirMutation.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
