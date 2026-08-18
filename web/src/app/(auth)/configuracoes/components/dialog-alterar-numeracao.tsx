"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nfeConfiguracaoService } from "@/services/nfe-configuracao.service";
import { terminalPdvService } from "@/services/terminal-pdv.service";

export type AbaNumeracao = "nfe" | "nfce";

type PendenciaConfirmacao = {
	idserie: string;
	numeroproximo: number;
	mensagem: string;
};

function ultimoNumero(registro: { ultimonumero?: number | null }) {
	const n = Number(registro.ultimonumero);
	return Number.isFinite(n) && n > 0 ? n : null;
}

function avisoNumeracao(proximo: number, ultimo: number | null): string | null {
	if (!Number.isInteger(proximo) || proximo < 1) {
		return "O próximo número deve ser um inteiro maior que zero.";
	}
	if (ultimo != null && proximo <= ultimo) {
		return `O próximo número (${proximo}) é menor ou igual ao último já usado (${ultimo}). Isso pode gerar rejeição na SEFAZ por duplicidade.`;
	}
	if (ultimo != null && proximo > ultimo + 1) {
		const inicio = ultimo + 1;
		const fim = proximo - 1;
		const faixa = inicio === fim ? `nº ${inicio}` : `nº ${inicio} a ${fim}`;
		return `Há um salto na numeração. A faixa ${faixa} precisará ser inutilizada na SEFAZ se não for emitida.`;
	}
	return null;
}

export function DialogAlterarNumeracao({
	aberto,
	onAbertoChange,
	idempresa,
	abaInicial = "nfe",
}: {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	idempresa: string;
	abaInicial?: AbaNumeracao;
}) {
	const queryClient = useQueryClient();
	const [aba, setAba] = useState<AbaNumeracao>(abaInicial);
	const [valores, setValores] = useState<Record<string, string>>({});
	const [pendencia, setPendencia] = useState<PendenciaConfirmacao | null>(null);

	useEffect(() => {
		if (aberto) {
			setAba(abaInicial);
			setPendencia(null);
		}
	}, [aberto, abaInicial]);

	const seriesQuery = useQuery({
		queryKey: ["nfe-series", idempresa, "55"],
		queryFn: () => nfeConfiguracaoService.listarSeries(idempresa, "55"),
		enabled: aberto,
	});

	const terminaisQuery = useQuery({
		queryKey: ["terminais-pdv", idempresa],
		queryFn: () => terminalPdvService.listar(idempresa),
		enabled: aberto,
	});

	const series = seriesQuery.data ?? [];
	const terminais = terminaisQuery.data ?? [];

	useEffect(() => {
		if (!aberto) return;
		const proximo: Record<string, string> = {};
		for (const serie of series) {
			proximo[serie.id] = String(serie.numeroproximo);
		}
		for (const terminal of terminais) {
			proximo[terminal.idnfeserie] = String(terminal.numeroproximo);
		}
		setValores(proximo);
	}, [aberto, series, terminais]);

	const salvarMutation = useMutation({
		mutationFn: (params: { idserie: string; numeroproximo: number }) =>
			nfeConfiguracaoService.atualizarSerie(params.idserie, {
				idempresa,
				numeroproximo: params.numeroproximo,
			}),
		onSuccess: () => {
			toast.success("Próximo número atualizado");
			setPendencia(null);
			queryClient.invalidateQueries({ queryKey: ["nfe-series", idempresa] });
			queryClient.invalidateQueries({ queryKey: ["nfce-series", idempresa] });
			queryClient.invalidateQueries({ queryKey: ["terminais-pdv", idempresa] });
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao atualizar numeração"),
	});

	function tentarSalvar(idserie: string, ultimo: number | null) {
		const numeroproximo = Number(valores[idserie]);
		const aviso = avisoNumeracao(numeroproximo, ultimo);
		if (aviso?.startsWith("O próximo número deve")) {
			toast.error(aviso);
			return;
		}
		if (aviso) {
			setPendencia({ idserie, numeroproximo, mensagem: aviso });
			return;
		}
		salvarMutation.mutate({ idserie, numeroproximo });
	}

	const carregando = seriesQuery.isLoading || terminaisQuery.isLoading;

	return (
		<>
			<Dialog open={aberto} onOpenChange={onAbertoChange}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Alterar numeração</DialogTitle>
						<DialogDescription>
							Ajuste o próximo número da NF-e (série da empresa) ou da NFC-e
							(por PDV). O PDV puxa o valor no próximo sync fiscal.
						</DialogDescription>
					</DialogHeader>

					<Tabs
						value={aba}
						onValueChange={(valor) => setAba(valor as AbaNumeracao)}
					>
						<TabsList>
							<TabsTrigger value="nfe">NF-e</TabsTrigger>
							<TabsTrigger value="nfce">NFC-e</TabsTrigger>
						</TabsList>

						<TabsContent value="nfe" className="mt-4 space-y-3">
							{carregando ? (
								<p className="text-sm text-muted-foreground">Carregando…</p>
							) : series.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhuma série de NF-e cadastrada. Cadastre em Configurações →
									NF-e.
								</p>
							) : (
								series.map((serie) => (
									<LinhaNumeracao
										key={serie.id}
										titulo={`Série ${serie.serie}${serie.padrao ? " (padrão)" : ""}`}
										ultimo={ultimoNumero(serie)}
										valor={valores[serie.id] ?? String(serie.numeroproximo)}
										onChange={(valor) =>
											setValores((prev) => ({ ...prev, [serie.id]: valor }))
										}
										salvando={salvarMutation.isPending}
										onSalvar={() => tentarSalvar(serie.id, ultimoNumero(serie))}
									/>
								))
							)}
						</TabsContent>

						<TabsContent value="nfce" className="mt-4 space-y-3">
							{carregando ? (
								<p className="text-sm text-muted-foreground">Carregando…</p>
							) : terminais.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum PDV cadastrado. Cadastre em Configurações → NFC-e.
								</p>
							) : (
								terminais.map((terminal) => (
									<LinhaNumeracao
										key={terminal.id}
										titulo={`PDV ${terminal.numeropdv}${
											terminal.descricao ? ` — ${terminal.descricao}` : ""
										} · série ${terminal.serie}`}
										ultimo={ultimoNumero(terminal)}
										valor={
											valores[terminal.idnfeserie] ??
											String(terminal.numeroproximo)
										}
										onChange={(valor) =>
											setValores((prev) => ({
												...prev,
												[terminal.idnfeserie]: valor,
											}))
										}
										salvando={salvarMutation.isPending}
										onSalvar={() =>
											tentarSalvar(terminal.idnfeserie, ultimoNumero(terminal))
										}
									/>
								))
							)}
						</TabsContent>
					</Tabs>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={pendencia != null}
				onOpenChange={(open) => {
					if (!open) setPendencia(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
						<AlertDialogDescription>
							{pendencia?.mensagem}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!pendencia) return;
								salvarMutation.mutate({
									idserie: pendencia.idserie,
									numeroproximo: pendencia.numeroproximo,
								});
							}}
						>
							Confirmar mesmo assim
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function LinhaNumeracao({
	titulo,
	ultimo,
	valor,
	onChange,
	onSalvar,
	salvando,
}: {
	titulo: string;
	ultimo: number | null;
	valor: string;
	onChange: (valor: string) => void;
	onSalvar: () => void;
	salvando: boolean;
}) {
	return (
		<div className="space-y-2 rounded-lg border p-3">
			<p className="text-sm font-medium">{titulo}</p>
			<p className="text-xs text-muted-foreground">
				Último usado: {ultimo ?? "nenhum"}
			</p>
			<div className="flex flex-wrap items-end gap-2">
				<Field className="min-w-32 flex-1">
					<FieldLabel>Próximo número</FieldLabel>
					<Input
						inputMode="numeric"
						min={1}
						type="number"
						value={valor}
						onChange={(e) => onChange(e.target.value)}
					/>
				</Field>
				<Button type="button" size="sm" disabled={salvando} onClick={onSalvar}>
					Salvar
				</Button>
			</div>
		</div>
	);
}

export function BotaoAlterarNumeracao({
	idempresa,
	abaInicial = "nfe",
}: {
	idempresa: string;
	abaInicial?: AbaNumeracao;
}) {
	const [aberto, setAberto] = useState(false);

	return (
		<>
			<Button type="button" variant="outline" onClick={() => setAberto(true)}>
				Alterar numeração
			</Button>
			<DialogAlterarNumeracao
				aberto={aberto}
				onAbertoChange={setAberto}
				idempresa={idempresa}
				abaInicial={abaInicial}
			/>
		</>
	);
}
