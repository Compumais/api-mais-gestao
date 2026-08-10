import { z } from "zod";
import { somenteDigitos, validarCnpj } from "@/lib/documentos-brasil";

export const criarEmpresaSchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
	cnpj: z
		.string()
		.min(1, "CNPJ é obrigatório")
		.refine((valor) => somenteDigitos(valor).length === 14, "CNPJ inválido")
		.refine((valor) => validarCnpj(valor), "CNPJ inválido"),
	email: z.string().email("E-mail inválido"),
	telefone: z
		.string()
		.min(1, "Telefone é obrigatório")
		.refine((valor) => somenteDigitos(valor).length >= 10, "Telefone inválido"),
	cep: z
		.string()
		.min(1, "CEP é obrigatório")
		.refine((valor) => somenteDigitos(valor).length === 8, "CEP inválido"),
	idestado: z.string().min(1, "Estado é obrigatório"),
	idcidade: z.string().min(1, "Cidade é obrigatória"),
	endereco: z.string().min(1, "Rua / logradouro é obrigatório"),
	numero: z.string().min(1, "Número é obrigatório"),
	complemento: z.string(),
	bairro: z.string().min(1, "Bairro é obrigatório"),
});

export type CriarEmpresaFormData = z.infer<typeof criarEmpresaSchema>;

export const valoresPadraoCriarEmpresa: CriarEmpresaFormData = {
	nome: "",
	cnpj: "",
	email: "",
	telefone: "",
	cep: "",
	idestado: "",
	idcidade: "",
	endereco: "",
	numero: "",
	complemento: "",
	bairro: "",
};
