/**
 * Controla se o fluxo de boot (sincronização inicial) já foi executado nesta
 * sessão do processo renderer, evitando loop entre "/" e "/boot" ao navegar
 * de volta para a Home após o boot terminar.
 */
let booted = false;

export function isBooted(): boolean {
	return booted;
}

export function marcarBootConcluido(): void {
	booted = true;
}

export function marcarBootPendente(): void {
	booted = false;
}
