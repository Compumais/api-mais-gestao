"use client";

import type { CriarEntidadeFormData } from "@/schemas/entidades.schema";
import {
	EntidadeForm,
	type EntidadeFormConfig,
} from "../../components/entidade-form";

const CLIENTE_FORM_CONFIG: EntidadeFormConfig = {
	tipoPrincipal: "cliente",
	rotaListagem: "/clientes",
	queryKeyListagem: "entidades",
	nomePlaceholder: "Nome do cliente",
	mensagens: {
		criadoSucesso: "Cliente cadastrado com sucesso!",
		atualizadoSucesso: "Cliente atualizado com sucesso!",
		erroCriar: "Erro ao cadastrar cliente",
		erroAtualizar: "Erro ao atualizar cliente",
		erroIdEditar: "ID do cliente é obrigatório para editar",
	},
};

type ClientFormProps = {
	modo?: "criar" | "editar";
	entidadeId?: string;
	valoresIniciais?: Partial<CriarEntidadeFormData>;
};

export function ClientForm(props: ClientFormProps) {
	return <EntidadeForm config={CLIENTE_FORM_CONFIG} {...props} />;
}
