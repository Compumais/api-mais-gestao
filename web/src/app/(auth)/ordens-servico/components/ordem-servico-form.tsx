"use client";

import { useId } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico.schema";
import type { CampoExtraOrdemServico } from "@/services/ordem-servico.service";
import { camposExtrasAtivos } from "@/util/ordem-servico-ui";

type Opcao = { value: string; label: string };

type OrdemServicoFormProps = {
	form: UseFormReturn<OrdemServicoFormData>;
	opcoesClientes: Opcao[];
	opcoesObjetos: Opcao[];
	opcoesAreas: Opcao[];
	opcoesTiposProblema: Opcao[];
	opcoesAtendentes: Opcao[];
	opcoesTecnicos: Opcao[];
	opcoesCondicoes: Opcao[];
	opcoesTiposDocumento: Opcao[];
	camposextras?: CampoExtraOrdemServico[];
	mostrarVeiculoEquipamento?: boolean;
	mostrarArea?: boolean;
	mostrarObjeto?: boolean;
	mostrarTipoProblema?: boolean;
	desabilitado?: boolean;
};

export function OrdemServicoForm({
	form,
	opcoesClientes,
	opcoesObjetos,
	opcoesAreas,
	opcoesTiposProblema,
	opcoesAtendentes,
	opcoesTecnicos,
	opcoesCondicoes,
	opcoesTiposDocumento,
	camposextras,
	mostrarVeiculoEquipamento = true,
	mostrarArea = true,
	mostrarObjeto = true,
	mostrarTipoProblema = true,
	desabilitado = false,
}: OrdemServicoFormProps) {
	const idBase = useId();
	const idDataOs = `${idBase}-dataos`;
	const idAgendamento = `${idBase}-agendamento`;
	const idPrevisao = `${idBase}-previsao`;
	const idProblema = `${idBase}-problema`;
	const idLaudo = `${idBase}-laudo`;
	const idObs = `${idBase}-obs`;
	const idMarca = `${idBase}-marca`;
	const idModelo = `${idBase}-modelo`;
	const idPlaca = `${idBase}-placa`;
	const idRenavam = `${idBase}-renavam`;
	const extrasAtivos = camposExtrasAtivos(camposextras);

	return (
		<FieldGroup>
			<FieldSet>
				<FieldLegend>Cliente e atendimento</FieldLegend>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="os-cliente">Cliente</FieldLabel>
						<Controller
							control={form.control}
							name="idcliente"
							render={({ field }) => (
								<Combobox
									options={opcoesClientes}
									value={field.value ?? ""}
									onChange={(value) => field.onChange(value || null)}
									placeholder="Selecione o cliente"
									searchPlaceholder="Buscar cliente..."
									emptyMessage="Nenhum cliente encontrado."
									disabled={desabilitado}
								/>
							)}
						/>
					</Field>
					{mostrarObjeto && (
						<Field>
							<FieldLabel htmlFor="os-objeto">Objeto</FieldLabel>
							<Controller
								control={form.control}
								name="idobjeto"
								render={({ field }) => (
									<Combobox
										options={opcoesObjetos}
										value={field.value ?? ""}
										onChange={(value) => field.onChange(value || null)}
										placeholder="Selecione o objeto"
										searchPlaceholder="Buscar objeto..."
										emptyMessage="Nenhum objeto encontrado."
										disabled={desabilitado}
									/>
								)}
							/>
						</Field>
					)}
					{mostrarArea && (
						<Field>
							<FieldLabel>Área</FieldLabel>
							<Controller
								control={form.control}
								name="idarea"
								render={({ field }) => (
									<Combobox
										options={opcoesAreas}
										value={field.value ?? ""}
										onChange={(value) => field.onChange(value || null)}
										placeholder="Selecione a área"
										searchPlaceholder="Buscar área..."
										emptyMessage="Nenhuma área encontrada."
										disabled={desabilitado}
									/>
								)}
							/>
						</Field>
					)}
					{mostrarTipoProblema && (
						<Field>
							<FieldLabel>Tipo de problema</FieldLabel>
							<Controller
								control={form.control}
								name="idtipoproblema"
								render={({ field }) => (
									<Combobox
										options={opcoesTiposProblema}
										value={field.value ?? ""}
										onChange={(value) => field.onChange(value || null)}
										placeholder="Selecione o tipo"
										searchPlaceholder="Buscar tipo..."
										emptyMessage="Nenhum tipo encontrado."
										disabled={desabilitado}
									/>
								)}
							/>
						</Field>
					)}
					<Field>
						<FieldLabel>Atendente</FieldLabel>
						<Controller
							control={form.control}
							name="idatendente"
							render={({ field }) => (
								<Combobox
									options={opcoesAtendentes}
									value={field.value ?? ""}
									onChange={(value) => field.onChange(value || null)}
									placeholder="Selecione o atendente"
									searchPlaceholder="Buscar..."
									emptyMessage="Nenhum registro encontrado."
									disabled={desabilitado}
								/>
							)}
						/>
					</Field>
					<Field>
						<FieldLabel>Técnico</FieldLabel>
						<Controller
							control={form.control}
							name="idultimotecnico"
							render={({ field }) => (
								<Combobox
									options={opcoesTecnicos}
									value={field.value ?? ""}
									onChange={(value) => field.onChange(value || null)}
									placeholder="Selecione o técnico"
									searchPlaceholder="Buscar..."
									emptyMessage="Nenhum registro encontrado."
									disabled={desabilitado}
								/>
							)}
						/>
					</Field>
				</div>
			</FieldSet>

			<FieldSet>
				<FieldLegend>Datas e financeiro</FieldLegend>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Field>
						<FieldLabel htmlFor={idDataOs}>Data da OS</FieldLabel>
						<Input
							id={idDataOs}
							type="date"
							disabled={desabilitado}
							{...form.register("dataos")}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor={idAgendamento}>Agendamento</FieldLabel>
						<Input
							id={idAgendamento}
							type="datetime-local"
							disabled={desabilitado}
							{...form.register("agendamento")}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor={idPrevisao}>Previsão de conclusão</FieldLabel>
						<Input
							id={idPrevisao}
							type="date"
							disabled={desabilitado}
							{...form.register("previsaoconclusao")}
						/>
					</Field>
					<Field>
						<FieldLabel>Orçamento</FieldLabel>
						<Controller
							control={form.control}
							name="orcamento"
							render={({ field }) => (
								<Select
									value={String(field.value ?? 0)}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={desabilitado}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0">Não</SelectItem>
										<SelectItem value="1">Sim</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</Field>
					<Field>
						<FieldLabel>Condição de pagamento</FieldLabel>
						<Controller
							control={form.control}
							name="idcondicaopagamento"
							render={({ field }) => (
								<Combobox
									options={opcoesCondicoes}
									value={field.value ?? ""}
									onChange={(value) => field.onChange(value || null)}
									placeholder="Selecione"
									searchPlaceholder="Buscar..."
									emptyMessage="Nenhuma condição encontrada."
									disabled={desabilitado}
								/>
							)}
						/>
					</Field>
					<Field>
						<FieldLabel>Tipo de documento</FieldLabel>
						<Controller
							control={form.control}
							name="idtipodocumentofinanceiro"
							render={({ field }) => (
								<Combobox
									options={opcoesTiposDocumento}
									value={field.value ?? ""}
									onChange={(value) => field.onChange(value || null)}
									placeholder="Selecione"
									searchPlaceholder="Buscar..."
									emptyMessage="Nenhum tipo encontrado."
									disabled={desabilitado}
								/>
							)}
						/>
					</Field>
				</div>
			</FieldSet>

			<FieldSet>
				<FieldLegend>Problema e observações</FieldLegend>
				<div className="grid grid-cols-1 gap-4">
					<Field>
						<FieldLabel htmlFor={idProblema}>Problema descrito</FieldLabel>
						<Textarea
							id={idProblema}
							rows={3}
							disabled={desabilitado}
							{...form.register("problemadescrito")}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor={idLaudo}>Laudo técnico</FieldLabel>
						<Textarea
							id={idLaudo}
							rows={3}
							disabled={desabilitado}
							{...form.register("laudotecnico")}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor={idObs}>Observação</FieldLabel>
						<Textarea
							id={idObs}
							rows={2}
							disabled={desabilitado}
							{...form.register("observacao")}
						/>
					</Field>
				</div>
			</FieldSet>

			{mostrarVeiculoEquipamento && (
				<FieldSet>
					<FieldLegend>Veículo / equipamento</FieldLegend>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Field>
							<FieldLabel htmlFor={idMarca}>Marca</FieldLabel>
							<Input
								id={idMarca}
								disabled={desabilitado}
								{...form.register("marca")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={idModelo}>Modelo</FieldLabel>
							<Input
								id={idModelo}
								disabled={desabilitado}
								{...form.register("modelo")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={idPlaca}>Placa</FieldLabel>
							<Input
								id={idPlaca}
								disabled={desabilitado}
								{...form.register("placa")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={idRenavam}>Renavam</FieldLabel>
							<Input
								id={idRenavam}
								disabled={desabilitado}
								{...form.register("renavam")}
							/>
						</Field>
					</div>
				</FieldSet>
			)}

			{extrasAtivos.length > 0 && (
				<FieldSet>
					<FieldLegend>Campos extras</FieldLegend>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{extrasAtivos.map((extra) => (
							<Field key={extra.campo}>
								<FieldLabel htmlFor={`os-${extra.campo}`}>
									{extra.nome}
									{extra.obrigatorio ? " *" : ""}
								</FieldLabel>
								<Input
									id={`os-${extra.campo}`}
									disabled={desabilitado}
									aria-required={extra.obrigatorio}
									{...form.register(extra.campo)}
								/>
							</Field>
						))}
					</div>
				</FieldSet>
			)}
		</FieldGroup>
	);
}
