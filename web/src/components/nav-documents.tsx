"use client";

import type { Icon } from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BotaoFixarNav } from "@/components/nav-botao-fixar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
	itemNavTemRotaAtiva,
	rotaNavEstaAtiva,
} from "@/lib/nav-rota-ativa";

type NavDocumentsItem = {
	title: string;
	url?: string;
	icon?: Icon;
	isActive?: boolean;
	items?: {
		title: string;
		url: string;
	}[];
};

function isLeafLink(item: NavDocumentsItem): boolean {
	return Boolean(item.url) && !item.items?.length;
}

export function NavDocuments({
	label,
	items,
}: {
	label: string;
	items: NavDocumentsItem[];
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	const ocultarRotulo =
		items.length === 1 &&
		items[0]?.title === label &&
		Boolean(items[0]?.items?.length);

	return (
		<SidebarGroup>
			{ocultarRotulo ? null : <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => {
					if (isLeafLink(item) && item.url) {
						const isPlaceholder = item.url === "#";
						const ativo = rotaNavEstaAtiva(pathname, search, item.url);
						return (
							<SidebarMenuItem key={item.title}>
								{isPlaceholder ? (
									<SidebarMenuButton tooltip={item.title} disabled>
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
									</SidebarMenuButton>
								) : (
									<>
										<SidebarMenuButton
											tooltip={item.title}
											isActive={ativo}
											asChild
										>
											<Link href={item.url}>
												{item.icon ? <item.icon /> : null}
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
										<BotaoFixarNav url={item.url} title={item.title} />
									</>
								)}
							</SidebarMenuItem>
						);
					}

					const aberto = item.isActive || itemNavTemRotaAtiva(pathname, search, item);

					return (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={aberto}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton tooltip={item.title} isActive={aberto}>
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								{item.items?.length ? (
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.items.map((subItem) => {
												const isPlaceholder = subItem.url === "#";
												const ativo = rotaNavEstaAtiva(pathname, search, subItem.url);
												return (
													<SidebarMenuSubItem key={subItem.title}>
														{isPlaceholder ? (
															<SidebarMenuSubButton aria-disabled>
																<span>{subItem.title}</span>
															</SidebarMenuSubButton>
														) : (
															<>
																<SidebarMenuSubButton
																	asChild
																	isActive={ativo}
																	className="pr-7"
																>
																	<Link href={subItem.url}>
																		<span>{subItem.title}</span>
																	</Link>
																</SidebarMenuSubButton>
																<BotaoFixarNav
																	url={subItem.url}
																	title={subItem.title}
																	variante="subitem"
																/>
															</>
														)}
													</SidebarMenuSubItem>
												);
											})}
										</SidebarMenuSub>
									</CollapsibleContent>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
