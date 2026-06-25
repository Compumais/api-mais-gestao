"use client";

import type { CriarEntidadeFormData } from "@/schemas/entidades.schema";
import {
	EntidadeForm,
	type EntidadeFormConfig,
} from "../../components/entidade-form";

const FORNECEDOR_FORM_CONFIG: EntidadeFormConfig = {
	tipoPrincipal: "fornecedor",
	rotaListagem: "/fornecedores",
	queryKeyListagem: "fornecedores",
	nomePlaceholder: "Nome do fornecedor",
	mensagens: {
		criadoSucesso: "Fornecedor cadastrado com sucesso!",
		atualizadoSucesso: "Fornecedor atualizado com sucesso!",
		erroCriar: "Erro ao cadastrar fornecedor",
		erroAtualizar: "Erro ao atualizar fornecedor",
		erroIdEditar: "ID do fornecedor é obrigatório para editar",
	},
};

type SupplierFormProps = {
	modo?: "criar" | "editar";
	entidadeId?: string;
	valoresIniciais?: Partial<CriarEntidadeFormData>;
};

export function SupplierForm(props: SupplierFormProps) {
	return <EntidadeForm config={FORNECEDOR_FORM_CONFIG} {...props} />;
}
