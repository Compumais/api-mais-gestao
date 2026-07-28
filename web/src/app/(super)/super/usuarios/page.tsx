"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatarPerfilLabel } from "@/lib/perfis";
import { type AdminUsuario, adminService } from "@/services/admin.service";

const PERFIS = ["usuario", "admin", "proprietario", "garcom", "super"];

function ehProprietario(usuario: AdminUsuario) {
	return (usuario.perfil ?? []).includes("proprietario");
}

export default function SuperUsuariosPage() {
	const queryClient = useQueryClient();
	const [selecionado, setSelecionado] = useState<AdminUsuario | null>(null);
	const [usuarioEntitlement, setUsuarioEntitlement] =
		useState<AdminUsuario | null>(null);
	const [novaSenha, setNovaSenha] = useState("");
	const [planoEntitlement, setPlanoEntitlement] = useState<string | null>(null);
	const [modulosEntitlement, setModulosEntitlement] = useState<string[]>([]);

	const { data, isLoading } = useQuery({
		queryKey: ["admin-usuarios"],
		queryFn: () => adminService.listarUsuarios({ limit: 100 }),
	});
	const { data: catalogo } = useQuery({
		queryKey: ["admin-planos-saas"],
		queryFn: adminService.listarPlanosSaas,
	});
	const { data: entitlement } = useQuery({
		queryKey: ["admin-entitlement", usuarioEntitlement?.id],
		queryFn: () =>
			adminService.buscarEntitlementUsuario(usuarioEntitlement?.id ?? ""),
		enabled: !!usuarioEntitlement,
	});

	useEffect(() => {
		if (!entitlement) return;
		setPlanoEntitlement(entitlement.plano);
		setModulosEntitlement(entitlement.modulos);
	}, [entitlement]);

	const atualizarMutation = useMutation({
		mutationFn: ({
			id,
			dados,
		}: {
			id: string;
			dados: Partial<{ nome: string; email: string; perfil: string }>;
		}) => adminService.atualizarUsuario(id, dados),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
			toast.success("Usuário atualizado");
		},
	});

	const senhaMutation = useMutation({
		mutationFn: ({ id, senha }: { id: string; senha: string }) =>
			adminService.alterarSenha(id, senha),
		onSuccess: () => {
			setNovaSenha("");
			toast.success("Senha alterada");
		},
	});

	const inativarMutation = useMutation({
		mutationFn: (id: string) => adminService.inativarUsuario(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
			toast.success("Usuário inativado");
		},
	});

	const ativarMutation = useMutation({
		mutationFn: (id: string) => adminService.ativarUsuario(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
			toast.success("Usuário ativado");
		},
	});
	const entitlementMutation = useMutation({
		mutationFn: () => {
			if (!usuarioEntitlement) throw new Error("Usuário não selecionado");
			return adminService.atualizarEntitlementUsuario(usuarioEntitlement.id, {
				plano: planoEntitlement,
				modulos: (catalogo?.modulos ?? []).map((modulo) => ({
					codigo: modulo.codigo,
					ativo: modulosEntitlement.includes(modulo.codigo),
				})),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
			queryClient.invalidateQueries({ queryKey: ["admin-entitlement"] });
			toast.success("Entitlements atualizados");
			setUsuarioEntitlement(null);
		},
		onError: () => toast.error("Não foi possível atualizar os entitlements"),
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Usuários da Plataforma</h1>
				<p className="text-muted-foreground">
					Gerencie usuários sem exclusão — apenas inativação
				</p>
			</div>

			{isLoading ? (
				<p>Carregando...</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>E-mail</TableHead>
							<TableHead>Perfil</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data?.usuarios.map((usuario) => (
							<TableRow key={usuario.id}>
								<TableCell>{usuario.nome}</TableCell>
								<TableCell>{usuario.email}</TableCell>
								<TableCell>
									{formatarPerfilLabel(usuario.perfil?.[0])}
								</TableCell>
								<TableCell>
									{usuario.ativo === false ? "Inativo" : "Ativo"}
								</TableCell>
								<TableCell className="text-right space-x-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => setSelecionado(usuario)}
									>
										Editar
									</Button>
									{ehProprietario(usuario) && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => setUsuarioEntitlement(usuario)}
										>
											Plano e módulos
										</Button>
									)}
									{usuario.ativo === false ? (
										<Button
											size="sm"
											onClick={() => ativarMutation.mutate(usuario.id)}
										>
											Ativar
										</Button>
									) : (
										<Button
											size="sm"
											variant="destructive"
											onClick={() => inativarMutation.mutate(usuario.id)}
										>
											Inativar
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<Dialog open={!!selecionado} onOpenChange={() => setSelecionado(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar usuário</DialogTitle>
					</DialogHeader>
					{selecionado && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Nome</Label>
								<Input
									defaultValue={selecionado.nome}
									onBlur={(e) =>
										atualizarMutation.mutate({
											id: selecionado.id,
											dados: { nome: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>E-mail</Label>
								<Input
									defaultValue={selecionado.email}
									onBlur={(e) =>
										atualizarMutation.mutate({
											id: selecionado.id,
											dados: { email: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Perfil</Label>
								<Select
									defaultValue={selecionado.perfil?.[0] ?? "usuario"}
									onValueChange={(perfil) =>
										atualizarMutation.mutate({
											id: selecionado.id,
											dados: { perfil },
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PERFIS.map((perfil) => (
											<SelectItem key={perfil} value={perfil}>
												{formatarPerfilLabel(perfil)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Nova senha</Label>
								<Input
									type="password"
									value={novaSenha}
									onChange={(e) => setNovaSenha(e.target.value)}
								/>
								<Button
									onClick={() =>
										senhaMutation.mutate({
											id: selecionado.id,
											senha: novaSenha,
										})
									}
									disabled={novaSenha.length < 6}
								>
									Alterar senha
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!usuarioEntitlement}
				onOpenChange={(open) => !open && setUsuarioEntitlement(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Plano e módulos</DialogTitle>
					</DialogHeader>
					{usuarioEntitlement && (
						<div className="space-y-5">
							<p className="text-sm text-muted-foreground">
								Defina os acessos de {usuarioEntitlement.nome}.
							</p>
							<div className="space-y-2">
								<Label>Plano</Label>
								<Select
									value={planoEntitlement ?? "SEM_PLANO"}
									onValueChange={(value) =>
										setPlanoEntitlement(value === "SEM_PLANO" ? null : value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sem plano" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="SEM_PLANO">Sem plano</SelectItem>
										{catalogo?.planos.map((plano) => (
											<SelectItem key={plano.codigo} value={plano.codigo}>
												{plano.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Módulos</Label>
								{catalogo?.modulos.map((modulo) => {
									const ativo = modulosEntitlement.includes(modulo.codigo);
									return (
										<div
											key={modulo.codigo}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												aria-label={modulo.nome}
												checked={ativo}
												onCheckedChange={(checked) =>
													setModulosEntitlement((modulos) =>
														checked === true
															? [...modulos, modulo.codigo]
															: modulos.filter(
																	(codigo) => codigo !== modulo.codigo,
																),
													)
												}
											/>
											{modulo.nome}
										</div>
									);
								})}
							</div>
							<Button
								className="w-full"
								onClick={() => entitlementMutation.mutate()}
								disabled={entitlementMutation.isPending}
							>
								{entitlementMutation.isPending
									? "Salvando..."
									: "Salvar acessos"}
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
