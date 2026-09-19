"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type GrupoGourmetFormData,
	grupoGourmetFormSchema,
} from "@/schemas/grupo-gourmet.schema";
import { gruposGourmetService } from "@/services/grupos-gourmet.service";
import { GrupoGourmetImagemCampo } from "./grupo-gourmet-imagem-campo";

type GrupoGourmetFormProps = {
	modo?: "criar" | "editar";
	grupoId?: string;
	valoresIniciais?: Partial<GrupoGourmetFormData>;
	referenciaImagemInicial?: string | null;
};

export function GrupoGourmetForm({
	modo = "criar",
	grupoId,
	valoresIniciais,
	referenciaImagemInicial,
}: GrupoGourmetFormProps) {
	const isEdicao = modo === "editar";
	const router = useRouter();
	const queryClient = useQueryClient();
	const { empresa } = useEmpresa();
	const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
	const [removerImagem, setRemoverImagem] = useState(false);
	const [erroImagem, setErroImagem] = useState<string | null>(null);

	const form = useForm<GrupoGourmetFormData>({
		resolver: zodResolver(grupoGourmetFormSchema),
		defaultValues: {
			codigo: valoresIniciais?.codigo ?? "",
			nome: valoresIniciais?.nome ?? "",
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = form;

	const { mutate: criar, isPending: criando } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof gruposGourmetService.criar>[0],
		) => {
			const grupo = await gruposGourmetService.criar(dados);
			if (!arquivoImagem) return grupo;
			try {
				return await gruposGourmetService.enviarImagem(grupo.id, arquivoImagem);
			} catch (erro) {
				const falha = new Error(
					`Grupo cadastrado, mas a imagem não foi enviada: ${
						erro instanceof Error ? erro.message : "erro desconhecido"
					}`,
				) as Error & { grupoId: string };
				falha.grupoId = grupo.id;
				throw falha;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["grupos-gourmet"] });
			toast.success("Grupo gourmet cadastrado");
			router.push("/grupos-gourmet");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar grupo gourmet");
			const idCriado = (error as Error & { grupoId?: string }).grupoId;
			if (idCriado) router.push(`/grupos-gourmet/${idCriado}/editar`);
		},
	});

	const { mutate: atualizar, isPending: atualizando } = useMutation({
		mutationFn: async (dados: GrupoGourmetFormData) => {
			if (!grupoId) throw new Error("ID do grupo gourmet não informado");
			const grupo = await gruposGourmetService.atualizar(grupoId, {
				codigo: dados.codigo?.trim() || null,
				nome: dados.nome.trim(),
			});
			if (arquivoImagem)
				return gruposGourmetService.enviarImagem(grupoId, arquivoImagem);
			if (removerImagem) return gruposGourmetService.removerImagem(grupoId);
			return grupo;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["grupos-gourmet"] });
			queryClient.invalidateQueries({ queryKey: ["grupo-gourmet", grupoId] });
			toast.success("Grupo gourmet atualizado");
			router.push("/grupos-gourmet");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar grupo gourmet");
		},
	});

	function onSubmit(data: GrupoGourmetFormData) {
		if (!empresa?.id) {
			toast.error("Selecione uma empresa");
			return;
		}
		if (
			arquivoImagem &&
			(!["image/jpeg", "image/png", "image/webp"].includes(
				arquivoImagem.type,
			) ||
				arquivoImagem.size > 5 * 1024 * 1024)
		) {
			setErroImagem("Use JPEG, PNG ou WebP com até 5 MB");
			return;
		}
		setErroImagem(null);
		if (isEdicao) {
			atualizar(data);
			return;
		}
		criar({
			idempresa: empresa.id,
			codigo: data.codigo?.trim() || null,
			nome: data.nome.trim(),
		});
	}

	const pendente = criando || atualizando;

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<FieldGroup>
				<Field data-invalid={!!errors.codigo}>
					<FieldLabel htmlFor="codigo">Código</FieldLabel>
					<Input id="codigo" {...register("codigo")} />
					<FieldError errors={errors.codigo ? [errors.codigo] : []} />
				</Field>
				<Field data-invalid={!!errors.nome}>
					<FieldLabel htmlFor="nome">Nome *</FieldLabel>
					<Input id="nome" {...register("nome")} />
					<FieldError errors={errors.nome ? [errors.nome] : []} />
				</Field>
				<GrupoGourmetImagemCampo
					grupoId={grupoId}
					nome={form.watch("nome")}
					referencia={referenciaImagemInicial}
					arquivo={arquivoImagem}
					remover={removerImagem}
					erro={erroImagem}
					onArquivo={setArquivoImagem}
					onRemover={setRemoverImagem}
				/>
			</FieldGroup>
			<p className="text-sm text-muted-foreground">
				Grupos gourmet organizam o cardápio de mesa e balcão no PDV/POS e
				definem o destino da impressora de produção.
			</p>
			<div className="flex gap-2">
				<Button type="submit" disabled={pendente || !empresa}>
					{isEdicao ? "Salvar" : "Cadastrar"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/grupos-gourmet")}
				>
					Cancelar
				</Button>
			</div>
		</form>
	);
}
