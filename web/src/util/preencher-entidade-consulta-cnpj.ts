import type { FieldValues, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import type { ConsultaCnpjEntidadeResposta } from "@/services/entidades.service";

type PreencherEntidadeConsultaCnpjParametros<T extends FieldValues> = {
	entidade: ConsultaCnpjEntidadeResposta["entidade"];
	setValue: UseFormSetValue<T>;
	getValues: UseFormGetValues<T>;
	onCepPreenchido?: (cepLimpo: string) => void;
};

export function preencherEntidadeConsultaCnpj<T extends FieldValues>({
	entidade,
	setValue,
	getValues,
	onCepPreenchido,
}: PreencherEntidadeConsultaCnpjParametros<T>): void {
	const opcoes = { shouldValidate: true } as const;

	if (entidade.nome) {
		setValue("nome" as never, entidade.nome as never, opcoes);
	}

	if (entidade.razaosocial) {
		setValue("razaosocial" as never, entidade.razaosocial as never, opcoes);
	}

	if (entidade.cnpjcpf) {
		setValue(
			"cnpjcpf" as never,
			maskCpfCnpj(entidade.cnpjcpf) as never,
			opcoes,
		);
	}

	setValue("tipopessoa" as never, entidade.tipopessoa as never, opcoes);

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
		setValue(
			"numeroendereco" as never,
			entidade.numeroendereco as never,
			opcoes,
		);
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

	const valoresAtuais = getValues();
	if (!valoresAtuais.pais) {
		setValue("pais" as never, "Brasil" as never, opcoes);
	}
}
