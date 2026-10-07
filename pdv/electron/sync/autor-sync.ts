/**
 * Quem consta como autor no sync com a retaguarda.
 *
 * Com operador logado, é ele. Sem operador (PDV rodando como serviço, caixa
 * fechado, logout) e com API key do terminal, usa o operador do turno de
 * caixa mais recente deste terminal. A API aceita o terminal como autor das
 * rotas (`pdv-device:<id>`); o usuário real só é exigido nos campos do corpo
 * (`usuarioquefechouvenda`, `idusuario`), que precisam ser um usuário válido.
 */
export function escolherAutorSync(params: {
	useridSessao: string | null;
	apiKeyDevice: boolean;
	operadorUltimoTurno: string | null;
}): string | null {
	const sessao = params.useridSessao?.trim();
	if (sessao) return sessao;
	if (!params.apiKeyDevice) return null;
	const turno = params.operadorUltimoTurno?.trim();
	return turno || null;
}
