"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CampoItemLc116Nfse } from "@/app/(auth)/nota-fiscal-servico/components/campo-item-lc116-nfse";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import { buildServicoPayload } from "@/schemas/servicos.mapper";
import {
	OPCOES_EXIGIBILIDADE_ISS,
	OPCOES_SITUACAO_ISS,
	SERVICO_FORM_DEFAULTS,
	type ServicoFormData,
	servicoFormSchema,
} from "@/schemas/servicos.schema";
import { planoContasService } from "@/services/plano-contas.service";
import { produtosService } from "@/services/produtos.service";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";

type ServicoFormProps = {
	modo?: "criar" | "editar";
	servicoId?: string;
	valoresIniciais?: Partial<ServicoFormData>;
};

export function ServicoForm(props: ServicoFormProps) {
	const formId = useId();
	const fid = (nome: string) => `${formId}-${nome}`;
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<ServicoFormData>({
		resolver: zodResolver(servicoFormSchema) as Resolver<ServicoFormData>,
		shouldUnregister: false,
		defaultValues: {
			...SERVICO_FORM_DEFAULTS,
			...(isEdicao && props.valoresIniciais ? props.valoresIniciais : {}),
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		control,
		getValues,
		formState: { errors },
	} = form;

	const codigo = watch("codigo");
	const idunidademedida = watch("idunidademedida");
	const preco = watch("preco");
	const iat = watch("iat");
	const itemrapido = watch("itemrapido");
	const podeserbrinde = watch("podeserbrinde");
	const ativo = watch("ativo");
	const incentivofiscal = watch("incentivofiscal");
	const enviamobile = watch("enviamobile");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: !isEdicao,
		fetchFn: produtosService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	const { data: unidadesData } = useQuery({
		queryKey: ["unidades-medida", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await unidadeMedidaService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { data: planosData, isLoading: carregandoPlanos } = useQuery({
		queryKey: ["plano-contas", "servico", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				listarTudo: true,
				tipomovimento: "E",
			});
		},
		enabled: !!empresa,
	});

	const { mutate: criarServico, isPending: isPendingCriar } = useMutation({
		mutationFn: produtosService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			queryClient.invalidateQueries({ queryKey: ["servicos"] });
			toast.success("Serviço cadastrado com sucesso!");
			router.push("/servicos");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar serviço");
		},
	});

	const { mutate: atualizarServico, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async ({
				idempresa,
				dados,
			}: {
				idempresa: string;
				dados: ReturnType<typeof buildServicoPayload>;
			}) => {
				if (!isEdicao || !props.servicoId) {
					throw new Error("ID do serviço é obrigatório para editar");
				}
				const { idempresa: _idempresa, ...payload } = dados;
				return await produtosService.atualizar(
					props.servicoId,
					payload,
					idempresa,
				);
			},
			onSuccess: (servico) => {
				queryClient.invalidateQueries({ queryKey: ["produtos"] });
				queryClient.invalidateQueries({ queryKey: ["servicos"] });
				if (props.servicoId) {
					queryClient.setQueryData(["produto", props.servicoId], servico);
					queryClient.setQueryData(["servico", props.servicoId], servico);
				}
				toast.success("Serviço atualizado com sucesso!");
				router.push("/servicos");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar serviço");
			},
		});

	const onSubmit = () => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}
		const payload = buildServicoPayload(getValues(), empresa.id);
		if (!isEdicao) {
			criarServico(payload);
			return;
		}
		atualizarServico({ idempresa: empresa.id, dados: payload });
	};

	const unidadesGlobais =
		unidadesData?.data.filter((unidade) => isUnidadeMedidaGlobal(unidade)) ??
		[];
	const unidadesEmpresa =
		unidadesData?.data.filter((unidade) => !isUnidadeMedidaGlobal(unidade)) ??
		[];
	const opcoesPlanoContas =
		planosData?.data.map((plano) => ({
			value: plano.id,
			label: `${plano.codigo ?? "—"} — ${plano.nome ?? plano.id}`,
		})) ?? [];

	const isPending = isPendingCriar || isPendingAtualizar;

	if (!empresa) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				Selecione uma empresa no menu superior para cadastrar serviços.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<Tabs defaultValue="geral" className="w-full">
				<TabsList className="mb-6">
					<TabsTrigger value="geral">Geral</TabsTrigger>
					<TabsTrigger value="impostos">Impostos</TabsTrigger>
					<TabsTrigger value="gourmet">Gourmet</TabsTrigger>
				</TabsList>

				<TabsContent value="geral">
					<FieldGroup>
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								<Field data-invalid={!!errors.codigo}>
									<FieldLabel htmlFor={fid("codigo")}>Código *</FieldLabel>
									<Input
										id={fid("codigo")}
										type="number"
										min={1}
										aria-invalid={!!errors.codigo}
										{...register("codigo", { valueAsNumber: true })}
									/>
									<FieldError errors={errors.codigo ? [errors.codigo] : []} />
								</Field>
								<div className="flex items-end gap-4 pb-2 md:col-span-3">
									<div className="flex items-center gap-2">
										<Checkbox
											id={fid("itemrapido")}
											checked={!!itemrapido}
											onCheckedChange={(checked) =>
												setValue("itemrapido", checked === true)
											}
										/>
										<Label htmlFor={fid("itemrapido")} className="font-normal">
											Item Rápido
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											id={fid("podeserbrinde")}
											checked={!!podeserbrinde}
											onCheckedChange={(checked) =>
												setValue("podeserbrinde", checked === true)
											}
										/>
										<Label
											htmlFor={fid("podeserbrinde")}
											className="font-normal"
										>
											Brinde
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											id={fid("ativo")}
											checked={!!ativo}
											onCheckedChange={(checked) =>
												setValue("ativo", checked === true)
											}
										/>
										<Label htmlFor={fid("ativo")} className="font-normal">
											Ativo
										</Label>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Field data-invalid={!!errors.nome}>
									<FieldLabel htmlFor={fid("nome")}>Nome *</FieldLabel>
									<Input
										id={fid("nome")}
										placeholder="Nome do serviço"
										aria-invalid={!!errors.nome}
										{...register("nome")}
									/>
									<FieldError errors={errors.nome ? [errors.nome] : []} />
								</Field>
								<Field data-invalid={!!errors.nomeecf}>
									<FieldLabel htmlFor={fid("nomeecf")}>Nome PDV</FieldLabel>
									<Input
										id={fid("nomeecf")}
										placeholder="Nome no PDV"
										aria-invalid={!!errors.nomeecf}
										{...register("nomeecf")}
									/>
									<FieldError errors={errors.nomeecf ? [errors.nomeecf] : []} />
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Field data-invalid={!!errors.idunidademedida}>
									<FieldLabel htmlFor={fid("idunidademedida")}>
										Unidade *
									</FieldLabel>
									<Select
										value={idunidademedida || undefined}
										onValueChange={(value) =>
											setValue("idunidademedida", value, {
												shouldValidate: true,
											})
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione a unidade" />
										</SelectTrigger>
										<SelectContent>
											{unidadesGlobais.length > 0 && (
												<SelectGroup>
													<SelectLabel>Padrão do sistema</SelectLabel>
													{unidadesGlobais.map((unidade) => (
														<SelectItem key={unidade.id} value={unidade.id}>
															{unidade.nome || unidade.codigo || unidade.id}
														</SelectItem>
													))}
												</SelectGroup>
											)}
											{unidadesEmpresa.length > 0 && (
												<SelectGroup>
													<SelectLabel>Da empresa</SelectLabel>
													{unidadesEmpresa.map((unidade) => (
														<SelectItem key={unidade.id} value={unidade.id}>
															{unidade.nome || unidade.codigo || unidade.id}
														</SelectItem>
													))}
												</SelectGroup>
											)}
										</SelectContent>
									</Select>
									<FieldError
										errors={
											errors.idunidademedida ? [errors.idunidademedida] : []
										}
									/>
								</Field>
								<Field data-invalid={!!errors.preco}>
									<FieldLabel htmlFor={fid("preco")}>Preço *</FieldLabel>
									<MoneyInput
										id={fid("preco")}
										value={preco}
										onChange={(value) =>
											setValue("preco", value, { shouldValidate: true })
										}
										aria-invalid={!!errors.preco}
									/>
									<FieldError errors={errors.preco ? [errors.preco] : []} />
								</Field>
								<Field data-invalid={!!errors.decimaispreco}>
									<FieldLabel htmlFor={fid("decimaispreco")}>
										Decimais preço
									</FieldLabel>
									<Select
										value={String(watch("decimaispreco") ?? 2)}
										onValueChange={(value) =>
											setValue("decimaispreco", Number(value))
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{[0, 1, 2, 3, 4].map((n) => (
												<SelectItem key={n} value={String(n)}>
													{n}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Field data-invalid={!!errors.iat}>
									<FieldLabel htmlFor={fid("iat")}>IAT</FieldLabel>
									<Select
										value={iat || "T"}
										onValueChange={(value) =>
											setValue("iat", value as "A" | "T")
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="A">A - Arredondamento</SelectItem>
											<SelectItem value="T">T - Truncamento</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<Field data-invalid={!!errors.codigolistalc11603}>
									<FieldLabel>Código lista LC 116/03</FieldLabel>
									<Controller
										control={control}
										name="codigolistalc11603"
										render={({ field }) => (
											<CampoItemLc116Nfse
												value={field.value ?? undefined}
												onChange={field.onChange}
												error={errors.codigolistalc11603}
											/>
										)}
									/>
								</Field>
								<Field data-invalid={!!errors.codigonbs}>
									<FieldLabel htmlFor={fid("codigonbs")}>NBS</FieldLabel>
									<Input
										id={fid("codigonbs")}
										inputMode="numeric"
										maxLength={9}
										placeholder="9 dígitos"
										{...register("codigonbs")}
									/>
									<FieldError
										errors={errors.codigonbs ? [errors.codigonbs] : []}
									/>
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Field data-invalid={!!errors.codigotributacaonacional}>
									<FieldLabel htmlFor={fid("codigotributacaonacional")}>
										Tributação nacional do ISSQN
									</FieldLabel>
									<Input
										id={fid("codigotributacaonacional")}
										inputMode="numeric"
										maxLength={6}
										placeholder="6 dígitos"
										{...register("codigotributacaonacional")}
									/>
									<FieldError
										errors={
											errors.codigotributacaonacional
												? [errors.codigotributacaonacional]
												: []
										}
									/>
								</Field>
								<Field data-invalid={!!errors.cicloposvenda}>
									<FieldLabel htmlFor={fid("cicloposvenda")}>
										Ciclo (dias) para notificar pós-venda
									</FieldLabel>
									<Input
										id={fid("cicloposvenda")}
										type="number"
										min={0}
										{...register("cicloposvenda", { valueAsNumber: true })}
									/>
								</Field>
								<Field data-invalid={!!errors.idplanocontas}>
									<FieldLabel>Plano de contas</FieldLabel>
									<Controller
										control={control}
										name="idplanocontas"
										render={({ field }) => (
											<Combobox
												options={opcoesPlanoContas}
												value={field.value ?? ""}
												onChange={(valor) => field.onChange(valor || null)}
												placeholder={
													carregandoPlanos
														? "Carregando..."
														: "Selecione o plano"
												}
												searchPlaceholder="Buscar plano..."
												emptyMessage="Nenhum plano encontrado."
												disabled={carregandoPlanos}
											/>
										)}
									/>
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								{(
									[
										["comissao", "% Comissão"],
										["comissaoavista", "% Comissão à vista"],
										["comissaoprazo", "% Comissão a prazo"],
										["percentualcomissaoquitacao", "% Comissão na quitação"],
									] as const
								).map(([campo, label]) => (
									<Field key={campo} data-invalid={!!errors[campo]}>
										<FieldLabel htmlFor={fid(campo)}>{label}</FieldLabel>
										<MoneyInput
											id={fid(campo)}
											value={watch(campo) ?? "0.00"}
											onChange={(value) => setValue(campo, value)}
										/>
									</Field>
								))}
							</div>

							<Field data-invalid={!!errors.observacoes}>
								<FieldLabel htmlFor={fid("observacoes")}>
									Observações
								</FieldLabel>
								<Textarea
									id={fid("observacoes")}
									rows={4}
									{...register("observacoes")}
								/>
							</Field>
						</div>
					</FieldGroup>
				</TabsContent>

				<TabsContent
					value="impostos"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<Tabs defaultValue="iss" className="w-full">
						<TabsList className="mb-4">
							<TabsTrigger value="iss">ISS</TabsTrigger>
							<TabsTrigger value="piscofins">PIS/COFINS</TabsTrigger>
						</TabsList>

						<TabsContent value="iss" className="space-y-4">
							<div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
								<Field>
									<FieldLabel>ISS</FieldLabel>
									<Select
										value={watch("situacaoiss") || "none"}
										onValueChange={(valor) =>
											setValue("situacaoiss", valor === "none" ? null : valor)
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">--selecione--</SelectItem>
											{OPCOES_SITUACAO_ISS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor={fid("aliquotaiss")}>
										Alíquota ISS
									</FieldLabel>
									<MoneyInput
										id={fid("aliquotaiss")}
										value={watch("aliquotaiss") ?? "0.00"}
										onChange={(value) => setValue("aliquotaiss", value)}
									/>
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-4 rounded-lg border p-4">
									<h3 className="text-sm font-semibold text-muted-foreground">
										NF-e
									</h3>
									<Field>
										<FieldLabel>Exigibilidade ISS</FieldLabel>
										<Select
											value={watch("exigibilidadeiss") || "1"}
											onValueChange={(valor) =>
												setValue("exigibilidadeiss", valor)
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{OPCOES_EXIGIBILIDADE_ISS.map((opcao) => (
													<SelectItem key={opcao.value} value={opcao.value}>
														{opcao.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor={fid("processoisencaoiss")}>
											Processo isenção ISS
										</FieldLabel>
										<Input
											id={fid("processoisencaoiss")}
											{...register("processoisencaoiss")}
										/>
									</Field>
									<div className="flex items-center gap-2">
										<Checkbox
											id={fid("incentivofiscal")}
											checked={!!incentivofiscal}
											onCheckedChange={(checked) =>
												setValue("incentivofiscal", checked === true)
											}
										/>
										<Label
											htmlFor={fid("incentivofiscal")}
											className="font-normal"
										>
											Incentivo fiscal
										</Label>
									</div>
								</div>
								<div className="space-y-4 rounded-lg border p-4">
									<h3 className="text-sm font-semibold text-muted-foreground">
										NFS-e
									</h3>
									<Field>
										<FieldLabel htmlFor={fid("codigomunicipalservico")}>
											Código municipal
										</FieldLabel>
										<Input
											id={fid("codigomunicipalservico")}
											{...register("codigomunicipalservico")}
										/>
									</Field>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="piscofins" className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-4 rounded-lg border p-4">
									<h3 className="text-sm font-semibold text-muted-foreground">
										PIS/COFINS — Saída
									</h3>
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={fid("cstpis")}>CST PIS</FieldLabel>
											<Input
												id={fid("cstpis")}
												maxLength={2}
												{...register("cstpis")}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={fid("cstcofins")}>
												CST COFINS
											</FieldLabel>
											<Input
												id={fid("cstcofins")}
												maxLength={2}
												{...register("cstcofins")}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={fid("aliquotapis")}>
												% PIS
											</FieldLabel>
											<MoneyInput
												id={fid("aliquotapis")}
												value={watch("aliquotapis") ?? "0.00"}
												onChange={(value) => setValue("aliquotapis", value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={fid("aliquotacofins")}>
												% COFINS
											</FieldLabel>
											<MoneyInput
												id={fid("aliquotacofins")}
												value={watch("aliquotacofins") ?? "0.00"}
												onChange={(value) => setValue("aliquotacofins", value)}
											/>
										</Field>
									</div>
								</div>
								<div className="space-y-4 rounded-lg border p-4">
									<h3 className="text-sm font-semibold text-muted-foreground">
										CFOPs
									</h3>
									<Controller
										control={control}
										name="idcfopsaida"
										render={({ field }) => (
											<CampoCfopProduto
												id={fid("idcfopsaida")}
												label="CFOP interna de Saída"
												value={field.value}
												tipomovimento="S"
												onChange={(valor) => field.onChange(valor || null)}
												erro={errors.idcfopsaida?.message}
											/>
										)}
									/>
									<Controller
										control={control}
										name="idcfopsaidaexterna"
										render={({ field }) => (
											<CampoCfopProduto
												id={fid("idcfopsaidaexterna")}
												label="CFOP externa de Saída"
												value={field.value}
												tipomovimento="S"
												onChange={(valor) => field.onChange(valor || null)}
												erro={errors.idcfopsaidaexterna?.message}
											/>
										)}
									/>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</TabsContent>

				<TabsContent value="gourmet">
					<div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-end">
						<div className="flex items-center gap-2">
							<Checkbox
								id={fid("enviamobile")}
								checked={!!enviamobile}
								onCheckedChange={(checked) =>
									setValue("enviamobile", checked === true)
								}
							/>
							<Label htmlFor={fid("enviamobile")} className="font-normal">
								Permite vender no Gourmet
							</Label>
						</div>
						<Field className="flex-1">
							<FieldLabel htmlFor={fid("tipoimpressaogourmet")}>
								Tipo de impressão
							</FieldLabel>
							<Input
								id={fid("tipoimpressaogourmet")}
								placeholder="Ex.: Cozinha, Bar..."
								{...register("tipoimpressaogourmet")}
							/>
						</Field>
					</div>
				</TabsContent>
			</Tabs>

			<div className="flex justify-end gap-2 pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/servicos")}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={isPending || !empresa}>
					{isPending
						? "Salvando..."
						: isEdicao
							? "Salvar alterações"
							: "Cadastrar serviço"}
				</Button>
			</div>
		</form>
	);
}
