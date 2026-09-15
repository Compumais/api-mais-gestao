"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type CampoPaleta = { value: string; label: string };

type PaletaBlocosImpressaoProps<T extends string, B extends { id: string }> =
	{
		tipos: readonly T[];
		labels: Record<T, string>;
		camposPorTipo: Partial<Record<T, readonly CampoPaleta[]>>;
		criarBloco: (tipo: T, campos?: string[]) => B;
		onAdicionar: (bloco: B) => void;
		somenteLeitura?: boolean;
	};

function ItemPaletaSimples<T extends string, B extends { id: string }>({
	tipo,
	label,
	criarBloco,
	onAdicionar,
	somenteLeitura,
}: {
	tipo: T;
	label: string;
	criarBloco: (tipo: T, campos?: string[]) => B;
	onAdicionar: (bloco: B) => void;
	somenteLeitura: boolean;
}) {
	return (
		<div className="flex items-center gap-1 rounded-md border px-2 py-1.5 bg-background">
			<span className="flex-1 text-sm">{label}</span>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0"
				disabled={somenteLeitura}
				aria-label={`Adicionar bloco ${label} com todas as informações`}
				onClick={() => onAdicionar(criarBloco(tipo))}
			>
				<Plus className="h-3.5 w-3.5" aria-hidden="true" />
			</Button>
		</div>
	);
}

function ItemPaletaComCampos<T extends string, B extends { id: string }>({
	tipo,
	label,
	campos,
	criarBloco,
	onAdicionar,
	somenteLeitura,
}: {
	tipo: T;
	label: string;
	campos: readonly CampoPaleta[];
	criarBloco: (tipo: T, campos?: string[]) => B;
	onAdicionar: (bloco: B) => void;
	somenteLeitura: boolean;
}) {
	const [aberto, setAberto] = useState(false);
	const [camposSelecionados, setCamposSelecionados] = useState<string[]>(() =>
		campos.map((c) => c.value),
	);

	const resetarCampos = useCallback(() => {
		setCamposSelecionados(campos.map((c) => c.value));
	}, [campos]);

	function toggleCampo(value: string) {
		setCamposSelecionados((atual) =>
			atual.includes(value)
				? atual.filter((c) => c !== value)
				: [...atual, value],
		);
	}

	function adicionarComTodos() {
		onAdicionar(criarBloco(tipo, campos.map((c) => c.value)));
	}

	function adicionarComSelecionados() {
		if (camposSelecionados.length === 0) return;
		onAdicionar(criarBloco(tipo, camposSelecionados));
		setAberto(false);
	}

	return (
		<Collapsible
			open={aberto}
			onOpenChange={(open) => {
				setAberto(open);
				if (open) resetarCampos();
			}}
		>
			<div className="rounded-md border bg-background">
				<div className="flex items-center gap-1 px-2 py-1.5">
					<span className="flex-1 text-sm">{label}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0"
						disabled={somenteLeitura}
						aria-label={`Adicionar bloco ${label} com todas as informações`}
						onClick={adicionarComTodos}
					>
						<Plus className="h-3.5 w-3.5" aria-hidden="true" />
					</Button>
					<CollapsibleTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 shrink-0"
							disabled={somenteLeitura}
							aria-label={`Opções do bloco ${label}`}
						>
							<ChevronDown
								className={cn(
									"h-3.5 w-3.5 transition-transform",
									aberto && "rotate-180",
								)}
								aria-hidden="true"
							/>
						</Button>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent>
					<div className="space-y-2 border-t px-2 py-2">
						<p className="text-xs text-muted-foreground">
							Escolha os campos para imprimir:
						</p>
						<div className="space-y-1.5">
							{campos.map((campo) => (
								<label
									key={campo.value}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										checked={camposSelecionados.includes(campo.value)}
										disabled={somenteLeitura}
										onCheckedChange={() => toggleCampo(campo.value)}
									/>
									{campo.label}
								</label>
							))}
						</div>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							className="w-full"
							disabled={somenteLeitura || camposSelecionados.length === 0}
							onClick={adicionarComSelecionados}
						>
							Adicionar
						</Button>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

export function PaletaBlocosImpressao<T extends string, B extends { id: string }>({
	tipos,
	labels,
	camposPorTipo,
	criarBloco,
	onAdicionar,
	somenteLeitura = false,
}: PaletaBlocosImpressaoProps<T, B>) {
	return (
		<div className="rounded-lg border p-3 space-y-2 h-fit">
			<p className="text-sm font-medium">Blocos</p>
			<p className="text-xs text-muted-foreground">
				Use + para adicionar com todas as informações ou o menu para escolher
				os campos.
			</p>
			<div className="flex flex-col gap-1.5">
				{tipos.map((tipo) => {
					const campos = camposPorTipo[tipo];
					const label = labels[tipo];

					if (!campos || campos.length === 0) {
						return (
							<ItemPaletaSimples
								key={tipo}
								tipo={tipo}
								label={label}
								criarBloco={criarBloco}
								onAdicionar={onAdicionar}
								somenteLeitura={somenteLeitura}
							/>
						);
					}

					return (
						<ItemPaletaComCampos
							key={tipo}
							tipo={tipo}
							label={label}
							campos={campos}
							criarBloco={criarBloco}
							onAdicionar={onAdicionar}
							somenteLeitura={somenteLeitura}
						/>
					);
				})}
			</div>
		</div>
	);
}
