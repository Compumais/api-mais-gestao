"use client";

import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatarMoeda } from "@/lib/locacao-calculo";
import { equipamentoService } from "@/services/equipamento.service";

const SITUACAO: Record<string, string> = {
	disponivel: "Disponível",
	alocado: "Alocado",
	inativo: "Inativo",
};

export default function EquipamentosPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [descricao, setDescricao] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["equipamentos", empresa?.id, descricao],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			equipamentoService.listar({
				idempresa: empresa!.id,
				descricao: descricao || undefined,
				limit: 50,
			}),
	});

	const excluir = useMutation({
		mutationFn: (id: string) => equipamentoService.excluir(id, empresa!.id),
		onSuccess: () => {
			toast.success("Equipamento excluído");
			queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
		},
		onError: (erro: Error) => toast.error(erro.message || "Falha ao excluir"),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Equipamentos</h1>
				<Button asChild>
					<Link href="/equipamentos/novo">
						<IconPlus className="mr-2 size-4" />
						Novo
					</Link>
				</Button>
			</div>
			<div className="px-4 pb-4">
				<Input
					placeholder="Filtrar por descrição"
					value={descricao}
					onChange={(evento) => setDescricao(evento.target.value)}
					className="max-w-sm mb-4"
				/>
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Descrição</TableHead>
								<TableHead>Série</TableHead>
								<TableHead>Situação</TableHead>
								<TableHead>Diária</TableHead>
								<TableHead>Mensal</TableHead>
								<TableHead className="w-[100px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={7}>Carregando...</TableCell>
								</TableRow>
							)}
							{data?.data.map((item) => (
								<TableRow key={item.id}>
									<TableCell>{item.codigo}</TableCell>
									<TableCell>{item.descricao}</TableCell>
									<TableCell>{item.numeroserie || "—"}</TableCell>
									<TableCell>
										{SITUACAO[item.situacao] ?? item.situacao}
									</TableCell>
									<TableCell>{formatarMoeda(item.precodiaria)}</TableCell>
									<TableCell>{formatarMoeda(item.precomensal)}</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button asChild size="icon" variant="ghost">
												<Link href={`/equipamentos/${item.id}/editar`}>
													<IconPencil className="size-4" />
												</Link>
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => excluir.mutate(item.id)}
											>
												<IconTrash className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
							{!isLoading && data?.data.length === 0 && (
								<TableRow>
									<TableCell colSpan={7}>
										Nenhum equipamento cadastrado.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
