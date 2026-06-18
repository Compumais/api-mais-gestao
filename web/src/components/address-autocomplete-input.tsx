"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	isGooglePlacesDisponivel,
	useGooglePlacesAutocomplete,
	type EnderecoSugestao,
} from "@/hooks/use-google-places";

type AddressAutocompleteInputProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onEnderecoSelecionado?: (endereco: EnderecoSugestao) => void;
	idestado?: string | null;
	cepConsultado?: boolean;
	placeholder?: string;
	disabled?: boolean;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
};

export function AddressAutocompleteInput({
	id,
	value,
	onChange,
	onEnderecoSelecionado,
	idestado,
	cepConsultado = false,
	placeholder = "Rua, Avenida, etc.",
	disabled = false,
	...ariaProps
}: AddressAutocompleteInputProps) {
	const [termo, setTermo] = useState(value);
	const habilitado =
		isGooglePlacesDisponivel() && Boolean(cepConsultado || value.trim());

	const { sugestoes, carregando, pronto, buscarSugestoes, selecionarSugestao } =
		useGooglePlacesAutocomplete({
			habilitado,
			idestado,
			onSelecionar: (endereco) => {
				onChange(endereco.endereco);
				setTermo(endereco.endereco);
				onEnderecoSelecionado?.(endereco);
			},
		});

	useEffect(() => {
		setTermo(value);
	}, [value]);

	const handleChange = (novoValor: string) => {
		setTermo(novoValor);
		onChange(novoValor);
		if (pronto) {
			buscarSugestoes(novoValor);
		}
	};

	return (
		<div className="relative">
			<Input
				id={id}
				value={termo}
				onChange={(event) => handleChange(event.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				{...ariaProps}
			/>
			{carregando && (
				<Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
			)}
			{pronto && sugestoes.length > 0 && (
				<div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
					<ul className="max-h-[200px] overflow-y-auto p-1">
						{sugestoes.map((sugestao, indice) => (
							<li key={`${sugestao}-${indice}`}>
								<button
									type="button"
									className={cn(
										"w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
									)}
									onClick={() => selecionarSugestao(indice, termo)}
								>
									{sugestao}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
