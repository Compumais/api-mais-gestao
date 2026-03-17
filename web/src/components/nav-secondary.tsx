"use client";

import type { Icon } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSearchDialog } from "@/hooks/use-search-dialog";

export function NavSecondary({
	label,
	items,
	...props
}: {
	label: string;
	items: {
		title: string;
		url: string;
		icon: Icon;
	}[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const pathname = usePathname();
	const { setOpen } = useSearchDialog();

	return (
		<SidebarGroup {...props}>
			<SidebarGroupLabel className="select-none">{label}</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => {
						const isActive = pathname === item.url;
						const isSearch = item.title === "Pesquisar";

						if (isSearch) {
							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										onClick={() => setOpen(true)}
										isActive={isActive}
									>
										<item.icon />
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						}

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild isActive={isActive}>
									<Link href={item.url}>
										<item.icon />
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
