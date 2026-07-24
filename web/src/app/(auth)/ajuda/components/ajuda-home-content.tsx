"use client";

import { IconArrowRight, IconFileText, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	ajudaService,
	type AjudaPostPublico,
} from "@/services/ajuda.service";

function filtrarPosts(posts: AjudaPostPublico[], query: string) {
	const termo = query.trim().toLowerCase();
	if (!termo) return posts;
	return posts.filter((post) => {
		const haystack = [
			post.titulo,
			post.subtitulo ?? "",
			post.descricao,
			post.autorNome ?? "",
		]
			.join(" ")
			.toLowerCase();
		return haystack.includes(termo);
	});
}

function PostCard({ post }: { post: AjudaPostPublico }) {
	return (
		<Link
			href={`/ajuda/artigo/${post.slug}`}
			className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:border-primary hover:shadow-lg"
		>
			{post.capa ? (
				<div className="aspect-[16/9] overflow-hidden border-b bg-muted">
					{/* data URL — next/image não é adequado aqui */}
					<img
						src={post.capa}
						alt=""
						className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
					/>
				</div>
			) : (
				<div className="flex aspect-[16/9] items-center justify-center border-b bg-primary/5">
					<IconFileText className="size-10 text-primary/60" aria-hidden="true" />
				</div>
			)}
			<div className="p-5">
				<h3 className="mb-2 font-semibold text-card-foreground group-hover:text-primary">
					{post.titulo}
				</h3>
				{post.subtitulo && (
					<p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
						{post.subtitulo}
					</p>
				)}
				<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>{post.autorNome || "Equipe Mais Gestão"}</span>
					<span>{dayjs(post.atualizadoem).format("DD/MM/YYYY")}</span>
				</div>
			</div>
		</Link>
	);
}

function PopularCard({ post }: { post: AjudaPostPublico }) {
	return (
		<Link
			href={`/ajuda/artigo/${post.slug}`}
			className="group rounded-lg border bg-card p-5 transition-all hover:border-primary hover:shadow-md"
		>
			<div className="mb-3 flex items-center justify-between gap-2">
				<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
					{post.autorNome || "Ajuda"}
				</span>
				<span className="text-xs text-muted-foreground">
					{dayjs(post.atualizadoem).format("DD/MM/YYYY")}
				</span>
			</div>
			<h3 className="mb-2 font-medium leading-snug text-card-foreground group-hover:text-primary">
				{post.titulo}
			</h3>
			{post.subtitulo && (
				<p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
					{post.subtitulo}
				</p>
			)}
			<div className="flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
				Ler artigo
				<IconArrowRight className="size-4" aria-hidden="true" />
			</div>
		</Link>
	);
}

export function AjudaHomeContent() {
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["ajuda-posts"],
		queryFn: () => ajudaService.listarPublicos(),
	});

	const posts = data?.posts ?? [];
	const filtrados = useMemo(
		() => filtrarPosts(posts, searchQuery),
		[posts, searchQuery],
	);
	const populares = useMemo(
		() => [...filtrados].slice(0, 6),
		[filtrados],
	);

	return (
		<>
			<section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16">
				<div className="container mx-auto max-w-4xl px-4">
					<h1 className="mb-4 text-center text-4xl font-bold tracking-tight">
						Como podemos ajudar?
					</h1>
					<p className="mb-8 text-center text-muted-foreground">
						Pesquise artigos de ajuda ou navegue pelas postagens abaixo
					</p>
					<form
						onSubmit={(e) => e.preventDefault()}
						className="relative"
						role="search"
					>
						<IconSearch
							className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							type="search"
							placeholder="Descreva seu problema ou pesquise uma palavra-chave..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-14 rounded-full border-2 pl-12 pr-4 text-base shadow-lg transition-shadow focus-visible:shadow-xl"
							aria-label="Pesquisar na central de ajuda"
						/>
					</form>
				</div>
			</section>

			<section className="container mx-auto max-w-7xl px-4 py-12">
				<h2 className="mb-8 text-2xl font-semibold">Artigos de ajuda</h2>
				{isLoading ? (
					<p className="text-muted-foreground">Carregando artigos...</p>
				) : isError ? (
					<p className="text-muted-foreground">
						Não foi possível carregar os artigos no momento.
					</p>
				) : filtrados.length === 0 ? (
					<p className="text-muted-foreground">
						{searchQuery.trim()
							? "Nenhum artigo encontrado para essa busca."
							: "Nenhum artigo publicado ainda."}
					</p>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{filtrados.map((post) => (
							<PostCard key={post.id} post={post} />
						))}
					</div>
				)}
			</section>

			{populares.length > 0 && !searchQuery.trim() && (
				<section className="bg-muted/30 py-12">
					<div className="container mx-auto max-w-7xl px-4">
						<h2 className="mb-8 text-2xl font-semibold">Artigos recentes</h2>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{populares.map((post) => (
								<PopularCard key={post.id} post={post} />
							))}
						</div>
					</div>
				</section>
			)}
		</>
	);
}
