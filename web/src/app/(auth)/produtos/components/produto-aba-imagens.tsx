"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { produtoImagemArquivoSchema } from "@/schemas/produtos.schema";
import {
	type ProdutoImagem,
	produtosService,
} from "@/services/produtos.service";

type ProdutoAbaImagensProps = {
	produtoId?: string;
	nomeProduto: string;
	arquivosPendentes: File[];
	onArquivosPendentesChange: (arquivos: File[]) => void;
};

function ImagemPendente({
	arquivo,
	capa,
	onRemover,
}: {
	arquivo: File;
	capa: boolean;
	onRemover: () => void;
}) {
	const preview = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);
	useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
	return (
		<li className="overflow-hidden rounded-lg border">
			<img
				src={preview}
				alt={`Pré-visualização de ${arquivo.name}`}
				className="aspect-square w-full object-cover"
			/>
			<div className="p-3">
				<p className="truncate text-sm">{arquivo.name}</p>
				<p className="text-xs text-muted-foreground">
					{capa ? "Será a capa" : "Aguardando cadastro"}
				</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="mt-2 text-destructive"
					onClick={onRemover}
				>
					<Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
					Remover
				</Button>
			</div>
		</li>
	);
}

function versaoReferencia(referencia: string) {
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

function ImagemGaleria({
	produtoId,
	nomeProduto,
	imagem,
	ocupada,
	onPrincipal,
	onRemover,
}: {
	produtoId: string;
	nomeProduto: string;
	imagem: ProdutoImagem;
	ocupada: boolean;
	onPrincipal: () => void;
	onRemover: () => void;
}) {
	const externa = /^https?:\/\//.test(imagem.referencia)
		? imagem.referencia
		: null;
	const { data, isLoading, isError } = useQuery({
		queryKey: [
			"produto-imagem-arquivo",
			produtoId,
			imagem.id,
			versaoReferencia(imagem.referencia),
		],
		queryFn: () =>
			produtosService.baixarArquivoImagem(
				produtoId,
				imagem.id,
				versaoReferencia(imagem.referencia),
			),
		enabled: !externa,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	const url = useMemo(() => (data ? URL.createObjectURL(data) : null), [data]);
	useEffect(
		() => () => {
			if (url) URL.revokeObjectURL(url);
		},
		[url],
	);
	const origem = externa ?? url;

	return (
		<li className="overflow-hidden rounded-lg border bg-card">
			<div className="aspect-square bg-muted">
				{origem ? (
					<img
						src={origem}
						alt={`${imagem.principal ? "Imagem principal" : "Imagem"} de ${nomeProduto || "produto"}`}
						className="h-full w-full object-cover"
					/>
				) : (
					<div
						className="flex h-full items-center justify-center text-muted-foreground"
						aria-live="polite"
					>
						<ImageIcon className="h-10 w-10" aria-hidden="true" />
						<span className="sr-only">
							{isLoading
								? "Carregando imagem"
								: isError
									? "Não foi possível carregar a imagem"
									: "Imagem indisponível"}
						</span>
					</div>
				)}
			</div>
			<div className="space-y-2 p-3">
				<p className="truncate text-sm" title={imagem.nomearquivo ?? undefined}>
					{imagem.nomearquivo ??
						(imagem.origem === "legada" ? "Imagem existente" : "Imagem")}
				</p>
				{imagem.principal ? (
					<p className="flex items-center text-sm font-medium text-primary">
						<Star className="mr-1 h-4 w-4 fill-current" aria-hidden="true" />
						Capa
					</p>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={ocupada}
						onClick={onPrincipal}
					>
						<Star className="mr-1 h-4 w-4" aria-hidden="true" />
						Tornar capa
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-destructive"
					disabled={ocupada}
					onClick={onRemover}
					aria-label={`Remover ${imagem.nomearquivo ?? "imagem"}`}
				>
					<Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
					Remover
				</Button>
			</div>
		</li>
	);
}

export function ProdutoAbaImagens({
	produtoId,
	nomeProduto,
	arquivosPendentes,
	onArquivosPendentesChange,
}: ProdutoAbaImagensProps) {
	const queryClient = useQueryClient();
	const [erro, setErro] = useState<string | null>(null);
	const chave = ["produto-imagens", produtoId];
	const { data: imagens = [], isLoading } = useQuery({
		queryKey: chave,
		queryFn: () => produtosService.listarImagens(produtoId ?? ""),
		enabled: Boolean(produtoId),
	});
	const atualizarGaleria = async () => {
		await queryClient.invalidateQueries({ queryKey: chave });
		await queryClient.invalidateQueries({ queryKey: ["produtos"] });
		if (produtoId) {
			await queryClient.invalidateQueries({ queryKey: ["produto", produtoId] });
		}
	};
	const upload = useMutation({
		mutationFn: async (arquivos: File[]) => {
			if (!produtoId) return;
			for (const arquivo of arquivos) {
				await produtosService.adicionarImagem(produtoId, arquivo);
			}
		},
		onSuccess: async () => {
			await atualizarGaleria();
			toast.success("Imagem adicionada");
		},
		onError: (falha: Error) => toast.error(falha.message),
	});
	const principal = useMutation({
		mutationFn: (idimagem: string) =>
			produtosService.definirImagemPrincipal(produtoId ?? "", idimagem),
		onSuccess: async () => {
			await atualizarGaleria();
			toast.success("Imagem de capa atualizada");
		},
		onError: (falha: Error) => toast.error(falha.message),
	});
	const remover = useMutation({
		mutationFn: (idimagem: string) =>
			produtosService.removerImagemGaleria(produtoId ?? "", idimagem),
		onSuccess: async () => {
			await atualizarGaleria();
			toast.success("Imagem removida");
		},
		onError: (falha: Error) => toast.error(falha.message),
	});
	const ocupada = upload.isPending || principal.isPending || remover.isPending;

	const selecionar = (selecionados: File[]) => {
		const invalidos = selecionados
			.map((arquivo) => produtoImagemArquivoSchema.safeParse(arquivo))
			.find((resultado) => !resultado.success);
		if (invalidos && !invalidos.success) {
			setErro(invalidos.error.issues[0]?.message ?? "Imagem inválida");
			return;
		}
		setErro(null);
		if (produtoId) upload.mutate(selecionados);
		else onArquivosPendentesChange([...arquivosPendentes, ...selecionados]);
	};

	return (
		<section className="space-y-5" aria-labelledby="titulo-imagens-produto">
			<div>
				<h2 id="titulo-imagens-produto" className="text-lg font-semibold">
					Imagens do produto
				</h2>
				<p className="text-sm text-muted-foreground">
					A primeira imagem é usada como capa. Você pode trocar a capa a
					qualquer momento.
				</p>
			</div>
			<div className="rounded-lg border border-dashed p-4">
				<label
					htmlFor="imagens-produto"
					className="mb-2 flex items-center text-sm font-medium"
				>
					<Upload className="mr-2 h-4 w-4" aria-hidden="true" />
					Adicionar imagens
				</label>
				<Input
					id="imagens-produto"
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp"
					disabled={ocupada}
					aria-describedby="ajuda-imagens-produto erro-imagens-produto"
					onChange={(evento) => {
						selecionar(Array.from(evento.target.files ?? []));
						evento.target.value = "";
					}}
				/>
				<p
					id="ajuda-imagens-produto"
					className="mt-2 text-sm text-muted-foreground"
				>
					JPEG, PNG ou WebP, até 5 MB por arquivo.
				</p>
				{erro ? (
					<p
						id="erro-imagens-produto"
						className="mt-2 text-sm text-destructive"
						aria-live="polite"
					>
						{erro}
					</p>
				) : null}
			</div>
			{isLoading ? (
				<p className="text-sm text-muted-foreground" aria-live="polite">
					Carregando galeria...
				</p>
			) : null}
			<ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{imagens.map((imagem) => (
					<ImagemGaleria
						key={imagem.id}
						produtoId={produtoId ?? ""}
						nomeProduto={nomeProduto}
						imagem={imagem}
						ocupada={ocupada}
						onPrincipal={() => principal.mutate(imagem.id)}
						onRemover={() => remover.mutate(imagem.id)}
					/>
				))}
				{arquivosPendentes.map((arquivo, indice) => (
					<ImagemPendente
						key={`${arquivo.name}-${arquivo.size}-${indice}`}
						arquivo={arquivo}
						capa={indice === 0}
						onRemover={() =>
							onArquivosPendentesChange(
								arquivosPendentes.filter((_, atual) => atual !== indice),
							)
						}
					/>
				))}
			</ul>
			{!isLoading && imagens.length === 0 && arquivosPendentes.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhuma imagem cadastrada.
				</p>
			) : null}
		</section>
	);
}
