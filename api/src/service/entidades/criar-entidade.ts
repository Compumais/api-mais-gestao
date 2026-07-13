import type { Entidade, NovaEntidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarEntidade,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";
import {
	extrairMensagemErroBanco,
	idOpcionalOuNulo,
	truncarTexto,
} from "@/util/texto-util.js";

type CriarEntidadeParametros = {
	dadosEntidade: NovaEntidade;
	idusuario: string;
};

function normalizarDataNascimento(
	valor: string | null | undefined,
): string | null {
	if (valor === undefined || valor === null) return null;
	const texto = valor.trim();
	if (!texto) return null;
	const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
	return match?.[1] ?? null;
}

function sanitizarDadosEntidade(dados: NovaEntidade): NovaEntidade {
	return {
		...dados,
		nome: truncarTexto(dados.nome, 60) ?? dados.nome.slice(0, 60),
		razaosocial: truncarTexto(dados.razaosocial, 60),
		cnpjcpf: truncarTexto(dados.cnpjcpf, 20) ?? dados.cnpjcpf.slice(0, 20),
		inscricaoestadual: truncarTexto(dados.inscricaoestadual, 20),
		rg: truncarTexto(dados.rg, 20),
		email: truncarTexto(dados.email, 200),
		telefone: truncarTexto(dados.telefone, 40),
		endereco: truncarTexto(dados.endereco, 60),
		numeroendereco: truncarTexto(dados.numeroendereco, 6),
		complemento: truncarTexto(dados.complemento, 50),
		bairro: truncarTexto(dados.bairro, 50),
		cep: truncarTexto(dados.cep, 9),
		fax: truncarTexto(dados.fax, 40),
		nascimento: normalizarDataNascimento(dados.nascimento),
		idplanocontas: idOpcionalOuNulo(dados.idplanocontas) ?? null,
		idcidade: idOpcionalOuNulo(dados.idcidade) ?? null,
		idestado: idOpcionalOuNulo(dados.idestado) ?? null,
		pais: idOpcionalOuNulo(dados.pais) ?? null,
	};
}

export async function criarEntidadeService({
	dadosEntidade,
	idusuario,
}: CriarEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosEntidade.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dados = sanitizarDadosEntidade(dadosEntidade);

	const emailOuTelefoneDuplicado = await verificarEmailTelefoneDuplicado(
		dados.idempresa,
		dados.email,
		dados.telefone,
	);

	if (emailOuTelefoneDuplicado) {
		return httpRecursoExistente();
	}

	try {
		const entidade = await criarEntidade(dados);

		if (!entidade) {
			return httpErro();
		}

		return httpCriacao<Entidade>(entidade);
	} catch (erro) {
		console.error("Erro ao criar entidade:", erro);
		const mensagem = extrairMensagemErroBanco(erro);
		if (
			mensagem.includes("banco de dados") ||
			mensagem.includes("excedem") ||
			mensagem.includes("Referência") ||
			mensagem.includes("Schema") ||
			mensagem.includes("inválida") ||
			mensagem.includes("duplicada")
		) {
			return httpBadRequest(mensagem);
		}
		return httpBadRequest(
			mensagem.includes("date") || mensagem.includes("timestamp")
				? "Data de nascimento inválida"
				: mensagem || "Erro ao criar entidade",
		);
	}
}
