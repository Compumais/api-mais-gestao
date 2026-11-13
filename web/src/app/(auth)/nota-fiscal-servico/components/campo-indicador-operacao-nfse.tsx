"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field";
import { NFSE_CINDOP_OPCOES } from "@/constants/nfse-emissao";

type CampoIndicadorOperacaoNfseProps = {
	value?: string;
	onChange: (value: string) => void;
	error?: { message?: string };
};

export function CampoIndicadorOperacaoNfse({
	value,
	onChange,
	error,
}: CampoIndicadorOperacaoNfseProps) {
	const opcoes = useMemo<{ value: string; label: string }[]>(() => {
		const base: { value: string; label: string }[] = NFSE_CINDOP_OPCOES.map((op) => ({
			value: op.value,
			label: op.label,
		}));

		if (value && !base.some((b) => b.value === value)) {
			base.push({
				value,
				label: `${value} — Personalizado`,
			});
		}

		return base;
	}, [value]);

	const opcaoAtual = NFSE_CINDOP_OPCOES.find((op) => op.value === value);

	return (
		<div className="space-y-1">
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(val) => onChange(val)}
				placeholder="Selecione o indicador de operação..."
				searchPlaceholder="Buscar por código ou descrição..."
				emptyMessage="Nenhum indicador encontrado."
			/>
			{opcaoAtual ? (
				<p className="text-xs text-muted-foreground">{opcaoAtual.descricao}</p>
			) : null}
			<FieldError errors={error ? [{ message: error.message }] : []} />
		</div>
	);
}
