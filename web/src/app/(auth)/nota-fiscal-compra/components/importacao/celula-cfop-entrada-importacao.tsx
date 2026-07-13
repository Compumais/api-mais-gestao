"use client";

import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { cfopService } from "@/services/cfop.service";
import {
	mensagemInconsistenciaCfopEntrada,
	validarCoerenciaCfopEntradaItem,
} from "@/util/cfop-entrada-validacao";

type CelulaCfopEntradaImportacaoProps = {
	idempresa: string;
	idcfop?: string;
	disabled?: boolean;
	tributacao?: {
		icmsst?: string | null | undefined;
		situacaotributaria?: string | null | undefined;
		icms?: string | null | undefined;
	};
	onChange: (idcfop: string, codigo?: string) => void;
};

function formatarLabel(codigo: string | null, descricao: string | null) {
	if (codigo && descricao) return `${codigo} - ${descricao}`;
	return descricao ?? codigo ?? "Sem descrição";
}

export function CelulaCfopEntradaImportacao({
	idempresa,
	idcfop,
	disabled = false,
	tributacao,
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

	const inconsistencia = tributacao
		? validarCoerenciaCfopEntradaItem({
				idcfop,
				codigoCfopEntrada: codigoSelecionado,
				tributacao,
			})
		: null;

	const aviso = inconsistencia
		? mensagemInconsistenciaCfopEntrada(inconsistencia)
		: null;

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
					isLoading ? "Carregando..." : "Selecione CFOP de entrada"
				}
				searchPlaceholder="Buscar CFOP..."
				emptyMessage="Nenhum CFOP encontrado"
				disabled={disabled || isLoading}
			/>
			{aviso ? (
				<p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
					{aviso}
				</p>
			) : null}
		</div>
	);
}
