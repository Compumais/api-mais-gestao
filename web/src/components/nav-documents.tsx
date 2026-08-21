"use client";

import type { Icon } from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

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
	return (
		<SidebarGroup>
			<SidebarGroupLabel>{label}</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					if (isLeafLink(item) && item.url) {
						const isPlaceholder = item.url === "#";
						return (
							<SidebarMenuItem key={item.title}>
								{isPlaceholder ? (
									<SidebarMenuButton tooltip={item.title} disabled>
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
									</SidebarMenuButton>
								) : (
									<SidebarMenuButton tooltip={item.title} asChild>
										<Link href={item.url}>
											{item.icon ? <item.icon /> : null}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
							</SidebarMenuItem>
						);
					}

					return (
						<Collapsible key={item.title} asChild defaultOpen={item.isActive}>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip={item.title}>
									<div className="flex items-center gap-2">
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
									</div>
								</SidebarMenuButton>
								{item.items?.length ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuAction className="data-[state=open]:rotate-90">
												<ChevronRight />
												<span className="sr-only">Toggle</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items.map((subItem) => (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton asChild>
															<Link href={subItem.url}>
																<span>{subItem.title}</span>
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
