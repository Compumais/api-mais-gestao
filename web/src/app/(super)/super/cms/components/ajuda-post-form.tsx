"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconBold,
	IconEye,
	IconEyeOff,
	IconH2,
	IconItalic,
	IconLink,
	IconList,
	IconPhoto,
	IconUnderline,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	aplicarMarcacaoMarkdown,
	inserirNaPosicao,
} from "@/lib/markdown-toolbar";
import {
	AJUDA_IMAGEM_MAX_BYTES,
	ajudaPostFormSchema,
	type AjudaPostFormData,
} from "@/schemas/ajuda-post.schema";

function lerArquivoComoDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		if (file.size > AJUDA_IMAGEM_MAX_BYTES) {
			reject(new Error("Imagem deve ter no máximo 500 KB"));
			return;
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Falha ao ler imagem"));
			}
		};
		reader.onerror = () => reject(new Error("Falha ao ler imagem"));
		reader.readAsDataURL(file);
	});
}

const formDefaultValues: AjudaPostFormData = {
	titulo: "",
	subtitulo: "",
	descricao: "",
	capa: null,
	imagens: [],
	publicado: true,
};

type AjudaPostFormProps = {
	defaultValues?: Partial<AjudaPostFormData>;
	submitLabel: string;
	salvando?: boolean;
	onSubmit: (dados: AjudaPostFormData) => void;
};

export function AjudaPostForm({
	defaultValues,
	submitLabel,
	salvando = false,
	onSubmit,
}: AjudaPostFormProps) {
	const [preview, setPreview] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const imagemInputRef = useRef<HTMLInputElement | null>(null);
	const capaInputRef = useRef<HTMLInputElement | null>(null);

	const form = useForm<AjudaPostFormData>({
		resolver: zodResolver(ajudaPostFormSchema),
		defaultValues: { ...formDefaultValues, ...defaultValues },
	});

	const capa = form.watch("capa");
	const titulo = form.watch("titulo");
	const subtitulo = form.watch("subtitulo");
	const descricao = form.watch("descricao");
	const { ref: descricaoRegisterRef, ...descricaoRegister } =
		form.register("descricao");

	function aplicarFerramenta(
		acao: "bold" | "italic" | "underline" | "heading" | "list" | "link",
	) {
		const el = textareaRef.current;
		if (!el || preview) return;

		let novo: string;
		switch (acao) {
			case "bold":
				novo = aplicarMarcacaoMarkdown(el, "**", "**");
				break;
			case "italic":
				novo = aplicarMarcacaoMarkdown(el, "*", "*");
				break;
			case "underline":
				novo = aplicarMarcacaoMarkdown(el, "<u>", "</u>");
				break;
			case "heading":
				novo = aplicarMarcacaoMarkdown(el, "## ", "");
				break;
			case "list":
				novo = aplicarMarcacaoMarkdown(el, "- ", "");
				break;
			case "link": {
				const url = window.prompt("URL do link:", "https://");
				if (!url) return;
				novo = aplicarMarcacaoMarkdown(el, "[", `](${url})`, "texto");
				break;
			}
		}

		form.setValue("descricao", novo, { shouldValidate: true, shouldDirty: true });
	}

	async function onCapaChange(fileList: FileList | null) {
		const file = fileList?.[0];
		if (!file) return;
		try {
			const dataUrl = await lerArquivoComoDataUrl(file);
			form.setValue("capa", dataUrl, { shouldValidate: true });
		} catch (erro) {
			toast.error(erro instanceof Error ? erro.message : "Erro ao carregar capa");
		}
	}

	async function onImagemCorpoChange(fileList: FileList | null) {
		const file = fileList?.[0];
		const el = textareaRef.current;
		if (!file || !el || preview) return;
		try {
			const dataUrl = await lerArquivoComoDataUrl(file);
			const markdown = `\n![imagem](${dataUrl})\n`;
			const novo = inserirNaPosicao(el, markdown);
			form.setValue("descricao", novo, {
				shouldValidate: true,
				shouldDirty: true,
			});
		} catch (erro) {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao carregar imagem",
			);
		} finally {
			if (imagemInputRef.current) {
				imagemInputRef.current.value = "";
			}
		}
	}

	return (
		<form
			className="mr-auto w-full max-w-3xl space-y-6 text-left"
			onSubmit={form.handleSubmit(onSubmit)}
		>
			<div className="space-y-4">
				{preview ? (
					<div className="rounded-xl border bg-card px-5 py-4">
						<h2 className="text-4xl font-bold tracking-tight">
							{titulo || "Sem título"}
						</h2>
						{subtitulo ? (
							<p className="mt-2 text-xl text-muted-foreground">{subtitulo}</p>
						) : null}
					</div>
				) : (
					<>
						<Input
							aria-label="Título"
							placeholder="Título"
							className="h-auto rounded-xl border bg-card px-5 py-4 text-left text-4xl font-bold tracking-tight shadow-none focus-visible:ring-1"
							{...form.register("titulo")}
						/>
						{form.formState.errors.titulo && (
							<p className="px-1 text-sm text-destructive">
								{form.formState.errors.titulo.message}
							</p>
						)}

						<Input
							aria-label="Subtítulo"
							placeholder="Subtítulo (opcional)"
							className="h-auto rounded-xl border bg-card px-5 py-3 text-left text-xl text-muted-foreground shadow-none focus-visible:ring-1"
							{...form.register("subtitulo")}
						/>
					</>
				)}
			</div>

			<div className="space-y-3">
				{!preview && (
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => capaInputRef.current?.click()}
						>
							<IconPhoto className="size-4" />
							{capa ? "Trocar capa" : "Adicionar capa"}
						</Button>
						<input
							ref={capaInputRef}
							type="file"
							accept="image/*"
							className="sr-only"
							onChange={(e) => onCapaChange(e.target.files)}
						/>
						{capa && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() =>
									form.setValue("capa", null, { shouldValidate: true })
								}
							>
								<IconX className="size-4" />
								Remover capa
							</Button>
						)}
					</div>
				)}
				{capa && (
					<div className="overflow-hidden rounded-xl border">
						<img
							src={capa}
							alt="Prévia da capa"
							className="max-h-64 w-full object-cover"
						/>
					</div>
				)}
			</div>

			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					{!preview ? (
						<ToggleGroup type="multiple" variant="outline" spacing={0}>
							<ToggleGroupItem
								value="bold"
								aria-label="Negrito"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("bold");
								}}
							>
								<IconBold className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="italic"
								aria-label="Itálico"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("italic");
								}}
							>
								<IconItalic className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="underline"
								aria-label="Sublinhado"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("underline");
								}}
							>
								<IconUnderline className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="heading"
								aria-label="Título"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("heading");
								}}
							>
								<IconH2 className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="list"
								aria-label="Lista"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("list");
								}}
							>
								<IconList className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="link"
								aria-label="Link"
								onClick={(e) => {
									e.preventDefault();
									aplicarFerramenta("link");
								}}
							>
								<IconLink className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="image"
								aria-label="Imagem"
								onClick={(e) => {
									e.preventDefault();
									imagemInputRef.current?.click();
								}}
							>
								<IconPhoto className="size-4" />
							</ToggleGroupItem>
						</ToggleGroup>
					) : (
						<span className="text-sm text-muted-foreground">
							Pré-visualização do artigo
						</span>
					)}

					<Button
						type="button"
						variant={preview ? "default" : "outline"}
						size="sm"
						onClick={() => setPreview((atual) => !atual)}
					>
						{preview ? (
							<>
								<IconEyeOff className="size-4" />
								Editar
							</>
						) : (
							<>
								<IconEye className="size-4" />
								Preview
							</>
						)}
					</Button>

					<input
						ref={imagemInputRef}
						type="file"
						accept="image/*"
						className="sr-only"
						onChange={(e) => onImagemCorpoChange(e.target.files)}
					/>
				</div>

				{preview ? (
					<div className="min-h-[320px] rounded-xl border bg-card px-5 py-4 text-left">
						{descricao?.trim() ? (
							<MarkdownContent
								content={descricao}
								className="prose prose-slate max-w-none dark:prose-invert"
							/>
						) : (
							<p className="text-muted-foreground">Nenhum conteúdo ainda.</p>
						)}
					</div>
				) : (
					<>
						<Textarea
							aria-label="Conteúdo"
							placeholder="Escreva o conteúdo do artigo..."
							className="min-h-[320px] resize-y rounded-xl border bg-card px-5 py-4 text-left text-base leading-relaxed shadow-none focus-visible:ring-1"
							{...descricaoRegister}
							ref={(el) => {
								descricaoRegisterRef(el);
								textareaRef.current = el;
							}}
						/>
						{form.formState.errors.descricao && (
							<p className="px-1 text-sm text-destructive">
								{form.formState.errors.descricao.message}
							</p>
						)}
					</>
				)}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.watch("publicado") ?? true}
						onChange={(e) => form.setValue("publicado", e.target.checked)}
					/>
					Publicar imediatamente
				</label>

				<div className="flex gap-2">
					<Button type="button" variant="outline" asChild>
						<Link href="/super/cms">Cancelar</Link>
					</Button>
					<Button type="submit" disabled={salvando}>
						{salvando ? "Salvando..." : submitLabel}
					</Button>
				</div>
			</div>
		</form>
	);
}
