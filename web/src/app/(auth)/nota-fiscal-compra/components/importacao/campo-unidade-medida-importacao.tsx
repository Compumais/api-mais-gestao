"use client";

import { useQuery } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";

type CampoUnidadeMedidaImportacaoProps = {
	idempresa: string;
	value?: string;
	codigoXml?: string;
	onChange: (idunidademedida: string, codigo?: string) => void;
	obrigatorio?: boolean;
	habilitado?: boolean;
};

export function CampoUnidadeMedidaImportacao({
	idempresa,
	value,
	codigoXml,
	onChange,
	obrigatorio = false,
	habilitado = true,
}: CampoUnidadeMedidaImportacaoProps) {
	const {
		data: unidades = [],
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["unidades-medida", idempresa, "importacao-nf"],
		queryFn: () => unidadeMedidaService.listarTodos({ idempresa }),
		enabled: habilitado && !!idempresa,
	});

	const unidadesGlobais = unidades.filter(isUnidadeMedidaGlobal);
	const unidadesEmpresa = unidades.filter((u) => !isUnidadeMedidaGlobal(u));
	const semUnidades = unidadesGlobais.length === 0 && unidadesEmpresa.length === 0;

	return (
		<Field>
			<FieldLabel htmlFor="idunidademedida-item">
				Unidade de medida (estoque){obrigatorio ? " *" : ""}
			</FieldLabel>
			{codigoXml ? (
				<p className="text-xs text-muted-foreground mb-1">
					Unidade na NF: <span className="font-medium">{codigoXml}</span>
				</p>
			) : null}
			<Select
				value={value || undefined}
				onValueChange={(id) => {
					const unidade = unidades.find((u) => u.id === id);
					onChange(id, unidade?.codigo ?? undefined);
				}}
				disabled={isLoading}
			>
				<SelectTrigger id="idunidademedida-item" className="w-full">
					<SelectValue
						placeholder={
							isLoading ? "Carregando..." : "Selecione a unidade de estoque"
						}
					/>
				</SelectTrigger>
				<SelectContent position="popper" className="z-[200]">
					{semUnidades ? (
						<SelectItem value="__vazio" disabled>
							{isError
								? "Erro ao carregar unidades"
								: "Nenhuma unidade cadastrada"}
						</SelectItem>
					) : (
						<>
							{unidadesGlobais.length > 0 ? (
								<SelectGroup>
									<SelectLabel>Padrão do sistema</SelectLabel>
									{unidadesGlobais.map((unidade) => (
										<SelectItem key={unidade.id} value={unidade.id}>
											{unidade.codigo ?? unidade.nome ?? unidade.id}
											{unidade.nome && unidade.codigo
												? ` — ${unidade.nome}`
												: ""}
										</SelectItem>
									))}
								</SelectGroup>
							) : null}
							{unidadesEmpresa.length > 0 ? (
								<SelectGroup>
									<SelectLabel>Da empresa</SelectLabel>
									{unidadesEmpresa.map((unidade) => (
										<SelectItem key={unidade.id} value={unidade.id}>
											{unidade.codigo ?? unidade.nome ?? unidade.id}
											{unidade.nome && unidade.codigo
												? ` — ${unidade.nome}`
												: ""}
										</SelectItem>
									))}
								</SelectGroup>
							) : null}
						</>
					)}
				</SelectContent>
			</Select>
		</Field>
	);
}
