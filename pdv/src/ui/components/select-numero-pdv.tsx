import { Select } from "@/ui/components/ui/select";

export type TerminalPdvOpcao = {
	numeropdv: number;
	descricao: string | null;
};

export function rotuloTerminalPdv(terminal: TerminalPdvOpcao): string {
	return terminal.descricao
		? `PDV ${terminal.numeropdv} — ${terminal.descricao}`
		: `PDV ${terminal.numeropdv}`;
}

export function montarOpcoesTerminaisPdv(
	terminais: TerminalPdvOpcao[],
	valorAtual: string,
): TerminalPdvOpcao[] {
	const atual = Math.max(1, Number(valorAtual) || 1);
	const lista = [...terminais];
	if (!lista.some((item) => item.numeropdv === atual)) {
		lista.unshift({ numeropdv: atual, descricao: null });
	}
	return lista.sort((a, b) => a.numeropdv - b.numeropdv);
}

export function SelectNumeroPdv({
	id = "numeropdv",
	value,
	terminais,
	onChange,
	disabled,
}: {
	id?: string;
	value: string;
	terminais: TerminalPdvOpcao[];
	onChange: (valor: string) => void;
	disabled?: boolean;
}) {
	const opcoes = montarOpcoesTerminaisPdv(terminais, value);
	const cadastrados = terminais.length > 0;

	return (
		<>
			<Select
				id={id}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
			>
				{opcoes.map((terminal) => (
					<option key={terminal.numeropdv} value={String(terminal.numeropdv)}>
						{rotuloTerminalPdv(terminal)}
					</option>
				))}
			</Select>
			<p className="text-xs text-muted-foreground">
				{cadastrados
					? "Lista dos caixas cadastrados no retaguarda (NFC-e → Terminais PDV)."
					: "Cadastre este caixa no retaguarda (NFC-e → Terminais PDV) para aparecer na lista."}
			</p>
		</>
	);
}
