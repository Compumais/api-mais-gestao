"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ResumoDestinatarioNfe } from "@/app/(auth)/nota-fiscal-venda/components/resumo-destinatario-nfe";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field";
import { entidadesService } from "@/services/entidades.service";

type CampoTomadorNfseProps = {
	idempresa: string;
	value?: string;
	onChange: (value: string | undefined) => void;
	error?: { message?: string };
};

export function CampoTomadorNfse({
	idempresa,
	value,
	onChange,
	error,
}: CampoTomadorNfseProps) {
	const { data: clientes = [], isLoading } = useQuery({
		queryKey: ["entidades-clientes-nfse", idempresa],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa,
				cliente: 1,
			}),
		enabled: !!idempresa,
	});

	const opcoes = useMemo(
		() =>
			clientes.map((e) => ({
				value: e.id,
				label: `${e.razaosocial ?? e.nome} — ${e.cnpjcpf}`,
			})),
		[clientes],
	);

	const tomadorSelecionado = useMemo(
		() => clientes.find((e) => e.id === value),
		[clientes, value],
	);

	return (
		<div className="space-y-3">
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(v) => onChange(v || undefined)}
				placeholder={
					isLoading ? "Carregando clientes..." : "Selecionar tomador..."
				}
				searchPlaceholder="Buscar por nome ou CNPJ/CPF..."
				emptyMessage="Nenhum cliente encontrado."
				disabled={isLoading}
			/>
			<FieldError errors={error ? [{ message: error.message }] : []} />
			{tomadorSelecionado ? (
				<div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
					<div className="flex items-center justify-between">
						<p className="text-xs font-medium uppercase text-muted-foreground">
							Dados do tomador
						</p>
						{(() => {
							const doc = tomadorSelecionado.cnpjcpf?.replace(/\D/g, "") ?? "";
							const cep = tomadorSelecionado.cep?.replace(/\D/g, "") ?? "";
							const temDoc = doc.length === 11 || doc.length === 14;
							const temEnd = Boolean(
								(tomadorSelecionado.idcidade || tomadorSelecionado.endereco) &&
									cep,
							);

							if (!temDoc) {
								return (
									<span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
										⚠️ CPF/CNPJ pendente
									</span>
								);
							}
							if (!temEnd) {
								return (
									<span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
										⚠️ Endereço/CEP incompleto
									</span>
								);
							}
							return (
								<span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
									✓ Cadastro apto para emissão
								</span>
							);
						})()}
					</div>
					<ResumoDestinatarioNfe dados={tomadorSelecionado} variant="compact" />
				</div>
			) : null}
		</div>
	);
}
