"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BancoImagemPreview } from "@/app/(auth)/produtos/components/banco-imagem-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	type BancoImagemProduto,
	bancoImagemService,
} from "@/services/banco-imagem.service";

export default function SuperBancoImagensPage() {
	const queryClient = useQueryClient();
	const [grupoId, setGrupoId] = useState<string | null>(null);
	const [nomeGrupo, setNomeGrupo] = useState("");
	const [nomeProduto, setNomeProduto] = useState("");
	const [codigosTexto, setCodigosTexto] = useState("");
	const [editando, setEditando] = useState<BancoImagemProduto | null>(null);

	const grupos = useQuery({
		queryKey: ["banco-imagens-grupos"],
		queryFn: () => bancoImagemService.listarGrupos(),
	});
	const produtos = useQuery({
		queryKey: ["banco-imagens-produtos", grupoId],
		queryFn: () => bancoImagemService.listarProdutos(grupoId ?? ""),
		enabled: Boolean(grupoId),
	});

	const invalidar = async () => {
		await queryClient.invalidateQueries({ queryKey: ["banco-imagens-grupos"] });
		await queryClient.invalidateQueries({ queryKey: ["banco-imagens-produtos"] });
	};

	const criarGrupo = useMutation({
		mutationFn: () => bancoImagemService.criarGrupo({ nome: nomeGrupo }),
		onSuccess: async (grupo) => {
			setNomeGrupo("");
			setGrupoId(grupo.id);
			await invalidar();
			toast.success("Grupo criado");
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const excluirGrupo = useMutation({
		mutationFn: (id: string) => bancoImagemService.excluirGrupo(id),
		onSuccess: async () => {
			setGrupoId(null);
			await invalidar();
			toast.success("Grupo removido");
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const imagemGrupo = useMutation({
		mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
			bancoImagemService.enviarImagemGrupo(id, arquivo),
		onSuccess: async () => {
			await invalidar();
			toast.success("Capa do grupo atualizada");
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const salvarProduto = useMutation({
		mutationFn: async (arquivo: File | null) => {
			if (!grupoId) throw new Error("Selecione um grupo");
			const codigos = codigosTexto
				.split(/[\s,;]+/)
				.map((codigo) => codigo.trim())
				.filter(Boolean);
			const produto = editando
				? await bancoImagemService.atualizarProduto(editando.id, {
						nome: nomeProduto,
						codigos,
					})
				: await bancoImagemService.criarProduto({
						idgrupo: grupoId,
						nome: nomeProduto,
						codigos,
					});
			if (arquivo) {
				return bancoImagemService.enviarImagemProduto(produto.id, arquivo);
			}
			return produto;
		},
		onSuccess: async () => {
			setNomeProduto("");
			setCodigosTexto("");
			setEditando(null);
			await invalidar();
			toast.success("Produto do banco salvo");
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const excluirProduto = useMutation({
		mutationFn: (id: string) => bancoImagemService.excluirProduto(id),
		onSuccess: async () => {
			await invalidar();
			toast.success("Produto removido do banco");
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const grupoAtual = grupos.data?.find((grupo) => grupo.id === grupoId) ?? null;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Banco de imagens</h1>
				<p className="text-muted-foreground">
					Catálogo compartilhado. O arquivo fica aqui e os produtos das
					empresas apenas apontam para ele.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
				<Card>
					<CardHeader>
						<CardTitle>Grupos</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<form
							className="flex gap-2"
							onSubmit={(evento) => {
								evento.preventDefault();
								criarGrupo.mutate();
							}}
						>
							<Label className="sr-only" htmlFor="nome-grupo">
								Nome do grupo
							</Label>
							<Input
								id="nome-grupo"
								value={nomeGrupo}
								placeholder="Novo grupo"
								onChange={(evento) => setNomeGrupo(evento.target.value)}
							/>
							<Button type="submit" disabled={!nomeGrupo.trim()}>
								Criar
							</Button>
						</form>
						<ul className="space-y-2">
							{(grupos.data ?? []).map((grupo) => (
								<li key={grupo.id}>
									<button
										type="button"
										className={`flex w-full items-center gap-2 rounded-md border p-2 text-left ${
											grupo.id === grupoId ? "border-primary" : ""
										}`}
										onClick={() => {
											setGrupoId(grupo.id);
											setEditando(null);
											setNomeProduto("");
											setCodigosTexto("");
										}}
									>
										<BancoImagemPreview
											id={grupo.id}
											referencia={grupo.referencia}
											alt={grupo.nome}
											grupo
											className="h-10 w-10"
										/>
										<span className="min-w-0 truncate text-sm">
											{grupo.nome}
										</span>
									</button>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{grupoAtual ? grupoAtual.nome : "Selecione um grupo"}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{grupoAtual ? (
							<div className="flex flex-wrap items-center gap-3">
								<BancoImagemPreview
									id={grupoAtual.id}
									referencia={grupoAtual.referencia}
									alt={`Capa de ${grupoAtual.nome}`}
									grupo
									className="h-20 w-20"
								/>
								<div className="space-y-2">
									<Label htmlFor="capa-grupo">Imagem do grupo</Label>
									<Input
										id="capa-grupo"
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onChange={(evento) => {
											const arquivo = evento.target.files?.[0];
											if (arquivo) {
												imagemGrupo.mutate({
													id: grupoAtual.id,
													arquivo,
												});
											}
											evento.target.value = "";
										}}
									/>
								</div>
								<Button
									type="button"
									variant="destructive"
									onClick={() => excluirGrupo.mutate(grupoAtual.id)}
								>
									Excluir grupo
								</Button>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								Crie ou escolha um grupo para cadastrar produtos e códigos de
								barras.
							</p>
						)}

						{grupoAtual ? (
							<form
								className="space-y-3 rounded-lg border p-4"
								onSubmit={(evento) => {
									evento.preventDefault();
									const formulario = evento.currentTarget;
									const arquivo =
										formulario.querySelector<HTMLInputElement>("#foto-produto")
											?.files?.[0] ?? null;
									salvarProduto.mutate(arquivo);
								}}
							>
								<h2 className="font-medium">
									{editando ? "Editar produto" : "Novo produto"}
								</h2>
								<div className="space-y-1">
									<Label htmlFor="nome-produto-banco">Nome</Label>
									<Input
										id="nome-produto-banco"
										value={nomeProduto}
										onChange={(evento) => setNomeProduto(evento.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="codigos-produto-banco">
										Códigos de barras
									</Label>
									<Input
										id="codigos-produto-banco"
										value={codigosTexto}
										placeholder="Separados por vírgula ou espaço"
										onChange={(evento) => setCodigosTexto(evento.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="foto-produto">Imagem do produto</Label>
									<Input
										id="foto-produto"
										type="file"
										accept="image/jpeg,image/png,image/webp"
									/>
								</div>
								<div className="flex gap-2">
									<Button type="submit" disabled={!nomeProduto.trim()}>
										Salvar
									</Button>
									{editando ? (
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setEditando(null);
												setNomeProduto("");
												setCodigosTexto("");
											}}
										>
											Cancelar
										</Button>
									) : null}
								</div>
							</form>
						) : null}

						<ul className="space-y-3">
							{(produtos.data ?? []).map((produto) => (
								<li
									key={produto.id}
									className="flex items-center gap-3 rounded-md border p-3"
								>
									<BancoImagemPreview
										id={produto.id}
										referencia={produto.referencia}
										alt={produto.nome}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">{produto.nome}</p>
										<p className="truncate text-sm text-muted-foreground">
											{produto.codigos.map((codigo) => codigo.codigo).join(", ") ||
												"Sem código"}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setEditando(produto);
											setNomeProduto(produto.nome);
											setCodigosTexto(
												produto.codigos.map((codigo) => codigo.codigo).join(", "),
											);
										}}
									>
										Editar
									</Button>
									<Button
										type="button"
										variant="ghost"
										onClick={() => excluirProduto.mutate(produto.id)}
									>
										Excluir
									</Button>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
