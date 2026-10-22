"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DialogCriarDepartamentoRapido } from "@/components/dialog-criar-departamento-rapido";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import { departamentoService } from "@/services/departamento.service";

type CampoDepartamentoProps = {
	value?: string | null;
	onChange: (value: string | null) => void;
	id?: string;
	disabled?: boolean;
	label?: string;
};

export function CampoDepartamento({
	value,
	onChange,
	id = "iddepartamento",
	disabled,
	label = "Departamento",
}: CampoDepartamentoProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [dialogAberto, setDialogAberto] = useState(false);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["departamentos", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return departamentoService.listar({
				idempresa: empresa.id,
				limit: 200,
				page: 1,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const opcoes =
		data?.data
			.filter((d) => d.inativo !== 1)
			.map((d) => ({
				value: d.id,
				label: d.codigo ? `${d.codigo} - ${d.descricao}` : d.descricao,
			})) ?? [];

	return (
		<>
			<Field>
				<div className="mb-2 flex items-center justify-between gap-2">
					<FieldLabel htmlFor={id}>{label}</FieldLabel>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1 px-2"
						onClick={() => setDialogAberto(true)}
						disabled={!empresa || disabled}
					>
						<Plus className="size-3.5" aria-hidden="true" />
						Cadastrar
					</Button>
				</div>
				<Combobox
					options={opcoes}
					value={value ?? ""}
					onChange={(v) => onChange(v || null)}
					placeholder={
						isLoading ? "Carregando..." : "Opcional"
					}
					searchPlaceholder="Buscar departamento..."
					emptyMessage="Nenhum departamento encontrado."
					disabled={isLoading || !empresa || disabled}
					allowEmpty
				/>
			</Field>
			<DialogCriarDepartamentoRapido
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				onCriado={(idCriado) => {
					void refetch();
					onChange(idCriado);
				}}
			/>
		</>
	);
}
