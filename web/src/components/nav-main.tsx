"use client";

import type { Icon } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSearchDialog } from "@/hooks/use-search-dialog";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url?: string;
		icon?: Icon;
	}[];
}) {
	const pathname = usePathname();
	const { setOpen } = useSearchDialog();

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{items.map((item) => {
						const isSearch = item.title === "Pesquisar";

						if (isSearch) {
							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										tooltip={item.title}
										onClick={() => setOpen(true)}
									>
										{item.icon ? <item.icon /> : null}
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						}

						if (!item.url) return null;
						const isActive = pathname === item.url;
						return (
							<SidebarMenuItem key={item.title}>
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
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
