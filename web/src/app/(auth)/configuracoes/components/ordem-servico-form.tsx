"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ORDEM_SERVICO_CAMPOS_EXTRA } from "@/constants/ordem-servico-status";
import { useAuth } from "@/hooks/use-auth";
import {
	useAtualizarConfiguracaoOrdemServico,
	useAtualizarTipoOrdemServicoEvento,
	useConfiguracaoOrdemServico,
	useInativarTipoOrdemServicoEvento,
	useTiposOrdemServicoEvento,
} from "@/hooks/use-ordem-servico";
import { hasPerfil } from "@/lib/perfis";
import {
	type ConfiguracaoOrdemServicoFormData,
	configuracaoOrdemServicoFormSchema,
} from "@/schemas/ordem-servico.schema";
import { cfopService } from "@/services/cfop.service";
import type { CampoExtraOrdemServico } from "@/services/ordem-servico.service";

type OrdemServicoConfigFormProps = {
	idempresa: string;
};

export function OrdemServicoConfigForm({
	idempresa,
}: OrdemServicoConfigFormProps) {
	const idBase = useId();
	const idDesc = `${idBase}-desc`;
	const idChave = `${idBase}-chave`;
	const idMascara = `${idBase}-mascara`;
	const { user } = useAuth();
	const podeEditar =
		hasPerfil(user?.perfil, "proprietario") || hasPerfil(user?.perfil, "super");

	const { data: config, isLoading } = useConfiguracaoOrdemServico(idempresa);
	const { data: tipos = [] } = useTiposOrdemServicoEvento(idempresa, false);
	const atualizarConfig = useAtualizarConfiguracaoOrdemServico();
	const atualizarTipo = useAtualizarTipoOrdemServicoEvento();
	const inativarTipo = useInativarTipoOrdemServicoEvento();

	const [extras, setExtras] = useState<CampoExtraOrdemServico[]>([]);

	const form = useForm<ConfiguracaoOrdemServicoFormData>({
		resolver: zodResolver(configuracaoOrdemServicoFormSchema),
		defaultValues: {
			agrupafinanceiroaofaturar: 0,
			mostrarcamposfinalizaritem: 0,
			pedirprimeiroobjeto: 0,
			tecnicoobrigatorio: 0,
			usadadosveiculo: 1,
		},
	});

	const { data: cfops = [] } = useQuery({
		queryKey: ["cfops-config-os", idempresa],
		queryFn: () => cfopService.listarTodos({ idempresa, tipomovimento: "S" }),
		enabled: !!idempresa,
	});

	const opcoesCfop = useMemo(
		() =>
			cfops.map((cfop) => ({
				value: cfop.id,
				label: `${cfop.codigo ?? ""} — ${cfop.descricao ?? ""}`,
			})),
		[cfops],
	);

	useEffect(() => {
		if (!config) return;
		form.reset({
			agrupafinanceiroaofaturar: config.agrupafinanceiroaofaturar ?? 0,
			descricao: config.descricao,
			descricaocampochave: config.descricaocampochave,
			mascaracampochave: config.mascaracampochave,
			mostrarcamposfinalizaritem: config.mostrarcamposfinalizaritem ?? 0,
			pedirprimeiroobjeto: config.pedirprimeiroobjeto ?? 0,
			tecnicoobrigatorio: config.tecnicoobrigatorio ?? 0,
			usadadosveiculo: config.usadadosveiculo ?? 1,
			idcfopexternaproduto: config.idcfopexternaproduto,
			idcfopexternaservico: config.idcfopexternaservico,
			idcfopexternaservicost: config.idcfopexternaservicost,
			idcfopinternaproduto: config.idcfopinternaproduto,
			idcfopinternaservico: config.idcfopinternaservico,
			idcfopinternaservicost: config.idcfopinternaservicost,
			idmodelnfe: config.idmodelnfe,
			idmodelonfse: config.idmodelonfse,
		});
		setExtras(config.camposextras ?? []);
	}, [config, form]);

	function upsertExtra(campo: (typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number]) {
		setExtras((atual) => {
			const existente = atual.find((item) => item.campo === campo);
			if (existente) return atual;
			return [
				...atual,
				{
					campo,
					nome: `Campo ${campo.replace("extra", "")}`,
					ativo: true,
					obrigatorio: false,
				},
			];
		});
	}

	async function salvarConfig(dados: ConfiguracaoOrdemServicoFormData) {
		if (!podeEditar) {
			toast.error("Apenas proprietário ou super pode editar esta configuração");
			return;
		}
		try {
			await atualizarConfig.mutateAsync({
				idempresa,
				dados: {
					...dados,
					camposextras: extras,
					camposExtras: extras,
				},
			});
			toast.success("Configuração de ordem de serviço salva");
		} catch (erro) {
			toast.error("Erro ao salvar configuração", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	async function salvarTipo(
		tipoId: string,
		patch: {
			descricao: string;
			cor: string;
			ordem: number;
			ativo: number;
		},
	) {
		if (!podeEditar) {
			toast.error("Apenas proprietário ou super pode personalizar status");
			return;
		}
		try {
			await atualizarTipo.mutateAsync({
				id: tipoId,
				dados: { idempresa, ...patch },
			});
			toast.success("Status atualizado");
		} catch (erro) {
			toast.error("Erro ao atualizar status", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	if (isLoading) {
		return <p className="text-sm text-muted-foreground">Carregando...</p>;
	}

	return (
		<div className="space-y-8">
			{!podeEditar && (
				<div
					className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
					aria-live="polite"
				>
					Você pode visualizar esta configuração, mas apenas proprietário ou
					super pode alterá-la.
				</div>
			)}

			<form
				className="space-y-4"
				onSubmit={form.handleSubmit((dados) => void salvarConfig(dados))}
			>
				<FieldGroup>
					<FieldSet>
						<FieldLegend>Opções gerais</FieldLegend>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={idDesc}>Descrição</FieldLabel>
								<Input
									id={idDesc}
									disabled={!podeEditar}
									{...form.register("descricao")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idChave}>Descrição campo chave</FieldLabel>
								<Input
									id={idChave}
									disabled={!podeEditar}
									{...form.register("descricaocampochave")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={idMascara}>Máscara campo chave</FieldLabel>
								<Input
									id={idMascara}
									disabled={!podeEditar}
									{...form.register("mascaracampochave")}
								/>
							</Field>
						</div>
						<div className="mt-4 flex flex-col gap-3">
							{(
								[
									["tecnicoobrigatorio", "Técnico obrigatório nos itens"],
									["pedirprimeiroobjeto", "Exigir objeto na abertura"],
									[
										"mostrarcamposfinalizaritem",
										"Mostrar campos ao finalizar item",
									],
									[
										"agrupafinanceiroaofaturar",
										"Agrupar financeiro ao faturar",
									],
									[
										"usadadosveiculo",
										"Utiliza dados de veículo na ordem de serviço",
									],
								] as const
							).map(([nome, label]) => (
								<div key={nome} className="flex items-center gap-2">
									<Controller
										control={form.control}
										name={nome}
										render={({ field }) => (
											<Checkbox
												id={`${idBase}-${nome}`}
												checked={field.value === 1}
												disabled={!podeEditar}
												onCheckedChange={(v) => field.onChange(v ? 1 : 0)}
											/>
										)}
									/>
									<FieldLabel
										htmlFor={`${idBase}-${nome}`}
										className="font-normal"
									>
										{label}
									</FieldLabel>
								</div>
							))}
						</div>
					</FieldSet>

					<FieldSet>
						<FieldLegend>CFOPs padrão</FieldLegend>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{(
								[
									["idcfopinternaproduto", "CFOP interna produto"],
									["idcfopexternaproduto", "CFOP externa produto"],
									["idcfopinternaservico", "CFOP interna serviço"],
									["idcfopexternaservico", "CFOP externa serviço"],
									["idcfopinternaservicost", "CFOP interna serviço ST"],
									["idcfopexternaservicost", "CFOP externa serviço ST"],
								] as const
							).map(([nome, label]) => (
								<Field key={nome}>
									<FieldLabel>{label}</FieldLabel>
									<Controller
										control={form.control}
										name={nome}
										render={({ field }) => (
											<Combobox
												options={opcoesCfop}
												value={field.value ?? ""}
												onChange={(value) => field.onChange(value || null)}
												placeholder="Selecione"
												searchPlaceholder="Buscar CFOP..."
												emptyMessage="Nenhum CFOP encontrado."
												disabled={!podeEditar}
											/>
										)}
									/>
								</Field>
							))}
						</div>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Campos extras (extra1…extra16)</FieldLegend>
						<p className="mb-3 text-sm text-muted-foreground">
							O nome físico da coluna nunca muda; apenas o rótulo exibido na OS.
						</p>
						<div className="mb-3 flex flex-wrap gap-2">
							{ORDEM_SERVICO_CAMPOS_EXTRA.map((campo) => (
								<Button
									key={campo}
									type="button"
									size="sm"
									variant="outline"
									disabled={
										!podeEditar || extras.some((e) => e.campo === campo)
									}
									onClick={() => upsertExtra(campo)}
								>
									+ {campo}
								</Button>
							))}
						</div>
						<div className="space-y-3">
							{extras.map((extra, index) => (
								<div
									key={extra.campo}
									className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4"
								>
									<div className="text-sm font-medium">{extra.campo}</div>
									<Input
										value={extra.nome}
										disabled={!podeEditar}
										onChange={(e) =>
											setExtras((atual) =>
												atual.map((item, i) =>
													i === index
														? { ...item, nome: e.target.value }
														: item,
												),
											)
										}
										placeholder="Nome exibido"
									/>
									<div className="flex items-center gap-2">
										<Checkbox
											checked={extra.ativo}
											disabled={!podeEditar}
											onCheckedChange={(v) =>
												setExtras((atual) =>
													atual.map((item, i) =>
														i === index ? { ...item, ativo: !!v } : item,
													),
												)
											}
										/>
										<span className="text-sm">Ativo</span>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											checked={extra.obrigatorio}
											disabled={!podeEditar}
											onCheckedChange={(v) =>
												setExtras((atual) =>
													atual.map((item, i) =>
														i === index ? { ...item, obrigatorio: !!v } : item,
													),
												)
											}
										/>
										<span className="text-sm">Obrigatório</span>
									</div>
								</div>
							))}
						</div>
					</FieldSet>
				</FieldGroup>

				{podeEditar && (
					<Button type="submit" disabled={atualizarConfig.isPending}>
						{atualizarConfig.isPending ? "Salvando..." : "Salvar configuração"}
					</Button>
				)}
			</form>

			<div className="space-y-3">
				<div>
					<h3 className="text-lg font-semibold">
						Status / eventos personalizados
					</h3>
					<p className="text-sm text-muted-foreground">
						O código interno e a semântica do status não podem ser alterados.
					</p>
				</div>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Nome</TableHead>
								<TableHead>Cor</TableHead>
								<TableHead>Ordem</TableHead>
								<TableHead>Ativo</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{tipos
								.slice()
								.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
								.map((tipo) => (
									<TipoEventoLinha
										key={tipo.id}
										tipoId={tipo.id}
										codigo={tipo.codigo}
										descricao={tipo.descricao ?? ""}
										cor={tipo.cor ?? "#FFFFFF"}
										ordem={tipo.ordem ?? 0}
										ativo={tipo.ativo ?? 1}
										podeEditar={podeEditar}
										onSalvar={(patch) => void salvarTipo(tipo.id, patch)}
										onInativar={() => {
											if (!podeEditar) return;
											void inativarTipo
												.mutateAsync({ id: tipo.id, idempresa })
												.then(() => toast.success("Status inativado"))
												.catch((erro: unknown) =>
													toast.error("Erro ao inativar", {
														description:
															erro instanceof Error
																? erro.message
																: "Erro desconhecido",
													}),
												);
										}}
									/>
								))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}

function TipoEventoLinha({
	codigo,
	descricao,
	cor,
	ordem,
	ativo,
	podeEditar,
	onSalvar,
	onInativar,
}: {
	tipoId: string;
	codigo: string;
	descricao: string;
	cor: string;
	ordem: number;
	ativo: number;
	podeEditar: boolean;
	onSalvar: (patch: {
		descricao: string;
		cor: string;
		ordem: number;
		ativo: number;
	}) => void;
	onInativar: () => void;
}) {
	const [nome, setNome] = useState(descricao);
	const [corLocal, setCorLocal] = useState(cor);
	const [ordemLocal, setOrdemLocal] = useState(String(ordem));
	const [ativoLocal, setAtivoLocal] = useState(ativo === 1);

	useEffect(() => {
		setNome(descricao);
		setCorLocal(cor);
		setOrdemLocal(String(ordem));
		setAtivoLocal(ativo === 1);
	}, [descricao, cor, ordem, ativo]);

	return (
		<TableRow>
			<TableCell className="font-mono text-xs">{codigo}</TableCell>
			<TableCell>
				<Input
					value={nome}
					disabled={!podeEditar}
					onChange={(e) => setNome(e.target.value)}
				/>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Input
						type="color"
						className="h-9 w-12 p-1"
						value={corLocal}
						disabled={!podeEditar}
						onChange={(e) => setCorLocal(e.target.value.toUpperCase())}
						aria-label={`Cor do status ${codigo}`}
					/>
					<Input
						value={corLocal}
						disabled={!podeEditar}
						onChange={(e) => setCorLocal(e.target.value.toUpperCase())}
						className="w-28 font-mono text-xs"
					/>
				</div>
			</TableCell>
			<TableCell>
				<Input
					type="number"
					value={ordemLocal}
					disabled={!podeEditar}
					onChange={(e) => setOrdemLocal(e.target.value)}
					className="w-20"
				/>
			</TableCell>
			<TableCell>
				<Checkbox
					checked={ativoLocal}
					disabled={!podeEditar}
					onCheckedChange={(v) => setAtivoLocal(!!v)}
					aria-label={`Ativar status ${codigo}`}
				/>
			</TableCell>
			<TableCell className="text-right">
				{podeEditar && (
					<div className="flex justify-end gap-1">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() =>
								onSalvar({
									descricao: nome,
									cor: corLocal,
									ordem: Number(ordemLocal) || 0,
									ativo: ativoLocal ? 1 : 0,
								})
							}
						>
							Salvar
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={onInativar}
						>
							Inativar
						</Button>
					</div>
				)}
			</TableCell>
		</TableRow>
	);
}
