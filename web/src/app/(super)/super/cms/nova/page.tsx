"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AjudaPostForm } from "../components/ajuda-post-form";
import type { AjudaPostFormData } from "@/schemas/ajuda-post.schema";
import { adminService } from "@/services/admin.service";

export default function SuperCmsNovaPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const criarMutation = useMutation({
		mutationFn: (dados: AjudaPostFormData) =>
			adminService.criarAjudaPost({
				titulo: dados.titulo,
				subtitulo: dados.subtitulo || null,
				descricao: dados.descricao,
				capa: dados.capa || null,
				imagens: dados.imagens ?? [],
				publicado: dados.publicado ?? true,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-ajuda-posts"] });
			queryClient.invalidateQueries({ queryKey: ["ajuda-posts"] });
			toast.success("Postagem criada");
			router.push("/super/cms");
		},
		onError: () => toast.error("Erro ao criar postagem"),
	});

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/super/cms"
					className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<IconArrowLeft className="size-4" aria-hidden="true" />
					Voltar ao CMS
				</Link>
				<h1 className="text-2xl font-bold">Nova postagem</h1>
				<p className="text-muted-foreground">
					Escreva um artigo para a Central de Ajuda
				</p>
			</div>

			<AjudaPostForm
				submitLabel="Criar postagem"
				salvando={criarMutation.isPending}
				onSubmit={(dados) => criarMutation.mutate(dados)}
			/>
		</div>
	);
}
