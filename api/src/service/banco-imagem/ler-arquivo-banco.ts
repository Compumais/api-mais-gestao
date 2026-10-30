import { buscarProdutoBancoPorId } from "@/repositories/banco-imagem-repositories.js";
import { lerArquivoBanco } from "@/service/banco-imagem/armazenamento.js";

export async function lerArquivoProdutoBanco(id: string) {
	const produto = await buscarProdutoBancoPorId(id);
	if (!produto) return null;
	return lerArquivoBanco({
		id: produto.id,
		chave: produto.chavearmazenamento,
		tipomime: produto.tipomime,
		referencia: produto.referencia,
	});
}
