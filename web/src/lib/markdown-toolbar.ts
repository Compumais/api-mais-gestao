/**
 * Envolve a seleção do textarea com prefixo/sufixo Markdown
 * e reposiciona o cursor.
 */
export function aplicarMarcacaoMarkdown(
	textarea: HTMLTextAreaElement,
	prefixo: string,
	sufixo: string = "",
	placeholder = "texto",
): string {
	const inicio = textarea.selectionStart;
	const fim = textarea.selectionEnd;
	const valor = textarea.value;
	const selecionado = valor.slice(inicio, fim);
	const conteudo = selecionado.length > 0 ? selecionado : placeholder;
	const inserido = `${prefixo}${conteudo}${sufixo}`;
	const novoValor = valor.slice(0, inicio) + inserido + valor.slice(fim);

	const selecaoInicio = inicio + prefixo.length;
	const selecaoFim = selecaoInicio + conteudo.length;

	requestAnimationFrame(() => {
		textarea.focus();
		textarea.setSelectionRange(selecaoInicio, selecaoFim);
	});

	return novoValor;
}

export function inserirNaPosicao(
	textarea: HTMLTextAreaElement,
	texto: string,
): string {
	const inicio = textarea.selectionStart;
	const fim = textarea.selectionEnd;
	const valor = textarea.value;
	const novoValor = valor.slice(0, inicio) + texto + valor.slice(fim);
	const cursor = inicio + texto.length;

	requestAnimationFrame(() => {
		textarea.focus();
		textarea.setSelectionRange(cursor, cursor);
	});

	return novoValor;
}
