"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { localEstoqueService } from "@/services/local-estoque.service";

type CelulaLocalEstoqueImportacaoProps = {
	idempresa: string;
	idlocalestoque?: string | null | undefined;
	disabled?: boolean;
	onChange: (idlocalestoque: string | null) => void;
};

export function CelulaLocalEstoqueImportacao({
	idempresa,
	idlocalestoque,
	disabled = false,
	onChange,
}: CelulaLocalEstoqueImportacaoProps) {
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
	const valorAtual = idlocalestoque || "none";

	return (
		<div className="min-w-[140px] max-w-[200px]">
			<Select
				value={valorAtual}
				onValueChange={(novoValor) => {
					onChange(novoValor === "none" ? null : novoValor);
				}}
				disabled={disabled || isLoading}
			>
				<SelectTrigger className="h-8 text-xs w-full">
					<SelectValue
						placeholder={
							isLoading ? "Carregando..." : "Local de estoque"
						}
					/>
				</SelectTrigger>
				<SelectContent position="popper" className="z-[200] max-h-[280px]">
					<SelectItem value="none">
						{locais.some((l) => l.padrao === 1)
							? "Padrão da nota/empresa"
							: "Selecione o local"}
					</SelectItem>
					{locais
						.filter((l) => l.inativo !== 1 || l.id === idlocalestoque)
						.map((local) => (
							<SelectItem key={local.id} value={local.id} className="text-xs">
								{local.codigo
									? `${local.codigo} - ${local.descricao ?? ""}`
									: (local.descricao ?? local.id)}
								{local.padrao === 1 ? " (Padrão)" : ""}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
		</div>
	);
}
