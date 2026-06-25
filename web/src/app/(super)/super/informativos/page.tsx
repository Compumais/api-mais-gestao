"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminService } from "@/services/admin.service";

export default function SuperInformativosPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState({ titulo: "", conteudo: "" });

	const { data, isLoading } = useQuery({
		queryKey: ["admin-informativos"],
		queryFn: () => adminService.listarInformativos(),
	});

	const criarMutation = useMutation({
		mutationFn: () =>
			adminService.criarInformativo({
				...form,
				publicado: true,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-informativos"] });
			queryClient.invalidateQueries({ queryKey: ["informativos-publicos"] });
			toast.success("Informativo publicado");
			setForm({ titulo: "", conteudo: "" });
		},
	});

	const excluirMutation = useMutation({
		mutationFn: (id: string) => adminService.excluirInformativo(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-informativos"] });
			queryClient.invalidateQueries({ queryKey: ["informativos-publicos"] });
			toast.success("Informativo removido");
		},
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Informativos</h1>
				<p className="text-muted-foreground">
					Publique avisos para todos os usuários da plataforma
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Novo informativo</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-2">
						<Label>Título</Label>
						<Input
							value={form.titulo}
							onChange={(e) =>
								setForm((s) => ({ ...s, titulo: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>Conteúdo</Label>
						<Textarea
							rows={5}
							value={form.conteudo}
							onChange={(e) =>
								setForm((s) => ({ ...s, conteudo: e.target.value }))
							}
						/>
					</div>
					<Button onClick={() => criarMutation.mutate()}>Publicar</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Publicados</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<p>Carregando...</p>
					) : (
						data?.informativos.map((item) => (
							<div
								key={item.id}
								className="rounded-lg border p-4 flex justify-between gap-4"
							>
								<div>
									<h3 className="font-semibold">{item.titulo}</h3>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{item.conteudo}
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										{new Date(item.publicadoem).toLocaleString("pt-BR")}
									</p>
								</div>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => excluirMutation.mutate(item.id)}
								>
									Remover
								</Button>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
