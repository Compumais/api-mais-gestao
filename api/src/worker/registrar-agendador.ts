import { iniciarAgendador } from "./agendador.js";

export function registrarAgendador() {
	const habilitado = process.env.AGENDADOR_HABILITADO === "true";

	if (!habilitado) {
		console.log(
			"[agendador] Desabilitado — defina AGENDADOR_HABILITADO=true para ativar",
		);
		return;
	}

	iniciarAgendador();
}
