"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SUPER_NAV } from "@/constants/super-nav-constants";
import { useAuth } from "@/hooks/use-auth";
import { CPlusIcon } from "./icons/c-plus";

export function SuperSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { user } = useAuth();

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu className="flex flex-row items-center gap-1 select-none">
					<CPlusIcon size={32} />
					<h1 className="text-base font-semibold mb-0.5 group-data-[collapsible=icon]:hidden">
						Admin Plataforma
					</h1>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Menu</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{SUPER_NAV.navMain.map((item) => (
								<SidebarMenuItem key={item.url}>
									<SidebarMenuButton
										asChild
										isActive={pathname.startsWith(item.url)}
									>
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>Atalhos</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{SUPER_NAV.navSecondary.map((item) => (
								<SidebarMenuItem key={item.url}>
									<SidebarMenuButton asChild>
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user as { nome: string; email: string } | null} />
			</SidebarFooter>
		</Sidebar>
	);
}
