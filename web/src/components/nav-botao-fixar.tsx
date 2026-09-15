"use client";

import { IconPin, IconPinned } from "@tabler/icons-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { useNavFixadosOpcional } from "@/hooks/use-nav-fixados";
import { ehUrlNavFixavel } from "@/lib/nav-fixados";
import { cn } from "@/lib/utils";

export function BotaoFixarNav({
	url,
	title,
	variante = "item",
}: {
	url?: string;
	title: string;
	variante?: "item" | "subitem";
}) {
	const nav = useNavFixadosOpcional();
	if (!nav || !ehUrlNavFixavel(url)) return null;

	const fixado = nav.estaFixado(url);
	const rotulo = fixado ? `Desafixar ${title}` : `Fixar ${title} no topo`;

	return (
		<SidebarMenuAction
			type="button"
			showOnHover={variante === "item" && !fixado}
			aria-label={rotulo}
			title={rotulo}
			className={cn(
				variante === "subitem" &&
					!fixado &&
					"md:opacity-0 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100",
			)}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				nav.alternarFixado(url);
			}}
		>
			{fixado ? <IconPinned /> : <IconPin />}
		</SidebarMenuAction>
	);
}
