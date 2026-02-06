"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAtualizarSecaoConfiguracao } from "@/hooks/use-configuracao";
import {
	type ConfiguracaoNotificacoesFormData,
	configuracaoNotificacoesSchema,
} from "@/schemas/configuracao.schema";
import type { Configuracao } from "@/services/configuracao.service";

interface NotificacoesFormProps {
	configuracao: Configuracao | undefined;
	idempresa: string;
}

const valoresPadrao: ConfiguracaoNotificacoesFormData = {
	alertasFinanceiros: {
		vencimentoContas: {
			habilitado: false,
			diasAntes: 7,
		},
		saldoBaixo: {
			habilitado: false,
			valorMinimo: "0",
		},
		transferenciasAcimaValor: {
			habilitado: false,
			valorLimite: "0",
		},
		conciliacoesPendentes: {
			habilitado: false,
			diasPendentes: 30,
		},
	},
	notificacoesEmail: {
		relatoriosAutomaticos: {
			habilitado: false,
			frequencia: null,
			horario: "08:00",
		},
		resumoMovimentacoes: {
			habilitado: false,
			frequencia: null,
		},
		alertasVencimento: {
			habilitado: false,
			diasAntes: 7,
		},
	},
};

export function NotificacoesForm({
	configuracao,
	idempresa,
}: NotificacoesFormProps) {
	const atualizarMutation = useAtualizarSecaoConfiguracao();

	const form = useForm<ConfiguracaoNotificacoesFormData>({
		resolver: zodResolver(configuracaoNotificacoesSchema),
		defaultValues: valoresPadrao,
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (configuracao?.notificacoes) {
			const notificacoes =
				configuracao.notificacoes as ConfiguracaoNotificacoesFormData;
			form.reset({
				alertasFinanceiros: {
					vencimentoContas:
						notificacoes.alertasFinanceiros?.vencimentoContas ||
						valoresPadrao.alertasFinanceiros.vencimentoContas,
					saldoBaixo:
						notificacoes.alertasFinanceiros?.saldoBaixo ||
						valoresPadrao.alertasFinanceiros.saldoBaixo,
					transferenciasAcimaValor:
						notificacoes.alertasFinanceiros?.transferenciasAcimaValor ||
						valoresPadrao.alertasFinanceiros.transferenciasAcimaValor,
					conciliacoesPendentes:
						notificacoes.alertasFinanceiros?.conciliacoesPendentes ||
						valoresPadrao.alertasFinanceiros.conciliacoesPendentes,
				},
				notificacoesEmail: {
					relatoriosAutomaticos:
						notificacoes.notificacoesEmail?.relatoriosAutomaticos ||
						valoresPadrao.notificacoesEmail.relatoriosAutomaticos,
					resumoMovimentacoes:
						notificacoes.notificacoesEmail?.resumoMovimentacoes ||
						valoresPadrao.notificacoesEmail.resumoMovimentacoes,
					alertasVencimento:
						notificacoes.notificacoesEmail?.alertasVencimento ||
						valoresPadrao.notificacoesEmail.alertasVencimento,
				},
			});
		}
	}, [configuracao, form]);

	const onSubmit = (data: ConfiguracaoNotificacoesFormData) => {
		atualizarMutation.mutate({
			idempresa,
			secao: "notificacoes",
			dados: data,
		});
	};

	const vencimentoContasHabilitado = watch(
		"alertasFinanceiros.vencimentoContas.habilitado",
	);
	const saldoBaixoHabilitado = watch(
		"alertasFinanceiros.saldoBaixo.habilitado",
	);
	const transferenciasHabilitado = watch(
		"alertasFinanceiros.transferenciasAcimaValor.habilitado",
	);
	const conciliacoesHabilitado = watch(
		"alertasFinanceiros.conciliacoesPendentes.habilitado",
	);
	const relatoriosHabilitado = watch(
		"notificacoesEmail.relatoriosAutomaticos.habilitado",
	);
	const resumoHabilitado = watch(
		"notificacoesEmail.resumoMovimentacoes.habilitado",
	);
	const alertasVencimentoHabilitado = watch(
		"notificacoesEmail.alertasVencimento.habilitado",
	);

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-6 rounded-lg border bg-card p-6">
					<div>
						<h2 className="text-lg font-semibold mb-4">Alertas Financeiros</h2>
						<div className="space-y-4">
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="vencimento-contas"
										checked={vencimentoContasHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"alertasFinanceiros.vencimentoContas.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="vencimento-contas"
										className="cursor-pointer"
									>
										Vencimento de contas
									</FieldLabel>
								</div>
								{vencimentoContasHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Input
											type="number"
											min="1"
											max="365"
											placeholder="Dias antes"
											{...register(
												"alertasFinanceiros.vencimentoContas.diasAntes",
												{
													valueAsNumber: true,
												},
											)}
										/>
										<FieldError
											errors={
												errors.alertasFinanceiros?.vencimentoContas?.diasAntes
													? [
															errors.alertasFinanceiros.vencimentoContas
																.diasAntes,
														]
													: []
											}
										/>
									</div>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="saldo-baixo"
										checked={saldoBaixoHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"alertasFinanceiros.saldoBaixo.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel htmlFor="saldo-baixo" className="cursor-pointer">
										Saldo baixo nas contas
									</FieldLabel>
								</div>
								{saldoBaixoHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Input
											type="number"
											step="0.01"
											min="0"
											placeholder="Valor mínimo"
											{...register("alertasFinanceiros.saldoBaixo.valorMinimo")}
										/>
										<FieldError
											errors={
												errors.alertasFinanceiros?.saldoBaixo?.valorMinimo
													? [errors.alertasFinanceiros.saldoBaixo.valorMinimo]
													: []
											}
										/>
									</div>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="transferencias-acima-valor"
										checked={transferenciasHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"alertasFinanceiros.transferenciasAcimaValor.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="transferencias-acima-valor"
										className="cursor-pointer"
									>
										Transferências acima de valor
									</FieldLabel>
								</div>
								{transferenciasHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Input
											type="number"
											step="0.01"
											min="0"
											placeholder="Valor limite"
											{...register(
												"alertasFinanceiros.transferenciasAcimaValor.valorLimite",
											)}
										/>
										<FieldError
											errors={
												errors.alertasFinanceiros?.transferenciasAcimaValor
													?.valorLimite
													? [
															errors.alertasFinanceiros.transferenciasAcimaValor
																.valorLimite,
														]
													: []
											}
										/>
									</div>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="conciliacoes-pendentes"
										checked={conciliacoesHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"alertasFinanceiros.conciliacoesPendentes.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="conciliacoes-pendentes"
										className="cursor-pointer"
									>
										Conciliações pendentes
									</FieldLabel>
								</div>
								{conciliacoesHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Input
											type="number"
											min="1"
											max="365"
											placeholder="Dias pendentes"
											{...register(
												"alertasFinanceiros.conciliacoesPendentes.diasPendentes",
												{
													valueAsNumber: true,
												},
											)}
										/>
										<FieldError
											errors={
												errors.alertasFinanceiros?.conciliacoesPendentes
													?.diasPendentes
													? [
															errors.alertasFinanceiros.conciliacoesPendentes
																.diasPendentes,
														]
													: []
											}
										/>
									</div>
								)}
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">
							Notificações por Email
						</h2>
						<div className="space-y-4">
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="relatorios-automaticos"
										checked={relatoriosHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"notificacoesEmail.relatoriosAutomaticos.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="relatorios-automaticos"
										className="cursor-pointer"
									>
										Relatórios automáticos
									</FieldLabel>
								</div>
								{relatoriosHabilitado && (
									<div className="mt-2 ml-7 space-y-2 pr-8 pl-4">
										<Select
											value={
												watch(
													"notificacoesEmail.relatoriosAutomaticos.frequencia",
												) || ""
											}
											onValueChange={(value) =>
												setValue(
													"notificacoesEmail.relatoriosAutomaticos.frequencia",
													value === ""
														? null
														: (value as "diario" | "semanal" | "mensal"),
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Frequência" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="diario">Diário</SelectItem>
												<SelectItem value="semanal">Semanal</SelectItem>
												<SelectItem value="mensal">Mensal</SelectItem>
											</SelectContent>
										</Select>
										<Input
											type="time"
											{...register(
												"notificacoesEmail.relatoriosAutomaticos.horario",
											)}
										/>
									</div>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="resumo-movimentacoes"
										checked={resumoHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"notificacoesEmail.resumoMovimentacoes.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="resumo-movimentacoes"
										className="cursor-pointer"
									>
										Resumo de movimentações
									</FieldLabel>
								</div>
								{resumoHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Select
											value={
												watch(
													"notificacoesEmail.resumoMovimentacoes.frequencia",
												) || ""
											}
											onValueChange={(value) =>
												setValue(
													"notificacoesEmail.resumoMovimentacoes.frequencia",
													value === ""
														? null
														: (value as "diario" | "semanal" | "mensal"),
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Frequência" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="diario">Diário</SelectItem>
												<SelectItem value="semanal">Semanal</SelectItem>
												<SelectItem value="mensal">Mensal</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="alertas-vencimento"
										checked={alertasVencimentoHabilitado}
										onCheckedChange={(checked) =>
											setValue(
												"notificacoesEmail.alertasVencimento.habilitado",
												!!checked,
											)
										}
									/>
									<FieldLabel
										htmlFor="alertas-vencimento"
										className="cursor-pointer"
									>
										Alertas de vencimento
									</FieldLabel>
								</div>
								{alertasVencimentoHabilitado && (
									<div className="mt-2 ml-7 pr-8 pl-4">
										<Input
											type="number"
											min="1"
											max="365"
											placeholder="Dias antes"
											{...register(
												"notificacoesEmail.alertasVencimento.diasAntes",
												{
													valueAsNumber: true,
												},
											)}
										/>
										<FieldError
											errors={
												errors.notificacoesEmail?.alertasVencimento?.diasAntes
													? [
															errors.notificacoesEmail.alertasVencimento
																.diasAntes,
														]
													: []
											}
										/>
									</div>
								)}
							</Field>
						</div>
					</div>

					<div className="flex justify-end pt-4 border-t">
						<Button type="submit" disabled={atualizarMutation.isPending}>
							{atualizarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</div>
			</FieldGroup>
		</form>
	);
}
