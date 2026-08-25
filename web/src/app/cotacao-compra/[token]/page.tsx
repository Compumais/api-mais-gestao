"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatarQuantidade,
	labelProdutoCotacao,
} from "@/constants/compras-constants";
import { cotacoesCompraService } from "@/services/cotacoes-compra.service";

export default function CotacaoPublicaPage() {
	const params = useParams<{ token: string }>();
	const token = params.token;
	const [passo, setPasso] = useState<1 | 2 | 3>(1);
	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [precos, setPrecos] = useState<Record<string, string>>({});

	const { data, isLoading, error } = useQuery({
		queryKey: ["cotacao-publica", token],
		queryFn: () => cotacoesCompraService.buscarPublica(token),
	});

	const { mutate: enviar, isPending } = useMutation({
		mutationFn: () =>
			cotacoesCompraService.enviarProposta(token, {
				nome,
				telefone,
				itens: (data?.itens ?? []).map((item) => ({
					idcotacaoitem: item.id,
					precounitario: Number(precos[item.id]),
				})),
			}),
		onSuccess: () => setPasso(3),
		onError: (err: Error) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<div className="bg-muted flex min-h-svh items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="bg-muted flex min-h-svh items-center justify-center p-6">
				<div className="max-w-md rounded-lg border bg-card p-6 text-center">
					<h1 className="text-xl font-semibold">Cotação indisponível</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{(error as Error | undefined)?.message ||
							"Este link é inválido ou a cotação já foi encerrada."}
					</p>
				</div>
			</div>
		);
	}

	function avancarIdentificacao() {
		if (nome.trim().length < 2) {
			toast.error("Informe seu nome");
			return;
		}
		if (telefone.replace(/\D/g, "").length < 10) {
			toast.error("Informe um telefone com DDD");
			return;
		}
		setPasso(2);
	}

	function enviarProposta() {
		for (const item of data!.itens) {
			const valor = Number(precos[item.id]);
			if (!Number.isFinite(valor) || valor <= 0) {
				toast.error("Informe o preço de todos os itens");
				return;
			}
		}
		enviar();
	}

	return (
		<div className="bg-muted min-h-svh p-4 md:p-10">
			<div className="mx-auto max-w-3xl space-y-4">
				<div className="rounded-lg border bg-card p-6">
					<p className="text-sm text-muted-foreground">Cotação de compra</p>
					<h1 className="text-2xl font-bold">{data.titulo}</h1>
					{data.validade && (
						<p className="text-sm text-muted-foreground">
							Válida até {data.validade}
						</p>
					)}
					{data.observacao && <p className="mt-2 text-sm">{data.observacao}</p>}
				</div>

				{passo === 1 && (
					<div className="space-y-4 rounded-lg border bg-card p-6">
						<h2 className="text-lg font-semibold">Seus dados</h2>
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="mb-1 block text-sm font-medium" htmlFor="nome">
									Nome *
								</label>
								<Input
									id="nome"
									value={nome}
									onChange={(e) => setNome(e.target.value)}
									placeholder="Nome da empresa ou responsável"
								/>
							</div>
							<div>
								<label
									className="mb-1 block text-sm font-medium"
									htmlFor="telefone"
								>
									Telefone *
								</label>
								<Input
									id="telefone"
									value={telefone}
									onChange={(e) => setTelefone(e.target.value)}
									placeholder="(00) 00000-0000"
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<Button onClick={avancarIdentificacao}>Continuar</Button>
						</div>
					</div>
				)}

				{passo === 2 && (
					<div className="space-y-4 rounded-lg border bg-card p-6">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">Preços dos itens</h2>
							<Button variant="outline" onClick={() => setPasso(1)}>
								Voltar
							</Button>
						</div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Produto</TableHead>
									<TableHead>Qtd</TableHead>
									<TableHead>Preço unitário</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.itens.map((item) => (
									<TableRow key={item.id}>
										<TableCell>{labelProdutoCotacao(item)}</TableCell>
										<TableCell>
											{formatarQuantidade(item.quantidade)}{" "}
											{item.unidademedida ?? ""}
										</TableCell>
										<TableCell className="w-48">
											<MoneyInput
												value={precos[item.id] ?? ""}
												onChange={(value) =>
													setPrecos((atual) => ({
														...atual,
														[item.id]: value,
													}))
												}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<div className="flex justify-end">
							<Button onClick={enviarProposta} disabled={isPending}>
								{isPending ? "Enviando..." : "Enviar proposta"}
							</Button>
						</div>
					</div>
				)}

				{passo === 3 && (
					<div className="rounded-lg border bg-card p-6 text-center">
						<h2 className="text-xl font-semibold">Proposta enviada</h2>
						<p className="mt-2 text-muted-foreground">
							Obrigado, {nome}. Seus preços foram registrados. Você pode fechar
							esta página.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
