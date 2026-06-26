"use client";

import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { cfopService } from "@/services/cfop.service";

type CelulaCfopEntradaImportacaoProps = {
	idempresa: string;
	idcfop?: string;
	cfopXml?: string;
	disabled?: boolean;
	onChange: (idcfop: string, codigo?: string) => void;
};

function formatarLabel(codigo: string | null, descricao: string | null) {
	if (codigo && descricao) return `${codigo} - ${descricao}`;
	return descricao ?? codigo ?? "Sem descrição";
}

export function CelulaCfopEntradaImportacao({
	idempresa,
	idcfop,
	cfopXml,
	disabled = false,
	onChange,
}: CelulaCfopEntradaImportacaoProps) {
	const { data: cfops = [], isLoading } = useQuery({
		queryKey: ["cfops", idempresa, "E", "importacao"],
		queryFn: () =>
			cfopService.listarTodos({
				idempresa,
				tipomovimento: "E",
			}),
		enabled: !!idempresa,
	});

	const opcoes = cfops.map((cfop) => ({
		value: cfop.id,
		label: formatarLabel(cfop.codigo, cfop.descricao),
	}));

	const codigoSelecionado = idcfop
		? cfops.find((c) => c.id === idcfop)?.codigo
		: undefined;

	return (
		<div className="min-w-[150px] max-w-[200px] space-y-0.5">
			<Combobox
				className="text-xs"
				options={opcoes}
				value={idcfop ?? ""}
				onChange={(novoValor) => {
					const cfopSelecionado = cfops.find((c) => c.id === novoValor);
					onChange(novoValor, cfopSelecionado?.codigo ?? undefined);
				}}
				placeholder={
					isLoading ? "Carregando..." : codigoSelecionado ?? cfopXml ?? "Selecione"
				}
				searchPlaceholder="Buscar CFOP..."
				emptyMessage="Nenhum CFOP encontrado"
				disabled={disabled || isLoading}
			/>
			{cfopXml ? (
				<p className="text-[10px] leading-tight text-muted-foreground">
					XML: <span className="font-mono">{cfopXml}</span>
				</p>
			) : null}
		</div>
	);
}
