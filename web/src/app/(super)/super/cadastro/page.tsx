"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatarPerfilLabel } from "@/lib/perfis";
import { maskCep } from "@/lib/masks";
import { adminService } from "@/services/admin.service";
import { localidadesService } from "@/services/localidades.service";

const PERFIS = ["usuario", "admin", "proprietario", "garcom"];

const empresaFormInicial = {
	nome: "",
	cnpj: "",
	telefone: "",
	email: "",
	cep: "",
	idestado: "",
	idcidade: "",
	endereco: "",
	numero: "",
	complemento: "",
	bairro: "",
	idusuarioAssociado: "",
	perfilAssociado: "usuario",
};

export default function SuperCadastroPage() {
	const queryClient = useQueryClient();
	const ultimoCepBuscado = useRef<string | null>(null);
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

	const [empresaForm, setEmpresaForm] = useState(empresaFormInicial);
	const [buscandoCep, setBuscandoCep] = useState(false);

	const { data: estadosData, isLoading: carregandoEstados } = useQuery({
		queryKey: ["localidades", "estados"],
		queryFn: () => localidadesService.listarEstados(),
	});

	const { data: municipiosData, isLoading: carregandoMunicipios } = useQuery({
		queryKey: ["localidades", "municipios", empresaForm.idestado],
		queryFn: () => localidadesService.listarMunicipios(empresaForm.idestado),
		enabled: !!empresaForm.idestado,
	});

	const municipioOptions = useMemo(
		() =>
			(municipiosData?.data ?? []).map((municipio) => ({
				value: municipio.idcidade,
				label: municipio.nome,
			})),
		[municipiosData?.data],
	);

	useEffect(() => {
		const cepLimpo = empresaForm.cep.replace(/\D/g, "");
		if (cepLimpo.length !== 8) return;
		if (ultimoCepBuscado.current === cepLimpo) return;

		void (async () => {
			try {
				setBuscandoCep(true);
				ultimoCepBuscado.current = cepLimpo;
				const endereco = await localidadesService.buscarEnderecoPorCep(cepLimpo);
				setEmpresaForm((s) => ({
					...s,
					endereco: endereco.endereco || s.endereco,
					bairro: endereco.bairro || s.bairro,
					idestado: endereco.idestado || s.idestado,
					idcidade: endereco.idcidade || s.idcidade,
				}));
			} catch {
				toast.error("CEP não encontrado ou inválido");
				ultimoCepBuscado.current = null;
			} finally {
				setBuscandoCep(false);
			}
		})();
	}, [empresaForm.cep]);

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
			setEmpresaForm(empresaFormInicial);
			ultimoCepBuscado.current = null;
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
							<Label>CEP</Label>
							<Input
								placeholder="00000-000"
								value={empresaForm.cep}
								onChange={(e) => {
									const valor = maskCep(e.target.value);
									setEmpresaForm((s) => ({ ...s, cep: valor }));
									if (valor.replace(/\D/g, "").length < 8) {
										ultimoCepBuscado.current = null;
									}
								}}
							/>
							{buscandoCep ? (
								<p className="text-xs text-muted-foreground">Buscando CEP...</p>
							) : null}
						</div>
						<div className="space-y-2">
							<Label>Estado</Label>
							<Select
								value={empresaForm.idestado || undefined}
								onValueChange={(idestado) =>
									setEmpresaForm((s) => ({
										...s,
										idestado,
										idcidade: "",
									}))
								}
								disabled={carregandoEstados}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione o estado" />
								</SelectTrigger>
								<SelectContent>
									{estadosData?.data.map((estado) => (
										<SelectItem key={estado.idestado} value={estado.idestado}>
											{estado.nome} ({estado.idestado})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Cidade</Label>
							<Combobox
								options={municipioOptions}
								value={empresaForm.idcidade}
								onChange={(idcidade) =>
									setEmpresaForm((s) => ({ ...s, idcidade }))
								}
								placeholder={
									empresaForm.idestado
										? carregandoMunicipios
											? "Carregando cidades..."
											: "Selecione a cidade"
										: "Selecione o estado primeiro"
								}
								searchPlaceholder="Buscar cidade..."
								emptyMessage="Nenhuma cidade encontrada."
								disabled={!empresaForm.idestado || carregandoMunicipios}
							/>
						</div>
						<div className="space-y-2">
							<Label>Rua</Label>
							<Input
								value={empresaForm.endereco}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, endereco: e.target.value }))
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Número</Label>
								<Input
									value={empresaForm.numero}
									onChange={(e) =>
										setEmpresaForm((s) => ({ ...s, numero: e.target.value }))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Complemento</Label>
								<Input
									value={empresaForm.complemento}
									onChange={(e) =>
										setEmpresaForm((s) => ({
											...s,
											complemento: e.target.value,
										}))
									}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Bairro</Label>
							<Input
								value={empresaForm.bairro}
								onChange={(e) =>
									setEmpresaForm((s) => ({ ...s, bairro: e.target.value }))
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
