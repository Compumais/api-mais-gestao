"use client";

import { useQuery } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { localEstoqueService } from "@/services/local-estoque.service";

type CampoLocalEstoqueImportacaoProps = {
	idempresa: string;
	id?: string;
	label?: string;
	value?: string | null | undefined;
	disabled?: boolean;
	onChange: (idlocalestoque: string | null) => void;
};

export function CampoLocalEstoqueImportacao({
	idempresa,
	id = "idlocalestoque-nota",
	label = "Local de estoque de entrada",
	value,
	disabled = false,
	onChange,
}: CampoLocalEstoqueImportacaoProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["locais-estoque", idempresa, "importacao"],
		queryFn: async () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			return localEstoqueService.listar({
				idempresa,
				limit: 100,
			});
		},
		enabled: !!idempresa,
	});

	const locais = data?.data ?? [];
	const valorAtual = value || "none";

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select
				value={valorAtual}
				onValueChange={(novoValor) => {
					onChange(novoValor === "none" ? null : novoValor);
				}}
				disabled={disabled || isLoading}
			>
				<SelectTrigger id={id} className="w-full">
					<SelectValue
						placeholder={
							isLoading ? "Carregando locais..." : "Selecione o local"
						}
					/>
				</SelectTrigger>
				<SelectContent position="popper" className="z-[200]">
					<SelectItem value="none">
						{locais.some((l) => l.padrao === 1)
							? "Padrão da empresa"
							: "Selecione um local"}
					</SelectItem>
					{locais
						.filter((l) => l.inativo !== 1 || l.id === value)
						.map((local) => (
							<SelectItem key={local.id} value={local.id}>
								{local.codigo
									? `${local.codigo} - ${local.descricao ?? ""}`
									: (local.descricao ?? local.id)}
								{local.padrao === 1 ? " (Padrão)" : ""}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
		</Field>
	);
}
