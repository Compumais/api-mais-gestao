"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatarPerfilLabel } from "@/lib/perfis";
import { adminService } from "@/services/admin.service";

const PERFIS = ["usuario", "admin", "proprietario", "garcom"];

export default function SuperCadastroPage() {
	const queryClient = useQueryClient();
	const { data: empresasData } = useQuery({
		queryKey: ["admin-empresas"],
		queryFn: () => adminService.listarEmpresas(),
	});

	const [usuarioForm, setUsuarioForm] = useState({
		nome: "",
		email: "",
		password: "",
		perfil: "usuario",
		idempresa: "",
	});

	const [empresaForm, setEmpresaForm] = useState({
		nome: "",
		cnpj: "",
		telefone: "",
		email: "",
		endereco: "",
		idusuarioAssociado: "",
		perfilAssociado: "usuario",
	});

	const criarUsuarioMutation = useMutation({
		mutationFn: () =>
			adminService.criarUsuario({
				...usuarioForm,
				empresasIds: usuarioForm.idempresa
					? [usuarioForm.idempresa]
					: undefined,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
			toast.success("Usuário criado");
			setUsuarioForm({
				nome: "",
				email: "",
				password: "",
				perfil: "usuario",
				idempresa: "",
			});
		},
	});

	const criarEmpresaMutation = useMutation({
		mutationFn: () =>
			adminService.criarEmpresa({
				...empresaForm,
				idusuarioAssociado: empresaForm.idusuarioAssociado || undefined,
				perfilAssociado: empresaForm.perfilAssociado,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-empresas"] });
			toast.success("Empresa criada");
			setEmpresaForm({
				nome: "",
				cnpj: "",
				telefone: "",
				email: "",
				endereco: "",
				idusuarioAssociado: "",
				perfilAssociado: "usuario",
			});
		},
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Cadastro</h1>
				<p className="text-muted-foreground">
					Cadastre usuários e empresas com associação opcional
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Novo usuário</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label>Nome</Label>
							<Input
								value={usuarioForm.nome}
								onChange={(e) =>
									setUsuarioForm((s) => ({ ...s, nome: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>E-mail</Label>
							<Input
								type="email"
								value={usuarioForm.email}
								onChange={(e) =>
									setUsuarioForm((s) => ({ ...s, email: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Senha</Label>
							<Input
								type="password"
								value={usuarioForm.password}
								onChange={(e) =>
									setUsuarioForm((s) => ({ ...s, password: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Perfil</Label>
							<Select
								value={usuarioForm.perfil}
								onValueChange={(perfil) =>
									setUsuarioForm((s) => ({ ...s, perfil }))
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
							<Label>Empresa (opcional)</Label>
							<Select
								value={usuarioForm.idempresa || "none"}
								onValueChange={(idempresa) =>
									setUsuarioForm((s) => ({
										...s,
										idempresa: idempresa === "none" ? "" : idempresa,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Sem associação" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Sem associação</SelectItem>
									{empresasData?.empresas.map((empresa) => (
										<SelectItem key={empresa.id} value={empresa.id}>
											{empresa.nome}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button onClick={() => criarUsuarioMutation.mutate()}>
							Cadastrar usuário
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Nova empresa</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label>Nome</Label>
							<Input
								value={empresaForm.nome}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, nome: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>CNPJ</Label>
							<Input
								value={empresaForm.cnpj}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, cnpj: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Telefone</Label>
							<Input
								value={empresaForm.telefone}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, telefone: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>E-mail</Label>
							<Input
								value={empresaForm.email}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, email: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Endereço</Label>
							<Textarea
								value={empresaForm.endereco}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, endereco: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Usuário associado (opcional)</Label>
							<Input
								placeholder="ID do usuário"
								value={empresaForm.idusuarioAssociado}
								onChange={(e) =>
									setEmpresaForm((s) => ({
										...s,
										idusuarioAssociado: e.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Perfil do associado</Label>
							<Select
								value={empresaForm.perfilAssociado}
								onValueChange={(perfilAssociado) =>
									setEmpresaForm((s) => ({ ...s, perfilAssociado }))
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
						<Button onClick={() => criarEmpresaMutation.mutate()}>
							Cadastrar empresa
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
