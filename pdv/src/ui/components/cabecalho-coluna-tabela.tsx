import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/lib/utils";

export type TipoFiltroColunaTabela =
	| "nenhum"
	| "texto"
	| "data"
	| "opcoes"
	| "catalogo";

export type OpcaoFiltroColunaTabela = {
	value: string;
	label: string;
};

export type OrdenacaoColunaTabela = "asc" | "desc" | false;

type CabecalhoColunaTabelaProps = {
	titulo: string;
	colunaId: string;
	ordenacao: OrdenacaoColunaTabela;
	onOrdenar: (direcao: "asc" | "desc" | false) => void;
	filtroAtivo: boolean;
	valorFiltro: string;
	onFiltrar: (valor: string) => void;
	tipoFiltro?: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholderFiltro?: string;
};

export function CabecalhoColunaTabela({
	titulo,
	colunaId,
	ordenacao,
	onOrdenar,
	filtroAtivo,
	valorFiltro,
	onFiltrar,
	tipoFiltro = "texto",
	opcoes = [],
	placeholderFiltro = "Filtrar...",
}: CabecalhoColunaTabelaProps) {
	const [rascunho, setRascunho] = useState(valorFiltro);

	useEffect(() => {
		setRascunho(valorFiltro);
	}, [valorFiltro]);

	function ciclarOrdenacao() {
		if (ordenacao === false) onOrdenar("asc");
		else if (ordenacao === "asc") onOrdenar("desc");
		else onOrdenar(false);
	}

	function aplicarTexto() {
		onFiltrar(rascunho.trim());
	}

	const IconeOrdenacao =
		ordenacao === "asc"
			? ArrowUp
			: ordenacao === "desc"
				? ArrowDown
				: ArrowUpDown;

	return (
		<div className="flex items-center gap-0.5">
			<span className="truncate font-medium">{titulo}</span>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={cn(
					"size-6 shrink-0 text-muted-foreground hover:text-foreground",
					ordenacao && "text-foreground",
				)}
				aria-label={`Ordenar ${titulo}`}
				onClick={ciclarOrdenacao}
			>
				<IconeOrdenacao className="size-3.5" aria-hidden="true" />
			</Button>
			{tipoFiltro !== "nenhum" && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={cn(
								"size-6 shrink-0 text-muted-foreground hover:text-foreground",
								filtroAtivo && "text-foreground",
							)}
							aria-label={`Filtrar ${titulo}`}
						>
							<Filter
								className={cn("size-3.5", filtroAtivo && "fill-current")}
								aria-hidden="true"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuLabel>Ordenação</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onOrdenar("asc")}>
							Ordenar crescente
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onOrdenar("desc")}>
							Ordenar decrescente
						</DropdownMenuItem>
						{ordenacao ? (
							<DropdownMenuItem onClick={() => onOrdenar(false)}>
								Limpar ordenação
							</DropdownMenuItem>
						) : null}
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Filtro</DropdownMenuLabel>

						{(tipoFiltro === "texto" || tipoFiltro === "data") && (
							<div className="px-2 py-1.5">
								<Input
									type={tipoFiltro === "data" ? "date" : "text"}
									value={rascunho}
									placeholder={placeholderFiltro}
									aria-label={`Valor do filtro ${titulo}`}
									onChange={(e) => setRascunho(e.target.value)}
									onKeyDown={(e) => {
										e.stopPropagation();
										if (e.key === "Enter") {
											e.preventDefault();
											aplicarTexto();
										}
									}}
									onClick={(e) => e.stopPropagation()}
								/>
								<div className="mt-2 flex gap-1">
									<Button
										type="button"
										size="sm"
										className="h-7 flex-1"
										onClick={aplicarTexto}
									>
										Aplicar
									</Button>
									{filtroAtivo ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="h-7"
											onClick={() => {
												setRascunho("");
												onFiltrar("");
											}}
										>
											Limpar
										</Button>
									) : null}
								</div>
							</div>
						)}

						{(tipoFiltro === "opcoes" || tipoFiltro === "catalogo") && (
							<>
								<DropdownMenuRadioGroup
									value={valorFiltro || "__todos__"}
									onValueChange={(value) =>
										onFiltrar(value === "__todos__" ? "" : value)
									}
								>
									<DropdownMenuRadioItem value="__todos__">
										Todos
									</DropdownMenuRadioItem>
									{opcoes.map((opcao) => (
										<DropdownMenuRadioItem
											key={`${colunaId}-${opcao.value}`}
											value={opcao.value}
										>
											{opcao.label}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
								{filtroAtivo ? (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={() => onFiltrar("")}>
											Limpar filtro
										</DropdownMenuItem>
									</>
								) : null}
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
