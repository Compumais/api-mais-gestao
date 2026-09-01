import { Select } from "@/ui/components/ui/select";

export type TerminalPdvOpcao = {
	numeropdv: number;
	descricao: string | null;
	disponivel?: boolean;
	motivo?: string;
};

export function rotuloTerminalPdv(terminal: TerminalPdvOpcao): string {
	const base = terminal.descricao
		? `PDV ${terminal.numeropdv} — ${terminal.descricao}`
		: `PDV ${terminal.numeropdv}`;
	if (terminal.disponivel === false) {
		return `${base} (${terminal.motivo ?? "indisponível"})`;
	}
	return base;
}

export function montarOpcoesTerminaisPdv(
	terminais: TerminalPdvOpcao[],
	valorAtual: string,
	opts?: { somenteDisponiveis?: boolean },
): TerminalPdvOpcao[] {
	const atual = Math.max(1, Number(valorAtual) || 1);
	let lista = [...terminais];
	if (opts?.somenteDisponiveis) {
		lista = lista.filter((item) => item.disponivel !== false);
	}
	if (
		valorAtual &&
		!lista.some((item) => item.numeropdv === atual) &&
		!opts?.somenteDisponiveis
	) {
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
	somenteDisponiveis = false,
	ajuda,
	placeholderVazio,
}: {
	id?: string;
	value: string;
	terminais: TerminalPdvOpcao[];
	onChange: (valor: string) => void;
	disabled?: boolean;
	somenteDisponiveis?: boolean;
	ajuda?: string;
	placeholderVazio?: string;
}) {
	const opcoes = montarOpcoesTerminaisPdv(terminais, value, {
		somenteDisponiveis,
	});
	const cadastrados = terminais.length > 0;
	const semOpcao =
		somenteDisponiveis && opcoes.length === 0
			? (placeholderVazio ??
				"Nenhum número disponível — busque no principal ou cadastre outro terminal.")
			: null;

	return (
		<>
			<Select
				id={id}
				value={opcoes.some((o) => String(o.numeropdv) === value) ? value : ""}
				disabled={disabled || Boolean(semOpcao)}
				onChange={(e) => onChange(e.target.value)}
			>
				{semOpcao ? (
					<option value="">{semOpcao}</option>
				) : (
					<>
						{somenteDisponiveis && !value ? (
							<option value="">Selecione o número deste PDV…</option>
						) : null}
						{opcoes.map((terminal) => (
							<option
								key={terminal.numeropdv}
								value={String(terminal.numeropdv)}
								disabled={terminal.disponivel === false}
							>
								{rotuloTerminalPdv(terminal)}
							</option>
						))}
					</>
				)}
			</Select>
			<p className="text-xs text-muted-foreground">
				{ajuda ??
					(cadastrados
						? "Lista dos caixas cadastrados no retaguarda (NFC-e → Terminais PDV)."
						: "Cadastre este caixa no retaguarda (NFC-e → Terminais PDV) para aparecer na lista.")}
			</p>
		</>
	);
}
