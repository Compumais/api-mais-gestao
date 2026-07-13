"use client";

import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import { type TipoMovimentoCfop, cfopService } from "@/services/cfop.service";

type CampoCfopImportacaoProps = {
	id?: string;
	label?: string;
	value?: string;
	codigoXml?: string;
	tipomovimento?: TipoMovimentoCfop;
	onChange: (idcfop: string, codigo?: string) => void;
};

function formatarLabel(codigo: string | null, descricao: string | null) {
	if (codigo && descricao) return `${codigo} - ${descricao}`;
	return descricao ?? codigo ?? "Sem descrição";
}

export function CampoCfopImportacao({
	id = "idcfop",
	label = "CFOP",
	value,
	codigoXml,
	tipomovimento = "E",
	onChange,
}: CampoCfopImportacaoProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: cfops = [], isLoading } = useQuery({
		queryKey: ["cfops", empresa?.id, tipomovimento, "importacao"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");

			return cfopService.listarTodos({
				idempresa: empresa.id,
				tipomovimento,
			});
		},
		enabled: !!empresa,
	});

	const opcoes = cfops.map((cfop) => ({
		value: cfop.id,
		label: formatarLabel(cfop.codigo, cfop.descricao),
	}));

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Combobox
				options={opcoes}
				value={value ?? ""}
				onChange={(novoValor) => {
					const cfopSelecionado = cfops.find((c) => c.id === novoValor);
					onChange(novoValor, cfopSelecionado?.codigo ?? undefined);
				}}
				placeholder={isLoading ? "Carregando..." : "Selecione CFOP de entrada"}
				searchPlaceholder="Buscar CFOP..."
				emptyMessage="Nenhum CFOP encontrado"
			/>
			{codigoXml ? (
				<p className="text-xs text-muted-foreground mt-1">
					CFOP no XML (histórico):{" "}
					<span className="font-mono font-medium">{codigoXml}</span>
				</p>
			) : null}
		</Field>
	);
}
