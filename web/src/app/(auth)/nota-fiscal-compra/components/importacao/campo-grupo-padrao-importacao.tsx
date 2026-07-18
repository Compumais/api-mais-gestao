"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { hierarquiasService } from "@/services/hierarquias.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import { DialogCriarGrupoRapido } from "../dialog-criar-grupo-rapido";

type CampoGrupoPadraoImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	idgrupoPadrao?: string | null;
};

export function CampoGrupoPadraoImportacao({
	idempresa,
	idRascunho,
	idgrupoPadrao,
}: CampoGrupoPadraoImportacaoProps) {
	const queryClient = useQueryClient();
	const [dialogAberto, setDialogAberto] = useState(false);

	const {
		data: grupos = [],
		isLoading: carregandoGrupos,
		isError: erroGrupos,
		refetch,
	} = useQuery({
		queryKey: ["hierarquias", idempresa, "grupo-padrao-nf"],
		queryFn: () => hierarquiasService.listarTodos({ idempresa }),
		enabled: Boolean(idempresa),
	});

	const { mutate: aplicarGrupo, isPending } = useMutation({
		mutationFn: (idgrupo: string) =>
			notaFiscalService.aplicarGrupoPadraoRascunhoImportacao(idRascunho, {
				idempresa,
				idgrupo,
			}),
		onSuccess: (resultado) => {
			toast.success(
				`Grupo padrão aplicado a ${resultado.quantidadeItens} item(ns)`,
			);
			void queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	return (
		<div className="rounded-md border bg-muted/30 p-4">
			<Field>
				<div className="mb-2 flex max-w-md items-center justify-between gap-2">
					<FieldLabel htmlFor="grupo-padrao-importacao">
						Grupo padrão dos itens
					</FieldLabel>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1 px-2"
						onClick={() => setDialogAberto(true)}
					>
						<Plus className="size-3.5" aria-hidden="true" />
						Cadastrar
					</Button>
				</div>
				<Select
					value={idgrupoPadrao ?? undefined}
					onValueChange={(valor) => aplicarGrupo(valor)}
					disabled={carregandoGrupos || isPending}
				>
					<SelectTrigger id="grupo-padrao-importacao" className="w-full max-w-md">
						<SelectValue
							placeholder={
								carregandoGrupos
									? "Carregando grupos..."
									: "Selecione o grupo padrão"
							}
						/>
					</SelectTrigger>
					<SelectContent position="popper" className="z-[200]">
						{grupos.length === 0 ? (
							<SelectItem value="__vazio" disabled>
								{erroGrupos ? "Erro ao carregar grupos" : "Nenhum grupo cadastrado"}
							</SelectItem>
						) : (
							grupos.map((grupo) => (
								<SelectItem key={grupo.id} value={grupo.id}>
									{grupo.nome || grupo.codigo || grupo.id}
								</SelectItem>
							))
						)}
					</SelectContent>
				</Select>
				<p className="mt-2 text-xs text-muted-foreground">
					Ao definir o grupo padrão, ele será repassado automaticamente para todos
					os itens desta nota em revisão.
				</p>
			</Field>
			<DialogCriarGrupoRapido
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				onCriado={(id) => {
					void refetch();
					aplicarGrupo(id);
				}}
			/>
		</div>
	);
}
