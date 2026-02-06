"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAtualizarSecaoConfiguracao } from "@/hooks/use-configuracao";
import type { Configuracao } from "@/services/configuracao.service";

interface RelatoriosFormProps {
	configuracao: Configuracao | undefined;
	idempresa: string;
}

export function RelatoriosForm({
	configuracao,
	idempresa,
}: RelatoriosFormProps) {
	const atualizarMutation = useAtualizarSecaoConfiguracao();

	const relatorios = configuracao?.relatorios || {
		templates: [],
		padroes: {
			periodo: "mes" as const,
			agrupamentos: [],
			filtros: {},
		},
	};

	const handleAtualizarRelatorios = (campo: string, valor: unknown) => {
		atualizarMutation.mutate({
			idempresa,
			secao: "relatorios",
			dados: {
				...relatorios,
				[campo]: valor,
			},
		});
	};

	return (
		<div className="space-y-6">
			{/* Templates Personalizados */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Templates Personalizados</h2>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							// TODO: Implementar modal de criação de template
							alert("Funcionalidade em desenvolvimento");
						}}
					>
						Criar Template
					</Button>
				</div>

				{relatorios.templates.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum template personalizado criado
					</p>
				) : (
					<div className="space-y-2">
						{relatorios.templates.map((template) => (
							<div
								key={template.id}
								className="flex items-center justify-between rounded border p-3"
							>
								<div>
									<p className="font-medium">{template.nome}</p>
									<p className="text-muted-foreground text-sm">
										Tipo: {template.tipo}
									</p>
								</div>
								<Button variant="outline" size="sm">
									Editar
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Configurações Padrão */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Configurações Padrão</h2>
				<FieldGroup>
					<Field>
						<FieldLabel>Período Padrão</FieldLabel>
						<Select
							value={relatorios.padroes.periodo}
							onValueChange={(value) =>
								handleAtualizarRelatorios("padroes", {
									...relatorios.padroes,
									periodo: value as
										| "mes"
										| "trimestre"
										| "semestre"
										| "ano"
										| "personalizado",
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="mes">Mês</SelectItem>
								<SelectItem value="trimestre">Trimestre</SelectItem>
								<SelectItem value="semestre">Semestre</SelectItem>
								<SelectItem value="ano">Ano</SelectItem>
								<SelectItem value="personalizado">Personalizado</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Agrupamentos</FieldLabel>
						<p className="text-muted-foreground text-sm">
							Funcionalidade de agrupamentos em desenvolvimento
						</p>
					</Field>
					<Field>
						<FieldLabel>Filtros Padrão</FieldLabel>
						<p className="text-muted-foreground text-sm">
							Funcionalidade de filtros em desenvolvimento
						</p>
					</Field>
				</FieldGroup>
			</div>
		</div>
	);
}
