/** Mesma regra comercial do renderer (`pdv/src/lib/pizza-meio-a-meio.ts`). */
export const DESCRICAO_NFCE_MAX = 120;

export type ProdutoPizza = {
	id: string;
	descricao: string;
	preco: number;
	espizza?: number | boolean | null;
};

export function produtoEhPizza(produto: {
	espizza?: number | boolean | string | null;
}): boolean {
	return Number(produto.espizza) === 1 || produto.espizza === true;
}

export function montarDescricaoPizzaMeioAMeio(
	primeiro: string,
	segundo: string,
): string {
	const texto = `Pizza meio a meio: ${primeiro.trim()} / ${segundo.trim()}`;
	if (texto.length <= DESCRICAO_NFCE_MAX) {
		return texto;
	}
	return texto.slice(0, DESCRICAO_NFCE_MAX);
}

export function montarItemPizzaMeioAMeio(
	primeiro: ProdutoPizza,
	segundo: ProdutoPizza,
): {
	idproduto: string;
	idprodutomeio: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
} {
	const precoPrimeiro = Number(primeiro.preco) || 0;
	const precoSegundo = Number(segundo.preco) || 0;
	const principal = precoPrimeiro >= precoSegundo ? primeiro : segundo;
	const outro = principal.id === primeiro.id ? segundo : primeiro;
	const precounitario = Math.max(precoPrimeiro, precoSegundo);
	return {
		idproduto: principal.id,
		idprodutomeio: outro.id,
		descricao: montarDescricaoPizzaMeioAMeio(
			primeiro.descricao,
			segundo.descricao,
		),
		quantidade: 1,
		precounitario,
		precototal: precounitario,
	};
}
