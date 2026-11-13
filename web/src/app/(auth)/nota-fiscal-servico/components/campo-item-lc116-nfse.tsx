"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field";
import { SUGESTOES_LC116_FISCAL } from "@/constants/nfse-emissao";
import { servicosNfseService } from "@/services/servicos-nfse.service";

type SugestaoFiscal = {
	cTribNac: string;
	cNbsPadrao?: string;
	cIndOpPadrao?: string;
};

type CampoItemLc116NfseProps = {
	value?: string;
	onChange: (codigo: string) => void;
	onDescricaoSugerida?: (descricao: string) => void;
	onSugestaoFiscal?: (sugestao: SugestaoFiscal) => void;
	error?: { message?: string };
};

function formatarLabel(codigo: string, descricao: string) {
	return `${codigo} — ${descricao}`;
}

export function CampoItemLc116Nfse({
	value,
	onChange,
	onDescricaoSugerida,
	onSugestaoFiscal,
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
					if (onSugestaoFiscal) {
						const prefixo = codigo.slice(0, 5);
						const sugestao =
							SUGESTOES_LC116_FISCAL[codigo] ||
							SUGESTOES_LC116_FISCAL[prefixo] || {
								cTribNac: codigo.replace(/\D/g, "").padEnd(6, "0").slice(0, 6),
							};
						onSugestaoFiscal(sugestao);
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
