import type { FieldValues, UseFormSetValue } from "react-hook-form";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import type { ConsultaCnpjEntidadeResposta } from "@/services/entidades.service";

type PreencherEmpresaConsultaCnpjParametros<T extends FieldValues> = {
	entidade: ConsultaCnpjEntidadeResposta["entidade"];
	setValue: UseFormSetValue<T>;
	onCepPreenchido?: (cepLimpo: string) => void;
};

export function preencherEmpresaConsultaCnpj<T extends FieldValues>({
	entidade,
	setValue,
	onCepPreenchido,
}: PreencherEmpresaConsultaCnpjParametros<T>): void {
	const opcoes = { shouldValidate: true } as const;

	const nome = entidade.nome?.trim() || entidade.razaosocial?.trim() || "";
	if (nome) {
		setValue("nome" as never, nome as never, opcoes);
	}

	if (entidade.cnpjcpf) {
		setValue(
			"cnpj" as never,
			maskCpfCnpj(entidade.cnpjcpf) as never,
			opcoes,
		);
	}

	if (entidade.email) {
		setValue("email" as never, entidade.email as never, opcoes);
	}

	if (entidade.telefone) {
		setValue(
			"telefone" as never,
			maskPhone(entidade.telefone) as never,
			opcoes,
		);
	}

	if (entidade.endereco) {
		setValue("endereco" as never, entidade.endereco as never, opcoes);
	}

	if (entidade.numeroendereco) {
		setValue("numero" as never, entidade.numeroendereco as never, opcoes);
	}

	if (entidade.complemento) {
		setValue("complemento" as never, entidade.complemento as never, opcoes);
	}

	if (entidade.bairro) {
		setValue("bairro" as never, entidade.bairro as never, opcoes);
	}

	if (entidade.idestado) {
		setValue("idestado" as never, entidade.idestado as never, opcoes);
	}

	if (entidade.idcidade) {
		setValue("idcidade" as never, entidade.idcidade as never, opcoes);
	}

	if (entidade.cep) {
		const cepFormatado = maskCep(entidade.cep);
		setValue("cep" as never, cepFormatado as never, opcoes);
		onCepPreenchido?.(entidade.cep.replace(/\D/g, ""));
	}
}
