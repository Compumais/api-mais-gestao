"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	useAtualizarModeloImpressaoOs,
	useModeloImpressaoOs,
} from "@/hooks/use-modelo-impressao-os";
import type { LayoutModeloImpressaoOs } from "@/schemas/modelo-impressao-os.schema";
import { EditorModeloImpressaoOs } from "../components/editor-modelo-impressao-os";

export default function EditarModeloImpressaoOsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { data: modelo, isLoading } = useModeloImpressaoOs(
		empresa?.id ?? null,
		id,
	);
	const atualizar = useAtualizarModeloImpressaoOs(empresa?.id ?? "");

	const [nome, setNome] = useState("");
	const [descricao, setDescricao] = useState("");
	const [primario, setPrimario] = useState(false);
	const [layout, setLayout] = useState<LayoutModeloImpressaoOs>([]);
	const [carregado, setCarregado] = useState(false);

	useEffect(() => {
		if (!modelo || carregado) return;
		setNome(modelo.nome);
		setDescricao(modelo.descricao ?? "");
		setPrimario(modelo.primario);
		setLayout(modelo.layout ?? []);
		setCarregado(true);
	}, [modelo, carregado]);

	if (!empresa) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">
					Selecione uma empresa.
				</div>
			</PageContainer>
		);
	}

	if (isLoading || !carregado) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">Carregando modelo...</div>
			</PageContainer>
		);
	}

	if (!modelo) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">Modelo não encontrado.</div>
			</PageContainer>
		);
	}

	const somenteLeitura = modelo.sistema;

	async function salvar() {
		if (somenteLeitura) return;
		if (!nome.trim()) {
			toast.error("Informe o nome do modelo");
			return;
		}
		try {
			await atualizar.mutateAsync({
				id,
				payload: {
					nome: nome.trim(),
					descricao: descricao.trim() || null,
					layout,
					primario,
				},
			});
			toast.success("Modelo atualizado");
		} catch (erro) {
			toast.error("Erro ao salvar", {
				description:
					erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" asChild>
							<Link href="/configuracoes?tab=modelos-impressao">
								<ArrowLeft className="h-4 w-4" />
							</Link>
						</Button>
						<div>
							<h1 className="text-2xl font-bold">
								{somenteLeitura ? "Modelo do sistema" : "Editar modelo"}
							</h1>
							<p className="text-sm text-muted-foreground">
								{somenteLeitura
									? "Duplique este modelo para personalizar"
									: "Altere o layout e as propriedades"}
							</p>
						</div>
					</div>
					{!somenteLeitura && (
						<Button
							className="gap-2"
							onClick={() => void salvar()}
							disabled={atualizar.isPending}
						>
							<Save className="h-4 w-4" />
							{atualizar.isPending ? "Salvando..." : "Salvar"}
						</Button>
					)}
				</div>

				<EditorModeloImpressaoOs
					nome={nome}
					descricao={descricao}
					primario={primario}
					layout={layout}
					onNomeChange={setNome}
					onDescricaoChange={setDescricao}
					onPrimarioChange={setPrimario}
					onLayoutChange={setLayout}
					somenteLeitura={somenteLeitura}
				/>
			</div>
		</PageContainer>
	);
}
