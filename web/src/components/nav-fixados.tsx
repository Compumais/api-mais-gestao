"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotaoFixarNav } from "@/components/nav-botao-fixar";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavFixados } from "@/hooks/use-nav-fixados";
import { type ItemNavFixavel, resolverNavFixados } from "@/lib/nav-fixados";

export function NavFixados({
	itensDisponiveis,
}: {
	itensDisponiveis: ItemNavFixavel[];
}) {
	const pathname = usePathname();
	const { urls } = useNavFixados();
	const itens = resolverNavFixados(urls, itensDisponiveis);

	if (itens.length === 0) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Fixados</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{itens.map((item) => {
						const isActive = pathname === item.url.split("?")[0];
						return (
							<SidebarMenuItem key={item.url}>
								<SidebarMenuButton
									tooltip={item.title}
									asChild
									isActive={isActive}
								>
									<Link href={item.url}>
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
								<BotaoFixarNav url={item.url} title={item.title} />
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
