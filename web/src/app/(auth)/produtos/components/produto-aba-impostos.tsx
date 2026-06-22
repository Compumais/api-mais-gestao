"use client";

import { useQuery } from "@tanstack/react-query";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Combobox } from "@/components/ui/combobox";
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
import { useEmpresa } from "@/hooks/use-empresa";
import type { ProdutoFormData } from "@/schemas/produtos.schema";
import { cestService } from "@/services/cest.service";
import { CampoCfopProduto } from "./campo-cfop-produto";

type ProdutoAbaImpostosProps = {
	register: UseFormRegister<ProdutoFormData>;
	setValue: UseFormSetValue<ProdutoFormData>;
	watch: UseFormWatch<ProdutoFormData>;
	errors: FieldErrors<ProdutoFormData>;
};

export function ProdutoAbaImpostos({
	register,
	setValue,
	watch,
	errors,
}: ProdutoAbaImpostosProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const origem = watch("origem");
	const idcfopentrada = watch("idcfopentrada");
	const idcfopsaida = watch("idcfopsaida");
	const idcest = watch("idcest");

	const { data: cests = [], isLoading: carregandoCests } = useQuery({
		queryKey: ["cests", empresa?.id, "produto"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return cestService.listarTodos({ idempresa: empresa.id });
		},
		enabled: !!empresa,
	});

	const opcoesCest = cests.map((cest) => ({
		value: cest.id,
		label: `${cest.codigo} - ${cest.descricao}`,
	}));

	return (
		<FieldGroup>
			<div className="space-y-6">
				<section className="space-y-4">
					<h3 className="text-base font-semibold">Classificação fiscal</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.ncm}>
							<FieldLabel htmlFor="ncm">NCM *</FieldLabel>
							<Input
								id="ncm"
								placeholder="Ex.: 22021000"
								maxLength={10}
								aria-invalid={!!errors.ncm}
								{...register("ncm")}
							/>
							<FieldError errors={errors.ncm ? [errors.ncm] : []} />
						</Field>

						<Field data-invalid={!!errors.origem}>
							<FieldLabel htmlFor="origem">Origem da mercadoria *</FieldLabel>
							<Select
								value={origem?.toString()}
								onValueChange={(value) => setValue("origem", Number(value))}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione a origem" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">0 - Nacional</SelectItem>
									<SelectItem value="1">
										1 - Estrangeira (importação direta)
									</SelectItem>
									<SelectItem value="2">
										2 - Estrangeira (adquirida no mercado interno)
									</SelectItem>
									<SelectItem value="3">
										3 - Nacional (conteúdo importação {'>'} 40%)
									</SelectItem>
									<SelectItem value="4">
										4 - Nacional (processos produtivos básicos)
									</SelectItem>
									<SelectItem value="5">
										5 - Nacional (conteúdo importação ≤ 40%)
									</SelectItem>
									<SelectItem value="6">
										6 - Estrangeira (importação direta, sem similar)
									</SelectItem>
									<SelectItem value="7">
										7 - Estrangeira (mercado interno, sem similar)
									</SelectItem>
									<SelectItem value="8">
										8 - Nacional (conteúdo importação {'>'} 70%)
									</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={errors.origem ? [errors.origem] : []} />
						</Field>

						<Field data-invalid={!!errors.idcest}>
							<FieldLabel htmlFor="idcest">CEST</FieldLabel>
							<Combobox
								options={opcoesCest}
								value={idcest ?? ""}
								onChange={(valor) =>
									setValue("idcest", valor || null, { shouldValidate: true })
								}
								placeholder={
									carregandoCests ? "Carregando..." : "Selecione o CEST"
								}
								searchPlaceholder="Buscar CEST..."
								emptyMessage="Nenhum CEST encontrado"
							/>
							<FieldError errors={errors.idcest ? [errors.idcest] : []} />
						</Field>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">CFOP</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<CampoCfopProduto
							id="idcfopentrada"
							label="CFOP de entrada"
							value={idcfopentrada}
							tipomovimento="E"
							onChange={(valor) =>
								setValue("idcfopentrada", valor || null, {
									shouldValidate: true,
								})
							}
							erro={errors.idcfopentrada?.message}
						/>
						<CampoCfopProduto
							id="idcfopsaida"
							label="CFOP de saída"
							value={idcfopsaida}
							tipomovimento="S"
							onChange={(valor) =>
								setValue("idcfopsaida", valor || null, {
									shouldValidate: true,
								})
							}
							erro={errors.idcfopsaida?.message}
						/>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">ICMS</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.situacaotributariasnentrada}>
							<FieldLabel htmlFor="situacaotributariasnentrada">
								CST/CSOSN entrada
							</FieldLabel>
							<Input
								id="situacaotributariasnentrada"
								placeholder="Ex.: 102 ou 00"
								type="number"
								maxLength={3}
								{...register("situacaotributariasnentrada")}
							/>
							<FieldError
								errors={
									errors.situacaotributariasnentrada
										? [errors.situacaotributariasnentrada]
										: []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.situacaotributariasn}>
							<FieldLabel htmlFor="situacaotributariasn">
								CST/CSOSN saída
							</FieldLabel>
							<Input
								id="situacaotributariasn"
								placeholder="Ex.: 102 ou 00"
								type="number"
								maxLength={3}
								{...register("situacaotributariasn")}
							/>
							<FieldError
								errors={
									errors.situacaotributariasn
										? [errors.situacaotributariasn]
										: []
								}
							/>
						</Field>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">PIS / COFINS</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.cstpisentrada}>
							<FieldLabel htmlFor="cstpisentrada">CST PIS entrada</FieldLabel>
							<Input
								id="cstpisentrada"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstpisentrada")}
							/>
							<FieldError
								errors={errors.cstpisentrada ? [errors.cstpisentrada] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.cstcofinsentrada}>
							<FieldLabel htmlFor="cstcofinsentrada">
								CST COFINS entrada
							</FieldLabel>
							<Input
								id="cstcofinsentrada"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstcofinsentrada")}
							/>
							<FieldError
								errors={
									errors.cstcofinsentrada ? [errors.cstcofinsentrada] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.cstpis}>
							<FieldLabel htmlFor="cstpis">CST PIS saída</FieldLabel>
							<Input
								id="cstpis"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstpis")}
							/>
							<FieldError errors={errors.cstpis ? [errors.cstpis] : []} />
						</Field>

						<Field data-invalid={!!errors.cstcofins}>
							<FieldLabel htmlFor="cstcofins">CST COFINS saída</FieldLabel>
							<Input
								id="cstcofins"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstcofins")}
							/>
							<FieldError errors={errors.cstcofins ? [errors.cstcofins] : []} />
						</Field>
					</div>
				</section>
			</div>
		</FieldGroup>
	);
}
