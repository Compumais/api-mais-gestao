"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field";
import { servicosNfseService } from "@/services/servicos-nfse.service";

type CampoItemLc116NfseProps = {
	value?: string;
	onChange: (codigo: string) => void;
	onDescricaoSugerida?: (descricao: string) => void;
	error?: { message?: string };
};

function formatarLabel(codigo: string, descricao: string) {
	return `${codigo} — ${descricao}`;
}

export function CampoItemLc116Nfse({
	value,
	onChange,
	onDescricaoSugerida,
	error,
}: CampoItemLc116NfseProps) {
	const { data: servicos = [], isLoading } = useQuery({
		queryKey: ["servicos-nfse-lc116"],
		queryFn: () => servicosNfseService.listarTodos(),
		staleTime: 1000 * 60 * 60,
	});

	const opcoes = useMemo(
		() =>
			servicos.map((servico) => ({
				value: servico.codigo,
				label: formatarLabel(servico.codigo, servico.descricao),
			})),
		[servicos],
	);

	const servicoSelecionado = useMemo(
		() => servicos.find((servico) => servico.codigo === value),
		[servicos, value],
	);

	return (
		<div className="space-y-2">
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(codigo) => {
					onChange(codigo);
					const servico = servicos.find((item) => item.codigo === codigo);
					if (servico && onDescricaoSugerida) {
						onDescricaoSugerida(servico.descricao);
					}
				}}
				placeholder={
					isLoading ? "Carregando itens LC 116..." : "Selecionar item LC 116..."
				}
				searchPlaceholder="Buscar por código ou descrição..."
				emptyMessage="Nenhum item LC 116 encontrado."
				disabled={isLoading}
			/>
			<FieldError errors={error ? [{ message: error.message }] : []} />
			{servicoSelecionado ? (
				<p className="text-sm text-muted-foreground">
					{servicoSelecionado.descricao}
				</p>
			) : null}
		</div>
	);
}
