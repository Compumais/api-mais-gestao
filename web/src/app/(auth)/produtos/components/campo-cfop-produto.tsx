"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	cfopService,
	type Cfop,
	type TipoMovimentoCfop,
} from "@/services/cfop.service";

type CampoCfopProdutoProps = {
	id: string;
	label: string;
	value?: string | null;
	tipomovimento: TipoMovimentoCfop;
	onChange: (idcfop: string, cfop?: Cfop | null) => void;
	erro?: string | undefined;
};

function formatarLabel(codigo: string | null, descricao: string | null) {
	if (codigo && descricao) return `${codigo} - ${descricao}`;
	return descricao ?? codigo ?? "Sem descrição";
}

export function CampoCfopProduto({
	id,
	label,
	value,
	tipomovimento,
	onChange,
	erro,
}: CampoCfopProdutoProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [rotuloSelecionado, setRotuloSelecionado] = useState<string | null>(
		null,
	);

	const { data: cfops = [], isLoading } = useQuery({
		queryKey: ["cfops", empresa?.id, tipomovimento, "produto"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return cfopService.listarTodos({
				idempresa: empresa.id,
				tipomovimento,
			});
		},
		enabled: !!empresa,
	});

	useEffect(() => {
		if (!value) {
			setRotuloSelecionado(null);
			return;
		}

		const cfop = cfops.find((item) => item.id === value);
		if (cfop) {
			setRotuloSelecionado(formatarLabel(cfop.codigo, cfop.descricao));
		}
	}, [value, cfops]);

	const opcoes = useMemo(() => {
		const base = cfops.map((cfop) => ({
			value: cfop.id,
			label: formatarLabel(cfop.codigo, cfop.descricao),
		}));

		if (value && rotuloSelecionado && !base.some((o) => o.value === value)) {
			return [{ value, label: rotuloSelecionado }, ...base];
		}

		return base;
	}, [cfops, value, rotuloSelecionado]);

	return (
		<Field data-invalid={!!erro}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(idSelecionado) => {
					const cfop =
						cfops.find((item) => item.id === idSelecionado) ?? null;
					if (cfop) {
						setRotuloSelecionado(
							formatarLabel(cfop.codigo, cfop.descricao),
						);
					} else if (!idSelecionado) {
						setRotuloSelecionado(null);
					}
					onChange(idSelecionado, cfop);
				}}
				placeholder={isLoading ? "Carregando..." : "Selecione o CFOP"}
				searchPlaceholder="Buscar CFOP..."
				emptyMessage="Nenhum CFOP encontrado"
			/>
			<FieldError errors={erro ? [{ message: erro }] : []} />
		</Field>
	);
}
