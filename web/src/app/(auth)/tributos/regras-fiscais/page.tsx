"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconHistory, IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	type RegraFiscalFormData,
	regraFiscalFormSchema,
} from "@/schemas/regra-fiscal.schema";
import {
	type RegraFiscal,
	regrasFiscaisService,
} from "@/services/regras-fiscais.service";

const VALORES_PADRAO: RegraFiscalFormData = {
	ruleid: "",
	descricao: "",
	prioridade: 100,
	vigenciainicio: "2006-01-01",
	vigenciafim: "",
	condicoesJson: '{"escopo":"operacao"}',
	resultadoJson: '{"st_aplicavel":null,"difal_aplicavel":null,"fcp_aplicavel":null}',
	fontesJson: '[{"orgao":"","url":"","tipo":""}]',
};

function parseJsonCampo(texto: string, rotulo: string): unknown {
	try {
		return JSON.parse(texto) as unknown;
	} catch {
		throw new Error(`${rotulo} não é um JSON válido`);
	}
}

export default function RegrasFiscaisPage() {
	const queryClient = useQueryClient();
	const [pagina, setPagina] = useState(1);
	const [busca, setBusca] = useState("");
	const [dialogAberto, setDialogAberto] = useState(false);
	const [registroEdicao, setRegistroEdicao] = useState<RegraFiscal | null>(null);

	const form = useForm<RegraFiscalFormData>({
		resolver: zodResolver(regraFiscalFormSchema),
		defaultValues: VALORES_PADRAO,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["regras-fiscais", pagina, busca],
		queryFn: () =>
			regrasFiscaisService.listar({
				page: pagina,
				limit: 20,
				busca: busca || undefined,
			}),
	});

	const salvarMutation = useMutation({
		mutationFn: async (dados: RegraFiscalFormData) => {
			const payload = {
				ruleid: dados.ruleid,
				descricao: dados.descricao,
				prioridade: dados.prioridade,
				vigenciainicio: dados.vigenciainicio,
				vigenciafim: dados.vigenciafim || null,
				condicoes: parseJsonCampo(dados.condicoesJson, "Condições") as Record<
					string,
					unknown
				>,
				resultado: parseJsonCampo(dados.resultadoJson, "Resultado") as Record<
					string,
					unknown
				>,
				fontes: parseJsonCampo(dados.fontesJson, "Fontes") as unknown[],
			};
			if (registroEdicao) {
				return regrasFiscaisService.atualizar(registroEdicao.id, payload);
			}
			return regrasFiscaisService.criar(payload);
		},
		onSuccess: () => {
			toast.success(registroEdicao ? "Regra atualizada" : "Regra criada");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
			setDialogAberto(false);
			setRegistroEdicao(null);
			form.reset(VALORES_PADRAO);
		},
		onError: (erro: Error) => {
			toast.error(erro.message);
		},
	});

	const validarMutation = useMutation({
		mutationFn: (id: string) => regrasFiscaisService.validar(id),
		onSuccess: () => {
			toast.success("Regra validada com fonte oficial");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const rollbackMutation = useMutation({
		mutationFn: async (registro: RegraFiscal) => {
			const historico = await regrasFiscaisService.historico(registro.id);
			const anterior = historico.data.find(
				(item) => item.versao === registro.versao - 1,
			);
			if (!anterior) {
				throw new Error("Não há versão anterior para rollback");
			}
			return regrasFiscaisService.rollback(registro.id, anterior.versao);
		},
		onSuccess: () => {
			toast.success("Versão anterior restaurada (pendente de nova validação)");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	function abrirNovo() {
		setRegistroEdicao(null);
		form.reset(VALORES_PADRAO);
		setDialogAberto(true);
	}

	function abrirEdicao(registro: RegraFiscal) {
		setRegistroEdicao(registro);
		form.reset({
			ruleid: registro.ruleid,
			descricao: registro.descricao,
			prioridade: registro.prioridade,
			vigenciainicio: registro.vigenciainicio.slice(0, 10),
			vigenciafim: registro.vigenciafim?.slice(0, 10) ?? "",
			condicoesJson: JSON.stringify(registro.condicoes, null, 2),
			resultadoJson: JSON.stringify(registro.resultado, null, 2),
			fontesJson: JSON.stringify(registro.fontes, null, 2),
		});
		setDialogAberto(true);
	}

	const registros = data?.data ?? [];

	return (
		<main className="px-4 space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Regras fiscais</h1>
					<p className="text-muted-foreground text-sm">
						Catálogo versionado com fonte e vigência. Sem regra validada o
						emissor bloqueia ST/DIFAL não confirmados.
					</p>
				</div>
				<Button type="button" onClick={abrirNovo}>
					<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
					Nova regra
				</Button>
			</header>

			<Input
				placeholder="Buscar por rule_id ou descrição"
				value={busca}
				onChange={(evento) => {
					setBusca(evento.target.value);
					setPagina(1);
				}}
			/>

			{isLoading ? (
				<TableSkeleton />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ID</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Vigência</TableHead>
							<TableHead>Versão</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{registros.map((registro) => (
							<TableRow key={registro.id}>
								<TableCell className="font-mono text-xs">
									{registro.ruleid}
								</TableCell>
								<TableCell>{registro.descricao}</TableCell>
								<TableCell>{registro.status}</TableCell>
								<TableCell className="text-xs">
									{registro.vigenciainicio.slice(0, 10)}
									{registro.vigenciafim
										? ` → ${registro.vigenciafim.slice(0, 10)}`
										: ""}
								</TableCell>
								<TableCell>{registro.versao}</TableCell>
								<TableCell className="space-x-2 text-right">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => abrirEdicao(registro)}
									>
										Editar
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => validarMutation.mutate(registro.id)}
										disabled={registro.status === "validado"}
									>
										<IconCheck className="mr-1 h-4 w-4" aria-hidden="true" />
										Validar
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => rollbackMutation.mutate(registro)}
										disabled={registro.versao <= 1}
									>
										<IconHistory className="mr-1 h-4 w-4" aria-hidden="true" />
										Rollback
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{data?.paginacao && data.paginacao.totalPages > 1 && (
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={pagina <= 1}
						onClick={() => setPagina((atual) => atual - 1)}
					>
						Anterior
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={pagina >= data.paginacao.totalPages}
						onClick={() => setPagina((atual) => atual + 1)}
					>
						Próxima
					</Button>
				</div>
			)}

			<Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{registroEdicao ? "Editar regra fiscal" : "Nova regra fiscal"}
						</DialogTitle>
					</DialogHeader>
					<form
						className="space-y-3"
						onSubmit={form.handleSubmit((dados) =>
							salvarMutation.mutate(dados),
						)}
					>
						<div className="space-y-1">
							<Label htmlFor="ruleid">rule_id</Label>
							<Input id="ruleid" {...form.register("ruleid")} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="descricao">Descrição</Label>
							<Input id="descricao" {...form.register("descricao")} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="prioridade">Prioridade</Label>
								<Input
									id="prioridade"
									type="number"
									{...form.register("prioridade")}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="vigenciainicio">Vigência início</Label>
								<Input id="vigenciainicio" {...form.register("vigenciainicio")} />
							</div>
						</div>
						<div className="space-y-1">
							<Label htmlFor="vigenciafim">Vigência fim (opcional)</Label>
							<Input id="vigenciafim" {...form.register("vigenciafim")} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="condicoesJson">Condições (JSON)</Label>
							<Textarea id="condicoesJson" rows={5} {...form.register("condicoesJson")} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="resultadoJson">Resultado (JSON)</Label>
							<Textarea id="resultadoJson" rows={4} {...form.register("resultadoJson")} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="fontesJson">Fontes oficiais (JSON)</Label>
							<Textarea id="fontesJson" rows={4} {...form.register("fontesJson")} />
						</div>
						<Button type="submit" disabled={salvarMutation.isPending}>
							Salvar
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</main>
	);
}
