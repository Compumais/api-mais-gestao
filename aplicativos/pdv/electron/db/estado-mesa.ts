export function mesaTemContaAberta(params: {
	statusMesa: string;
	idconta: string | null;
	abertoem: string | null;
}): boolean {
	return Boolean(
		params.statusMesa === "ocupada" && params.idconta && params.abertoem,
	);
}
