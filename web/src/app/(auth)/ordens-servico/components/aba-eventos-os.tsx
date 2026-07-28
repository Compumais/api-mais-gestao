"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	useOrdemServicoEventos,
	useRegistrarEventoOrdemServico,
} from "@/hooks/use-ordem-servico";
import {
	type OrdemServicoEventoFormData,
	ordemServicoEventoFormSchema,
} from "@/schemas/ordem-servico.schema";
import type { TipoOrdemServicoEvento } from "@/services/ordem-servico.service";
import {
	filtrarTiposTransicao,
	formatarDataHoraOs,
	obterTipoPorStatus,
} from "@/util/ordem-servico-ui";
import { OrdemServicoStatusBadge } from "./ordem-servico-status-badge";

type AbaEventosOsProps = {
	ordemServicoId: string;
	idempresa: string;
	statusAtual: number | null | undefined;
	tipos: TipoOrdemServicoEvento[];
	opcoesTecnicosUsuarios: Array<{ value: string; label: string }>;
	desabilitado?: boolean;
};

export function AbaEventosOs({
	ordemServicoId,
	idempresa,
	statusAtual,
	tipos,
	opcoesTecnicosUsuarios,
	desabilitado = false,
}: AbaEventosOsProps) {
	const idBase = useId();
	const idDesc = `${idBase}-desc`;
	const idContato = `${idBase}-contato`;
	const { data: eventos = [], isLoading } = useOrdemServicoEventos(
		ordemServicoId,
		idempresa,
	);
	const registrar = useRegistrarEventoOrdemServico(ordemServicoId);
	const [aberto, setAberto] = useState(false);

	const tiposDisponiveis = useMemo(
		() => filtrarTiposTransicao(tipos, statusAtual),
		[tipos, statusAtual],
	);

	const mapaTipos = useMemo(() => {
		const mapa = new Map<string, TipoOrdemServicoEvento>();
		for (const tipo of tipos) mapa.set(tipo.id, tipo);
		return mapa;
	}, [tipos]);

	const form = useForm<OrdemServicoEventoFormData>({
		resolver: zodResolver(ordemServicoEventoFormSchema),
		defaultValues: {
			idtipoevento: "",
			descricao: "",
			idtecnicode: "",
			idtecnicopara: "",
			nomecontato: "",
		},
	});

	async function onSubmit(dados: OrdemServicoEventoFormData) {
		try {
			await registrar.mutateAsync({
				idempresa,
				idtipoevento: dados.idtipoevento,
				descricao: dados.descricao,
				idtecnicode: dados.idtecnicode || undefined,
				idtecnicopara: dados.idtecnicopara || undefined,
				nomecontato: dados.nomecontato || undefined,
			});
			toast.success("Evento registrado");
			setAberto(false);
			form.reset({
				idtipoevento: "",
				descricao: "",
				idtecnicode: "",
				idtecnicopara: "",
				nomecontato: "",
			});
		} catch (erro) {
			toast.error("Erro ao registrar evento", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="text-lg font-semibold">Timeline de eventos</h2>
					<p className="text-sm text-muted-foreground">
						Status atual:{" "}
						<OrdemServicoStatusBadge status={statusAtual} tipos={tipos} />
					</p>
				</div>
				{!desabilitado && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setAberto(true)}
					>
						<Plus className="h-4 w-4" />
						Registrar evento
					</Button>
				)}
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Carregando eventos...</p>
			) : eventos.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhum evento registrado.
				</p>
			) : (
				<ol className="space-y-3">
					{eventos.map((evento) => {
						const tipo = evento.idtipoevento
							? mapaTipos.get(evento.idtipoevento)
							: undefined;
						return (
							<li key={evento.id} className="rounded-md border p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="font-medium">
										{tipo?.descricao ?? "Evento"}
									</div>
									<span className="text-xs text-muted-foreground">
										{formatarDataHoraOs(evento.datacriacao)}
									</span>
								</div>
								<p className="mt-1 text-sm">{evento.descricao}</p>
								{evento.nomecontato && (
									<p className="mt-1 text-xs text-muted-foreground">
										Contato: {evento.nomecontato}
									</p>
								)}
							</li>
						);
					})}
				</ol>
			)}

			<Dialog open={aberto} onOpenChange={setAberto}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Registrar evento / status</DialogTitle>
					</DialogHeader>
					<form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
						<Field>
							<FieldLabel>Novo status</FieldLabel>
							<Controller
								control={form.control}
								name="idtipoevento"
								render={({ field }) => (
									<Combobox
										options={tiposDisponiveis.map((tipo) => ({
											value: tipo.id,
											label: tipo.descricao ?? tipo.codigo,
										}))}
										value={field.value}
										onChange={(value) => {
											field.onChange(value);
											const tipo = tiposDisponiveis.find((t) => t.id === value);
											if (tipo?.descricao && !form.getValues("descricao")) {
												form.setValue("descricao", tipo.descricao);
											}
										}}
										placeholder="Selecione"
										searchPlaceholder="Buscar status..."
										emptyMessage="Nenhuma transição disponível."
									/>
								)}
							/>
							{tiposDisponiveis.length === 0 && (
								<p className="text-xs text-muted-foreground">
									Não há transições válidas a partir de{" "}
									{obterTipoPorStatus(tipos, statusAtual)?.descricao ??
										"este status"}
									.
								</p>
							)}
						</Field>
						<Field>
							<FieldLabel htmlFor={idDesc}>Descrição</FieldLabel>
							<Textarea id={idDesc} rows={3} {...form.register("descricao")} />
						</Field>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<Field>
								<FieldLabel>Técnico de</FieldLabel>
								<Controller
									control={form.control}
									name="idtecnicode"
									render={({ field }) => (
										<Combobox
											options={opcoesTecnicosUsuarios}
											value={field.value ?? ""}
											onChange={field.onChange}
											placeholder="Opcional"
											searchPlaceholder="Buscar usuário..."
											emptyMessage="Nenhum usuário encontrado."
										/>
									)}
								/>
							</Field>
							<Field>
								<FieldLabel>Técnico para</FieldLabel>
								<Controller
									control={form.control}
									name="idtecnicopara"
									render={({ field }) => (
										<Combobox
											options={opcoesTecnicosUsuarios}
											value={field.value ?? ""}
											onChange={field.onChange}
											placeholder="Opcional"
											searchPlaceholder="Buscar usuário..."
											emptyMessage="Nenhum usuário encontrado."
										/>
									)}
								/>
							</Field>
						</div>
						<Field>
							<FieldLabel htmlFor={idContato}>Nome do contato</FieldLabel>
							<Input id={idContato} {...form.register("nomecontato")} />
						</Field>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAberto(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={registrar.isPending}>
								{registrar.isPending ? "Registrando..." : "Registrar"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
