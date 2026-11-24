"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type EquipamentoFormData,
	equipamentoFormSchema,
} from "@/schemas/equipamento.schema";
import {
	type Equipamento,
	equipamentoService,
} from "@/services/equipamento.service";

type Props = {
	modo: "criar" | "editar";
	equipamento?: Equipamento;
};

export function EquipamentoForm({ modo, equipamento }: Props) {
	const { empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const alocado = equipamento?.situacao === "alocado";

	const form = useForm<EquipamentoFormData>({
		resolver: zodResolver(equipamentoFormSchema),
		defaultValues: {
			codigo: equipamento?.codigo ?? "",
			descricao: equipamento?.descricao ?? "",
			numeroserie: equipamento?.numeroserie ?? "",
			situacao:
				equipamento?.situacao === "inativo" ||
				equipamento?.situacao === "alocado"
					? equipamento.situacao
					: "disponivel",
			precodiaria: Number(equipamento?.precodiaria ?? 0),
			precosemanal: Number(equipamento?.precosemanal ?? 0),
			precoquinzenal: Number(equipamento?.precoquinzenal ?? 0),
			precomensal: Number(equipamento?.precomensal ?? 0),
			observacao: equipamento?.observacao ?? "",
		},
	});

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: modo === "criar",
		fetchFn: equipamentoService.buscarProximoCodigo,
		setValue: form.setValue,
		valorCodigoAtual: form.watch("codigo"),
	});

	const salvar = useMutation({
		mutationFn: (dados: EquipamentoFormData) => {
			const payload = {
				idempresa: empresa!.id,
				codigo: dados.codigo,
				descricao: dados.descricao,
				numeroserie: dados.numeroserie || null,
				situacao: dados.situacao,
				precodiaria: dados.precodiaria,
				precosemanal: dados.precosemanal,
				precoquinzenal: dados.precoquinzenal,
				precomensal: dados.precomensal,
				observacao: dados.observacao || null,
			};
			return modo === "criar"
				? equipamentoService.criar(payload)
				: equipamentoService.atualizar(equipamento!.id, payload);
		},
		onSuccess: () => {
			toast.success(
				modo === "criar" ? "Equipamento criado" : "Equipamento atualizado",
			);
			queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
			router.push("/equipamentos");
		},
		onError: (erro: Error) => toast.error(erro.message || "Falha ao salvar"),
	});

	return (
		<form
			className="grid gap-4 md:grid-cols-2"
			onSubmit={form.handleSubmit((dados) => salvar.mutate(dados))}
		>
			<div>
				<Label htmlFor="codigo">Código</Label>
				<Input id="codigo" {...form.register("codigo")} />
				{form.formState.errors.codigo && (
					<p className="text-sm text-destructive">
						{form.formState.errors.codigo.message}
					</p>
				)}
			</div>
			<div>
				<Label htmlFor="descricao">Descrição</Label>
				<Input id="descricao" {...form.register("descricao")} />
				{form.formState.errors.descricao && (
					<p className="text-sm text-destructive">
						{form.formState.errors.descricao.message}
					</p>
				)}
			</div>
			<div>
				<Label htmlFor="numeroserie">Número de série</Label>
				<Input id="numeroserie" {...form.register("numeroserie")} />
			</div>
			<div>
				<Label>Situação</Label>
				<Controller
					control={form.control}
					name="situacao"
					render={({ field }) => (
						<Select
							value={field.value}
							onValueChange={field.onChange}
							disabled={alocado}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="disponivel">Disponível</SelectItem>
								<SelectItem value="inativo">Inativo</SelectItem>
								{alocado && <SelectItem value="alocado">Alocado</SelectItem>}
							</SelectContent>
						</Select>
					)}
				/>
			</div>
			<div>
				<Label>Diária</Label>
				<Controller
					control={form.control}
					name="precodiaria"
					render={({ field }) => (
						<MoneyInput
							value={field.value}
							onChange={(valor) => field.onChange(Number(valor || 0))}
						/>
					)}
				/>
			</div>
			<div>
				<Label>Semanal</Label>
				<Controller
					control={form.control}
					name="precosemanal"
					render={({ field }) => (
						<MoneyInput
							value={field.value}
							onChange={(valor) => field.onChange(Number(valor || 0))}
						/>
					)}
				/>
			</div>
			<div>
				<Label>Quinzenal</Label>
				<Controller
					control={form.control}
					name="precoquinzenal"
					render={({ field }) => (
						<MoneyInput
							value={field.value}
							onChange={(valor) => field.onChange(Number(valor || 0))}
						/>
					)}
				/>
			</div>
			<div>
				<Label>Mensal</Label>
				<Controller
					control={form.control}
					name="precomensal"
					render={({ field }) => (
						<MoneyInput
							value={field.value}
							onChange={(valor) => field.onChange(Number(valor || 0))}
						/>
					)}
				/>
			</div>
			<div className="md:col-span-2">
				<Label htmlFor="observacao">Observação</Label>
				<Textarea id="observacao" {...form.register("observacao")} />
			</div>
			<div className="md:col-span-2 flex gap-2">
				<Button type="submit" disabled={salvar.isPending}>
					Salvar
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/equipamentos")}
				>
					Voltar
				</Button>
			</div>
		</form>
	);
}
