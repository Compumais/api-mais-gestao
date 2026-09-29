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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { adminService } from "@/services/admin.service";

type DialogEntitlementProprietarioProps = {
	userId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Nome do proprietário ou da empresa para o texto de ajuda */
	tituloNome?: string | null;
};

export function DialogEntitlementProprietario({
	userId,
	open,
	onOpenChange,
	tituloNome,
}: DialogEntitlementProprietarioProps) {
	const queryClient = useQueryClient();
	const [planoEntitlement, setPlanoEntitlement] = useState<string | null>(null);
	const [modulosEntitlement, setModulosEntitlement] = useState<string[]>([]);

	const { data: catalogo } = useQuery({
		queryKey: ["admin-planos-saas"],
		queryFn: adminService.listarPlanosSaas,
		enabled: open,
	});

	const { data: entitlement } = useQuery({
		queryKey: ["admin-entitlement", userId],
		queryFn: () => adminService.buscarEntitlementUsuario(userId ?? ""),
		enabled: open && !!userId,
	});

	useEffect(() => {
		if (!entitlement) return;
		setPlanoEntitlement(entitlement.plano);
		setModulosEntitlement(entitlement.modulos);
	}, [entitlement]);

	const entitlementMutation = useMutation({
		mutationFn: () => {
			if (!userId) throw new Error("Usuário não selecionado");
			return adminService.atualizarEntitlementUsuario(userId, {
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
			queryClient.invalidateQueries({ queryKey: ["admin-empresas"] });
			toast.success("Entitlements atualizados");
			onOpenChange(false);
		},
		onError: () => toast.error("Não foi possível atualizar os entitlements"),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Plano e módulos</DialogTitle>
				</DialogHeader>
				{userId && (
					<div className="space-y-5">
						<p className="text-sm text-muted-foreground">
							Defina plano e módulos
							{tituloNome ? ` de ${tituloNome}` : ""}. Esses acessos ficam no
							proprietário e são herdados por todos os usuários vinculados às
							empresas dele. Cada usuário continua limitado pelo próprio perfil
							(ex.: garçom, financeiro, admin).
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
							{entitlementMutation.isPending ? "Salvando..." : "Salvar acessos"}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
