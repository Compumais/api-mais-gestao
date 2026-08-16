/** Aplica a classe `dark` no documento conforme o tema salvo. */
export function aplicarTema(tema: string | undefined | null): void {
	const root = document.documentElement;
	if (tema === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}
