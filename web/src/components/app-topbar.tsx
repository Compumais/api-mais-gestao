"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { NavMenuMobileSheet } from "@/components/nav-menu-mobile-sheet";
import { NavUserTopbar } from "@/components/nav-user-topbar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavItem } from "@/constants/nav-constants";
import { useNavFiltrada, type NavSecaoTopbar } from "@/hooks/use-nav-filtrada";
import { NavFixadosProvider } from "@/hooks/use-nav-fixados";
import { useSearchDialog } from "@/hooks/use-search-dialog";
import { cn } from "@/lib/utils";

function rotaEstaAtiva(pathname: string, url: string): boolean {
	const path = url.split("?")[0];
	if (!path || path === "#") return false;
	return pathname === path || pathname.startsWith(`${path}/`);
}

function itemTemRotaAtiva(item: NavItem, pathname: string): boolean {
	if (item.url && rotaEstaAtiva(pathname, item.url)) return true;
	return Boolean(item.items?.some((sub) => rotaEstaAtiva(pathname, sub.url)));
}

function secaoTemRotaAtiva(secao: NavSecaoTopbar, pathname: string): boolean {
	return secao.items.some((item) => itemTemRotaAtiva(item, pathname));
}

const topbarLinkClass =
	"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary-foreground/10 whitespace-nowrap";

const topbarLinkAtivoClass =
	"bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary";

function TopbarMainLink({
	item,
	pathname,
	onSearch,
}: {
	item: NavItem;
	pathname: string;
	onSearch: () => void;
}) {
	if (item.title === "Pesquisar") {
		return (
			<button
				type="button"
				onClick={onSearch}
				className={cn(topbarLinkClass, "cursor-pointer")}
			>
				{item.icon ? <item.icon className="size-4" /> : null}
				{item.title}
			</button>
		);
	}

	if (!item.url) return null;

	const ativo = rotaEstaAtiva(pathname, item.url);

	return (
		<Link
			href={item.url}
			className={cn(topbarLinkClass, ativo && topbarLinkAtivoClass)}
			aria-current={ativo ? "page" : undefined}
		>
			{item.icon ? <item.icon className="size-4" /> : null}
			{item.title}
		</Link>
	);
}

function TopbarSecaoDropdown({
	secao,
	pathname,
}: {
	secao: NavSecaoTopbar;
	pathname: string;
}) {
	const ativo = secaoTemRotaAtiva(secao, pathname);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						topbarLinkClass,
						ativo && topbarLinkAtivoClass,
						"cursor-pointer",
					)}
					aria-current={ativo ? "true" : undefined}
				>
					{secao.label}
					<ChevronDown className="size-3.5 opacity-80" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-[70vh] min-w-52 overflow-y-auto">
				{secao.items.map((item, index) => {
					if (item.url && !item.items?.length) {
						const itemAtivo = rotaEstaAtiva(pathname, item.url);
						return (
							<DropdownMenuItem key={item.title} asChild>
								<Link
									href={item.url}
									className={cn(itemAtivo && "font-medium text-primary")}
								>
									{item.icon ? <item.icon className="size-4" /> : null}
									{item.title}
								</Link>
							</DropdownMenuItem>
						);
					}

					return (
						<DropdownMenuGroup key={item.title}>
							{index > 0 ? <DropdownMenuSeparator /> : null}
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								{item.title}
							</DropdownMenuLabel>
							{item.items?.map((sub) => {
								const subAtivo = rotaEstaAtiva(pathname, sub.url);
								return (
									<DropdownMenuItem key={sub.url} asChild>
										<Link
											href={sub.url}
											className={cn(subAtivo && "font-medium text-primary")}
										>
											{sub.title}
										</Link>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuGroup>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AppTopbar() {
	const pathname = usePathname();
	const { setOpen: setSearchOpen } = useSearchDialog();
	const [mobileOpen, setMobileOpen] = useState(false);
	const { user, navMainItems, secoesTopbar } = useNavFiltrada();

	return (
		<NavFixadosProvider userId={user?.id}>
			<header className="sticky top-0 z-40 shrink-0 bg-primary text-primary-foreground shadow-sm">
				<div className="flex h-14 items-center gap-2 px-3 sm:px-4">
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground md:hidden"
						onClick={() => setMobileOpen(true)}
						aria-label="Abrir menu"
					>
						<Menu className="size-5" />
					</Button>

					<Link
						href="/dashboard"
						className="flex shrink-0 items-center gap-2 select-none"
					>
						<CPlusIcon size={32} />
						<div className="hidden leading-tight sm:block">
							<div className="text-sm font-semibold">Mais Gestão</div>
							<div className="text-[0.65rem] opacity-80">
								Gestão Financeira & Fiscal
							</div>
						</div>
					</Link>

					<nav
						className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 md:flex"
						aria-label="Menu principal"
					>
						{navMainItems.map((item) => (
							<TopbarMainLink
								key={item.title}
								item={item}
								pathname={pathname}
								onSearch={() => setSearchOpen(true)}
							/>
						))}
						{secoesTopbar.map((secao) => (
							<TopbarSecaoDropdown
								key={secao.label}
								secao={secao}
								pathname={pathname}
							/>
						))}
					</nav>

					<div className="ml-auto shrink-0">
						<NavUserTopbar
							user={
								user as {
									nome: string;
									email: string;
									perfil?: string | string[];
								} | null
							}
						/>
					</div>
				</div>
			</header>

			<NavMenuMobileSheet open={mobileOpen} onOpenChange={setMobileOpen} />
		</NavFixadosProvider>
	);
}
