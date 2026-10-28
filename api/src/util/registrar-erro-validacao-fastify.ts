import type { FastifyError, FastifyInstance } from "fastify";

type AjvValidationError = {
	instancePath?: string;
	schemaPath?: string;
	message?: string;
	params?: Record<string, unknown>;
};

function caminhoParaPath(instancePath: string, validationContext?: string): string[] {
	const bruto = instancePath.replace(/^\//, "");
	if (bruto) {
		return bruto.split("/").filter(Boolean);
	}
	if (validationContext && validationContext !== "body") {
		return [validationContext];
	}
	return [];
}

function mensagemCampo(
	erro: AjvValidationError,
	path: string[],
): string {
	const campo = path.join(".") || "campo";
	const keyword = erro.schemaPath?.split("/").pop();
	if (keyword === "required") {
		return `${campo} é obrigatório`;
	}
	if (erro.message?.includes("must be number")) {
		return `${campo} deve ser numérico`;
	}
	if (erro.message?.includes("must be string")) {
		return `${campo} deve ser texto`;
	}
	return erro.message ? `${campo}: ${erro.message}` : `${campo} inválido`;
}

export function registrarErroValidacaoFastify(app: FastifyInstance) {
	app.setErrorHandler((error: FastifyError, _request, reply) => {
		if (error.code === "FST_ERR_VALIDATION" && error.validation) {
			const validation = error.validation as AjvValidationError[];
			const details = validation.map((item) => {
				const path = caminhoParaPath(
					item.instancePath ?? "",
					error.validationContext,
				);
				return {
					path,
					message: mensagemCampo(item, path),
				};
			});

			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				message: details.map((d) => d.message).join("; "),
				details,
			});
		}

		const statusCode = error.statusCode ?? 500;
		return reply.status(statusCode).send({
			error: error.message,
			code: error.code ?? "INTERNAL_SERVER_ERROR",
		});
	});
}
