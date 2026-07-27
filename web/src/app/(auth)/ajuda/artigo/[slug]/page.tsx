"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { ajudaService } from "@/services/ajuda.service";
import Image from "next/image"

export default function ArticlePage() {
	const params = useParams<{ slug: string }>();
	const slug = params.slug;

	const { data: post, isLoading, isError } = useQuery({
		queryKey: ["ajuda-post", slug],
		queryFn: () => ajudaService.buscarPorSlug(slug),
		enabled: Boolean(slug),
	});

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<p className="text-muted-foreground">Carregando artigo...</p>
			</div>
		);
	}

	if (isError || !post) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
					<Link href="/ajuda" className="hover:text-foreground">
						Central de Ajuda
					</Link>
				</nav>
				<h1 className="mb-4 text-3xl font-bold">Artigo não encontrado</h1>
				<p className="mb-6 text-muted-foreground">
					Este artigo pode ter sido removido ou ainda não está publicado.
				</p>
				<Link
					href="/ajuda"
					className="inline-flex items-center gap-2 text-primary hover:underline"
				>
					<IconArrowLeft className="size-4" aria-hidden="true" />
					Voltar para a Central de Ajuda
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
				<Link href="/ajuda" className="hover:text-foreground">
					Central de Ajuda
				</Link>
				<IconArrowRight className="size-4" aria-hidden="true" />
				<span className="text-foreground">{post.titulo}</span>
			</nav>

			<article className="mb-12">
				<div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
					<span>Por {post.autorNome || "Equipe Mais Gestão"}</span>
					<span aria-hidden="true">•</span>
					<span>
						Atualizado em {dayjs(post.atualizadoem).format("DD/MM/YYYY")}
					</span>
				</div>

				<h1 className="mb-4 text-4xl font-bold">{post.titulo}</h1>
				{post.subtitulo && (
					<p className="mb-8 text-xl text-muted-foreground">{post.subtitulo}</p>
				)}

				{post.capa && (
					<div className="mb-8 overflow-hidden rounded-xl border">
						<Image
							src={post.capa}
							alt="post da capa"
							className="h-auto w-full object-cover"
						/>
					</div>
				)}

				<MarkdownContent
					content={post.descricao}
					className="prose prose-slate max-w-none dark:prose-invert"
				/>

				{post.imagens.length > 0 && (
					<div className="mt-10 grid gap-4 sm:grid-cols-2">
						{post.imagens.map((src, index) => (
							<div
								key={`${index.toString()}-${src.slice(0, 24)}`}
								className="overflow-hidden rounded-lg border"
							>
								<Image
									src={src}
									alt={`Imagem ${index + 1} do artigo`}
									className="h-auto w-full object-cover"
								/>
							</div>
						))}
					</div>
				)}
			</article>

			<div className="border-t pt-8">
				<Link
					href="/ajuda"
					className="inline-flex items-center gap-2 text-primary hover:underline"
				>
					<IconArrowLeft className="size-4" aria-hidden="true" />
					Voltar para a Central de Ajuda
				</Link>
			</div>
		</div>
	);
}
