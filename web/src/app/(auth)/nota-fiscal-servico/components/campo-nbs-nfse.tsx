"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field";
import { NFSE_NBS_LISTA } from "@/constants/nfse-emissao";

type CampoNbsNfseProps = {
	value?: string;
	onChange: (codigo: string) => void;
	error?: { message?: string };
};

export function CampoNbsNfse({ value, onChange, error }: CampoNbsNfseProps) {
	const opcoes = useMemo<{ value: string; label: string }[]>(() => {
		const base: { value: string; label: string }[] = NFSE_NBS_LISTA.map((item) => ({
			value: item.codigo,
			label: `${item.codigo} — ${item.descricao}`,
		}));

		if (value && !base.some((b) => b.value === value)) {
			base.push({
				value,
				label: `${value} — Personalizado`,
			});
		}

		return base;
	}, [value]);

	const nbsSelecionado = NFSE_NBS_LISTA.find((item) => item.codigo === value);

	return (
		<div className="space-y-1">
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(val) => onChange(val.replace(/\D/g, ""))}
				placeholder="Buscar NBS por nome ou código..."
				searchPlaceholder="Digite nome do serviço (ex: suporte, software, manutenção)..."
				emptyMessage="Nenhum código NBS encontrado."
			/>
			{nbsSelecionado ? (
				<p className="text-xs text-muted-foreground flex items-center gap-1.5">
					<span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70" />
					<span className="font-medium">{nbsSelecionado.categoria}:</span>{" "}
					{nbsSelecionado.descricao}
				</p>
			) : null}
			<FieldError errors={error ? [{ message: error.message }] : []} />
		</div>
	);
}
