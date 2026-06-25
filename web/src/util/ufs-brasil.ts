export const UFS_BRASIL = [
	"AC",
	"AL",
	"AM",
	"AP",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MG",
	"MS",
	"MT",
	"PA",
	"PB",
	"PE",
	"PI",
	"PR",
	"RJ",
	"RN",
	"RO",
	"RR",
	"RS",
	"SC",
	"SE",
	"SP",
	"TO",
] as const;

export type UfBrasil = (typeof UFS_BRASIL)[number];

export const CAMPOS_UF_TAXA = UFS_BRASIL.map(
	(uf) => `uf_${uf.toLowerCase()}` as `uf_${Lowercase<UfBrasil>}`,
);
