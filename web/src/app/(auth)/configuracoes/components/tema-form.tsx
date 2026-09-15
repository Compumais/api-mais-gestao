"use client";

import { IconLayoutNavbar, IconLayoutSidebar } from "@tabler/icons-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useLayoutMenu,
	type LayoutMenuUsuario,
} from "@/hooks/use-preferencias-ui-usuario";
import { cn } from "@/lib/utils";

const opcoesLayout: {
	valor: LayoutMenuUsuario;
	titulo: string;
	descricao: string;
	icon: typeof IconLayoutSidebar;
}[] = [
	{
		valor: "sidebar",
		titulo: "Menu lateral",
		descricao: "Navegação vertical fixa à esquerda da tela.",
		icon: IconLayoutSidebar,
	},
	{
		valor: "topbar",
		titulo: "Menu no topo",
		descricao: "Navegação horizontal no cabeçalho, com menus suspensos.",
		icon: IconLayoutNavbar,
	},
];

export function TemaForm() {
	const { layoutMenu, setLayoutMenu, isSaving } = useLayoutMenu();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Layout do menu</CardTitle>
				<CardDescription>
					Escolha como deseja visualizar a navegação principal do sistema. A
					preferência é salva para o seu usuário e aplicada em todos os
					dispositivos.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2">
					{opcoesLayout.map((opcao) => {
						const Icon = opcao.icon;
						const selecionado = layoutMenu === opcao.valor;

						return (
							<button
								key={opcao.valor}
								type="button"
								disabled={isSaving}
								onClick={() => {
									if (!selecionado) setLayoutMenu(opcao.valor);
								}}
								className={cn(
									"flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
									selecionado &&
										"border-primary bg-primary/5 ring-2 ring-primary/20",
									isSaving && "pointer-events-none opacity-60",
								)}
								aria-pressed={selecionado}
							>
								<div
									className={cn(
										"flex size-10 items-center justify-center rounded-md",
										selecionado
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground",
									)}
								>
									<Icon className="size-5" />
								</div>
								<div>
									<div className="font-medium">{opcao.titulo}</div>
									<p className="text-muted-foreground mt-1 text-sm">
										{opcao.descricao}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
