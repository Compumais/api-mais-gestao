"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconChevronDown,
	IconChevronUp,
	IconCopy,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CardapioDeliveryFormData,
	cardapioDeliveryFormSchema,
} from "@/schemas/cardapio-delivery.schema";
import {
	type CardapioDelivery,
	cardapioDeliveryService,
} from "@/services/cardapio-delivery.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import { CardapioDeliveryImagemCampo } from "./cardapio-delivery-imagem-campo";

const DIAS: Array<{ id: string; label: string }> = [
	{ id: "sunday", label: "Domingo" },
	{ id: "monday", label: "Segunda" },
	{ id: "tuesday", label: "Terça" },
	{ id: "wednesday", label: "Quarta" },
	{ id: "thursday", label: "Quinta" },
	{ id: "friday", label: "Sexta" },
	{ id: "saturday", label: "Sábado" },
];

const TIPOS_CAMPO = [
	{ id: "modalidade", label: "Tipo de pedido (entrega/retirada)" },
	{ id: "endereco", label: "Endereço" },
	{ id: "pagamento", label: "Forma de pagamento" },
	{ id: "documento", label: "CPF/CNPJ" },
	{ id: "observacao", label: "Observação" },
	{ id: "texto", label: "Texto livre" },
	{ id: "select", label: "Lista de opções" },
] as const;

function mapearCardapio(data: CardapioDelivery): CardapioDeliveryFormData {
	return {
		slug: data.slug,
		ativo: data.ativo === 1,
		corprimaria: data.corprimaria || "#c2410c",
		habilitadelivery: data.habilitadelivery === 1,
		habilitaretirada: data.habilitaretirada === 1,
		taxaentregapadrao: data.taxaentregapadrao ?? "0",
		bairrosentrega: data.bairrosentrega ?? [],
		pedidominimo: data.pedidominimo ?? "0",
		chavepix: data.chavepix,
		tempomedioentrega: data.tempomedioentrega,
		mensagemrodape: data.mensagemrodape,
		horario: {
			ativo: data.horario?.ativo === 1,
			modo: data.horario?.modo === "semanal" ? "semanal" : "simples",
			timezone: data.horario?.timezone || "America/Sao_Paulo",
			inicio: data.horario?.inicio ?? "18:00",
			fim: data.horario?.fim ?? "23:00",
			semanal: data.horario?.semanal ?? {},
			datasfechadas: data.horario?.datasfechadas ?? [],
			mensagem: data.horario?.mensagem ?? "",
		},
		camposfinalizacao: data.camposfinalizacao ?? [],
		idmeiospagamento: data.idmeiospagamento ?? [],
	};
}

type Props = {
	inicial: CardapioDelivery;
};

export function CardapioDeliveryForm({ inicial }: Props) {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [logo, setLogo] = useState<File | null>(null);
	const [banner, setBanner] = useState<File | null>(null);
	const [removerLogo, setRemoverLogo] = useState(false);
	const [removerBanner, setRemoverBanner] = useState(false);

	const form = useForm<CardapioDeliveryFormData>({
		resolver: zodResolver(cardapioDeliveryFormSchema),
		defaultValues: mapearCardapio(inicial),
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		control,
		formState: { errors },
	} = form;

	const campos = useFieldArray({ control, name: "camposfinalizacao" });
	const bairros = useFieldArray({ control, name: "bairrosentrega" });

	const { data: meios = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id, "cardapio"],
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa?.id ?? "",
				inativo: 0,
			}),
		enabled: Boolean(empresa?.id),
	});

	const slug = watch("slug");
	const ativo = watch("ativo");
	const corprimaria = watch("corprimaria");
	const habilitadelivery = watch("habilitadelivery");
	const habilitaretirada = watch("habilitaretirada");
	const horarioAtivo = watch("horario.ativo");
	const horarioModo = watch("horario.modo");
	const meiosSelecionados = watch("idmeiospagamento");
	const linkPublico = useMemo(() => {
		if (typeof window === "undefined") return "";
		return `${window.location.origin}/cardapio/${slug}`;
	}, [slug]);

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (dados: CardapioDeliveryFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			let atual = await cardapioDeliveryService.atualizar(empresa.id, {
				slug: dados.slug,
				ativo: dados.ativo ? 1 : 0,
				corprimaria: dados.corprimaria,
				habilitadelivery: dados.habilitadelivery ? 1 : 0,
				habilitaretirada: dados.habilitaretirada ? 1 : 0,
				taxaentregapadrao: dados.taxaentregapadrao,
				bairrosentrega: dados.bairrosentrega,
				pedidominimo: dados.pedidominimo,
				chavepix: dados.chavepix || null,
				tempomedioentrega: dados.tempomedioentrega || null,
				mensagemrodape: dados.mensagemrodape || null,
				horario: {
					ativo: dados.horario.ativo ? 1 : 0,
					modo: dados.horario.modo,
					timezone: dados.horario.timezone,
					inicio: dados.horario.inicio,
					fim: dados.horario.fim,
					semanal: dados.horario.semanal,
					datasfechadas: dados.horario.datasfechadas.filter(Boolean),
					mensagem: dados.horario.mensagem,
				},
				camposfinalizacao: dados.camposfinalizacao.map((campo, index) => ({
					...campo,
					ordem: index,
				})),
				idmeiospagamento: dados.idmeiospagamento,
			});
			if (removerLogo) {
				atual = await cardapioDeliveryService.removerImagem(empresa.id, "logo");
			} else if (logo) {
				atual = await cardapioDeliveryService.enviarImagem(
					empresa.id,
					"logo",
					logo,
				);
			}
			if (removerBanner) {
				atual = await cardapioDeliveryService.removerImagem(
					empresa.id,
					"banner",
				);
			} else if (banner) {
				atual = await cardapioDeliveryService.enviarImagem(
					empresa.id,
					"banner",
					banner,
				);
			}
			return atual;
		},
		onSuccess: (data) => {
			queryClient.setQueryData(["cardapio-delivery", empresa?.id], data);
			setLogo(null);
			setBanner(null);
			setRemoverLogo(false);
			setRemoverBanner(false);
			toast.success("Cardápio salvo");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	return (
		<form
			onSubmit={handleSubmit((dados) => salvar(dados))}
			className="space-y-8 px-4 pb-10"
		>
			<section className="space-y-4 rounded-lg border bg-card p-4">
				<h2 className="text-lg font-semibold">Link público</h2>
				<div className="flex flex-wrap items-center gap-3">
					<Switch
						checked={ativo}
						onCheckedChange={(checked) => setValue("ativo", checked === true)}
					/>
					<Label>Cardápio ativo</Label>
				</div>
				<Field data-invalid={!!errors.slug}>
					<FieldLabel htmlFor="slug">Endereço</FieldLabel>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input id="slug" {...register("slug")} />
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void navigator.clipboard.writeText(linkPublico);
								toast.success("Link copiado");
							}}
						>
							<IconCopy className="mr-2 size-4" />
							Copiar link
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">{linkPublico}</p>
					<FieldError errors={errors.slug ? [errors.slug] : []} />
				</Field>
			</section>

			<section className="space-y-4 rounded-lg border bg-card p-4">
				<h2 className="text-lg font-semibold">Visual</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<CardapioDeliveryImagemCampo
						titulo="Logo"
						referencia={inicial.logourl}
						arquivo={logo}
						remover={removerLogo}
						onArquivo={setLogo}
						onRemover={setRemoverLogo}
					/>
					<CardapioDeliveryImagemCampo
						titulo="Banner"
						referencia={inicial.bannerurl}
						arquivo={banner}
						remover={removerBanner}
						onArquivo={setBanner}
						onRemover={setRemoverBanner}
					/>
				</div>
				<Field>
					<FieldLabel htmlFor="corprimaria">Cor primária</FieldLabel>
					<div className="flex items-center gap-3">
						<input
							id="corprimaria"
							type="color"
							value={corprimaria}
							onChange={(event) => setValue("corprimaria", event.target.value)}
							className="h-10 w-14 cursor-pointer rounded border bg-transparent"
						/>
						<Input
							value={corprimaria}
							onChange={(event) => setValue("corprimaria", event.target.value)}
						/>
					</div>
				</Field>
			</section>

			<section className="space-y-4 rounded-lg border bg-card p-4">
				<h2 className="text-lg font-semibold">Operação</h2>
				<div className="flex flex-wrap gap-6">
					<div className="flex items-center gap-3">
						<Switch
							checked={habilitadelivery}
							onCheckedChange={(checked) =>
								setValue("habilitadelivery", checked === true)
							}
						/>
						<Label>Delivery</Label>
					</div>
					<div className="flex items-center gap-3">
						<Switch
							checked={habilitaretirada}
							onCheckedChange={(checked) =>
								setValue("habilitaretirada", checked === true)
							}
						/>
						<Label>Retirada</Label>
					</div>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Field>
						<FieldLabel>Taxa de entrega padrão</FieldLabel>
						<MoneyInput
							value={watch("taxaentregapadrao")}
							onChange={(value) => setValue("taxaentregapadrao", value)}
						/>
					</Field>
					<Field>
						<FieldLabel>Pedido mínimo</FieldLabel>
						<MoneyInput
							value={watch("pedidominimo")}
							onChange={(value) => setValue("pedidominimo", value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="tempomedioentrega">Tempo médio</FieldLabel>
						<Input
							id="tempomedioentrega"
							placeholder="30-45 minutos"
							{...register("tempomedioentrega")}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="chavepix">Chave PIX</FieldLabel>
					<Input id="chavepix" {...register("chavepix")} />
				</Field>
				<Field>
					<FieldLabel htmlFor="mensagemrodape">Mensagem do checkout</FieldLabel>
					<Textarea id="mensagemrodape" {...register("mensagemrodape")} />
				</Field>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="font-medium">Bairros e taxas</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => bairros.append({ nome: "", taxa: 0 })}
						>
							<IconPlus className="mr-1 size-4" />
							Bairro
						</Button>
					</div>
					{bairros.fields.map((campo, index) => (
						<div key={campo.id} className="flex gap-2">
							<Input
								placeholder="Bairro"
								{...register(`bairrosentrega.${index}.nome`)}
							/>
							<Input
								type="number"
								min={0}
								step="0.01"
								placeholder="Taxa"
								{...register(`bairrosentrega.${index}.taxa`, {
									valueAsNumber: true,
								})}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => bairros.remove(index)}
							>
								<IconTrash className="size-4" />
							</Button>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4 rounded-lg border bg-card p-4">
				<h2 className="text-lg font-semibold">Horário</h2>
				<div className="flex items-center gap-3">
					<Switch
						checked={horarioAtivo}
						onCheckedChange={(checked) =>
							setValue("horario.ativo", checked === true)
						}
					/>
					<Label>Restringir pedidos ao horário</Label>
				</div>
				<Select
					value={horarioModo}
					onValueChange={(value) =>
						setValue("horario.modo", value as "simples" | "semanal")
					}
				>
					<SelectTrigger className="w-56">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="simples">Horário único</SelectItem>
						<SelectItem value="semanal">Por dia da semana</SelectItem>
					</SelectContent>
				</Select>
				{horarioModo === "simples" ? (
					<div className="grid max-w-sm grid-cols-2 gap-3">
						<Field>
							<FieldLabel>Início</FieldLabel>
							<Input type="time" {...register("horario.inicio")} />
						</Field>
						<Field>
							<FieldLabel>Fim</FieldLabel>
							<Input type="time" {...register("horario.fim")} />
						</Field>
					</div>
				) : (
					<div className="space-y-2">
						{DIAS.map((dia) => {
							const atual = watch(`horario.semanal.${dia.id}`);
							return (
								<div key={dia.id} className="flex flex-wrap items-center gap-3">
									<Checkbox
										checked={!!atual?.ativo}
										onCheckedChange={(checked) =>
											setValue(`horario.semanal.${dia.id}`, {
												ativo: checked === true,
												inicio: atual?.inicio || "18:00",
												fim: atual?.fim || "23:00",
											})
										}
									/>
									<span className="w-24 text-sm">{dia.label}</span>
									<Input
										type="time"
										className="w-32"
										value={atual?.inicio || "18:00"}
										onChange={(event) =>
											setValue(`horario.semanal.${dia.id}`, {
												ativo: !!atual?.ativo,
												inicio: event.target.value,
												fim: atual?.fim || "23:00",
											})
										}
									/>
									<Input
										type="time"
										className="w-32"
										value={atual?.fim || "23:00"}
										onChange={(event) =>
											setValue(`horario.semanal.${dia.id}`, {
												ativo: !!atual?.ativo,
												inicio: atual?.inicio || "18:00",
												fim: event.target.value,
											})
										}
									/>
								</div>
							);
						})}
					</div>
				)}
				<Field>
					<FieldLabel>Mensagem quando fechado</FieldLabel>
					<Textarea {...register("horario.mensagem")} />
				</Field>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="font-medium">Datas fechadas</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								setValue("horario.datasfechadas", [
									...(watch("horario.datasfechadas") ?? []),
									"",
								])
							}
						>
							<IconPlus className="mr-1 size-4" />
							Data
						</Button>
					</div>
					{(watch("horario.datasfechadas") ?? []).map((data, index) => (
						<div key={`${data}-${index}`} className="flex gap-2">
							<Input
								type="date"
								value={data}
								onChange={(event) => {
									const lista = [...(watch("horario.datasfechadas") ?? [])];
									lista[index] = event.target.value;
									setValue("horario.datasfechadas", lista);
								}}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() =>
									setValue(
										"horario.datasfechadas",
										(watch("horario.datasfechadas") ?? []).filter(
											(_, i) => i !== index,
										),
									)
								}
							>
								<IconTrash className="size-4" />
							</Button>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4 rounded-lg border bg-card p-4">
				<h2 className="text-lg font-semibold">Meios de pagamento</h2>
				<p className="text-sm text-muted-foreground">
					Use os meios já cadastrados em Meios de pagamento.
				</p>
				<div className="grid gap-2 md:grid-cols-2">
					{meios.map((meio) => {
						const marcado = meiosSelecionados.includes(meio.id);
						return (
							<label
								key={meio.id}
								className="flex items-center gap-3 rounded-md border p-3"
							>
								<Checkbox
									checked={marcado}
									onCheckedChange={(checked) => {
										if (checked === true) {
											setValue("idmeiospagamento", [
												...meiosSelecionados,
												meio.id,
											]);
										} else {
											setValue(
												"idmeiospagamento",
												meiosSelecionados.filter((id) => id !== meio.id),
											);
										}
									}}
								/>
								<span>{meio.descricao}</span>
							</label>
						);
					})}
				</div>
			</section>

			<section className="space-y-4 rounded-lg border bg-card p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold">Campos do checkout</h2>
						<p className="text-sm text-muted-foreground">
							Nome e telefone são sempre obrigatórios. Os demais campos são
							configuráveis.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							campos.append({
								id: crypto.randomUUID(),
								tipo: "texto",
								rotulo: "Novo campo",
								obrigatorio: 0,
								ordem: campos.fields.length,
							})
						}
					>
						<IconPlus className="mr-1 size-4" />
						Campo
					</Button>
				</div>
				{campos.fields.map((campo, index) => (
					<div key={campo.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
						<Input placeholder="Rótulo" {...register(`camposfinalizacao.${index}.rotulo`)} />
						<Select
							value={watch(`camposfinalizacao.${index}.tipo`)}
							onValueChange={(value) =>
								setValue(
									`camposfinalizacao.${index}.tipo`,
									value as CardapioDeliveryFormData["camposfinalizacao"][number]["tipo"],
								)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TIPOS_CAMPO.map((tipo) => (
									<SelectItem key={tipo.id} value={tipo.id}>
										{tipo.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={watch(`camposfinalizacao.${index}.obrigatorio`) === 1}
								onCheckedChange={(checked) =>
									setValue(
										`camposfinalizacao.${index}.obrigatorio`,
										checked === true ? 1 : 0,
									)
								}
							/>
							Obrigatório
						</label>
						<div className="flex justify-end gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={index === 0}
								onClick={() => campos.move(index, index - 1)}
							>
								<IconChevronUp className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={index === campos.fields.length - 1}
								onClick={() => campos.move(index, index + 1)}
							>
								<IconChevronDown className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => campos.remove(index)}
							>
								<IconTrash className="size-4" />
							</Button>
						</div>
						{watch(`camposfinalizacao.${index}.tipo`) === "select" ? (
							<Input
								className="md:col-span-4"
								placeholder="Opções separadas por vírgula"
								value={(watch(`camposfinalizacao.${index}.opcoes`) ?? []).join(
									", ",
								)}
								onChange={(event) =>
									setValue(
										`camposfinalizacao.${index}.opcoes`,
										event.target.value
											.split(",")
											.map((opcao) => opcao.trim())
											.filter(Boolean),
									)
								}
							/>
						) : null}
					</div>
				))}
			</section>

			<div className="flex justify-end">
				<Button type="submit" disabled={isPending || !empresa}>
					{isPending ? "Salvando..." : "Salvar cardápio"}
				</Button>
			</div>
		</form>
	);
}
