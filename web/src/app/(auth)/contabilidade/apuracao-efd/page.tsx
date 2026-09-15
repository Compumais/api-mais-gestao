"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	criarAjusteApuracaoEfd,
	excluirAjusteApuracaoEfd,
	listarAjustesApuracaoEfd,
	mesAtualAnoMes,
	type NaturezaAjusteEfd,
	periodoMesCivil,
	type TipoAjusteEfd,
} from "@/services/efd.service";
import { PageContainer } from "../../components/page-container";

export default function ApuracaoEfdPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [anoMes, setAnoMes] = useState(mesAtualAnoMes);
	const [tipo, setTipo] = useState<TipoAjusteEfd>("icms");
	const [natureza, setNatureza] = useState<NaturezaAjusteEfd>("debito");
	const [codigoajuste, setCodigoajuste] = useState("");
	const [descricao, setDescricao] = useState("");
	const [valor, setValor] = useState("");

	const periodo = useMemo(() => periodoMesCivil(anoMes), [anoMes]);
	const competencia = periodo.dataInicio;

	const queryKey = ["efd-ajustes", empresa?.id, competencia];

	const { data: ajustes = [], isLoading } = useQuery({
		queryKey,
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			listarAjustesApuracaoEfd({
				idempresa: empresa?.id ?? "",
				competencia,
			}),
	});

	const criarMutation = useMutation({
		mutationFn: async () => {
			if (!empresa?.id) throw new Error("Empresa não selecionada");
			if (!codigoajuste.trim()) throw new Error("Informe o código do ajuste");
			if (!valor.trim()) throw new Error("Informe o valor");
			return criarAjusteApuracaoEfd({
				idempresa: empresa.id,
				tipo,
				competencia,
				codigoajuste: codigoajuste.trim(),
				descricao: descricao.trim() || null,
				valor: valor.replace(",", "."),
				natureza,
			});
		},
		onSuccess: () => {
			toast.success("Ajuste incluído na apuração");
			setCodigoajuste("");
			setDescricao("");
			setValor("");
			void queryClient.invalidateQueries({ queryKey });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao incluir ajuste");
		},
	});

	const excluirMutation = useMutation({
		mutationFn: async (id: string) => {
			if (!empresa?.id) throw new Error("Empresa não selecionada");
			return excluirAjusteApuracaoEfd({ id, idempresa: empresa.id });
		},
		onSuccess: () => {
			toast.success("Ajuste excluído");
			void queryClient.invalidateQueries({ queryKey });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir ajuste");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Apuração EFD</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Ajustes manuais de ICMS (E111) e PIS/COFINS (bloco M). O arquivo da
						EFD continua sendo um espelho dos documentos; estes lançamentos
						complementam a apuração quando houver débito ou crédito extra.
					</p>
				</div>

				<div className="px-4">
					<Card className="max-w-3xl">
						<CardHeader>
							<CardTitle>Novo ajuste</CardTitle>
							<CardDescription>
								Use o código da tabela da EFD (ex.: MG100201 para ICMS).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="competencia">Competência</FieldLabel>
									<Input
										id="competencia"
										type="month"
										value={anoMes}
										onChange={(event) => setAnoMes(event.target.value)}
									/>
								</Field>
								<div className="grid gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel>Tipo</FieldLabel>
										<Select
											value={tipo}
											onValueChange={(valorSel) =>
												setTipo(valorSel as TipoAjusteEfd)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="icms">ICMS</SelectItem>
												<SelectItem value="pis">PIS</SelectItem>
												<SelectItem value="cofins">COFINS</SelectItem>
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel>Natureza</FieldLabel>
										<Select
											value={natureza}
											onValueChange={(valorSel) =>
												setNatureza(valorSel as NaturezaAjusteEfd)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="debito">Débito</SelectItem>
												<SelectItem value="credito">Crédito</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="codigoajuste">Código</FieldLabel>
										<Input
											id="codigoajuste"
											value={codigoajuste}
											maxLength={10}
											onChange={(event) => setCodigoajuste(event.target.value)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="valor">Valor</FieldLabel>
										<Input
											id="valor"
											value={valor}
											inputMode="decimal"
											onChange={(event) => setValor(event.target.value)}
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
									<Input
										id="descricao"
										value={descricao}
										maxLength={255}
										onChange={(event) => setDescricao(event.target.value)}
									/>
								</Field>
								<Button
									onClick={() => criarMutation.mutate()}
									disabled={criarMutation.isPending}
								>
									<PlusIcon className="mr-2 h-4 w-4" />
									Incluir ajuste
								</Button>
							</FieldGroup>
						</CardContent>
					</Card>
				</div>

				<div className="px-4">
					<Card className="max-w-3xl">
						<CardHeader>
							<CardTitle>Ajustes da competência</CardTitle>
							<CardDescription>
								{periodo.dataInicio} a {periodo.dataFim}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<p className="text-sm text-muted-foreground">Carregando...</p>
							) : ajustes.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum ajuste nesta competência.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tipo</TableHead>
											<TableHead>Código</TableHead>
											<TableHead>Natureza</TableHead>
											<TableHead>Valor</TableHead>
											<TableHead>Descrição</TableHead>
											<TableHead />
										</TableRow>
									</TableHeader>
									<TableBody>
										{ajustes.map((ajuste) => (
											<TableRow key={ajuste.id}>
												<TableCell className="uppercase">
													{ajuste.tipo}
												</TableCell>
												<TableCell>{ajuste.codigoajuste}</TableCell>
												<TableCell>
													{ajuste.natureza === "credito" ? "Crédito" : "Débito"}
												</TableCell>
												<TableCell>{ajuste.valor}</TableCell>
												<TableCell>{ajuste.descricao}</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => excluirMutation.mutate(ajuste.id)}
														disabled={excluirMutation.isPending}
													>
														<Trash2Icon className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</PageContainer>
	);
}
