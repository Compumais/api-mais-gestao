"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";
import { useCriarModeloImpressaoOs } from "@/hooks/use-modelo-impressao-os";
import type { LayoutModeloImpressaoOs } from "@/schemas/modelo-impressao-os.schema";
import { EditorModeloImpressaoOs } from "../components/editor-modelo-impressao-os";

export default function NovoModeloImpressaoOsPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const router = useRouter();
	const [nome, setNome] = useState("");
	const [descricao, setDescricao] = useState("");
	const [primario, setPrimario] = useState(false);
	const [layout, setLayout] = useState<LayoutModeloImpressaoOs>([]);
	const criar = useCriarModeloImpressaoOs(empresa?.id ?? "");

	if (!empresa) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">
					Selecione uma empresa para criar um modelo.
				</div>
			</PageContainer>
		);
	}

	async function salvar() {
		if (!nome.trim()) {
			toast.error("Informe o nome do modelo");
			return;
		}
		try {
			const criado = await criar.mutateAsync({
				nome: nome.trim(),
				descricao: descricao.trim() || null,
				layout,
				primario,
			});
			toast.success("Modelo criado");
			router.push(`/configuracoes/modelos-impressao/${criado.id}`);
		} catch (erro) {
			toast.error("Erro ao salvar modelo", {
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
							<h1 className="text-2xl font-bold">Novo modelo de impressão</h1>
							<p className="text-sm text-muted-foreground">
								Monte o layout da ordem de serviço
							</p>
						</div>
					</div>
					<Button
						className="gap-2"
						onClick={() => void salvar()}
						disabled={criar.isPending}
					>
						<Save className="h-4 w-4" />
						{criar.isPending ? "Salvando..." : "Salvar"}
					</Button>
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
				/>
			</div>
		</PageContainer>
	);
}
