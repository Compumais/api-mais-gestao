"use client";

import { IconSearch } from "@tabler/icons-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { NavItem } from "@/constants/nav-constants";
import { useNavFiltrada, type NavSecaoTopbar } from "@/hooks/use-nav-filtrada";
import { NavFixadosProvider } from "@/hooks/use-nav-fixados";
import { useSearchDialog } from "@/hooks/use-search-dialog";
import {
	itemNavTemRotaAtiva,
	rotaNavEstaAtiva,
} from "@/lib/nav-rota-ativa";
import { cn } from "@/lib/utils";
import { NavFixados } from "./nav-fixados";

function secaoTemRotaAtiva(
	secao: NavSecaoTopbar,
	pathname: string,
	search: string,
): boolean {
	return secao.items.some((item) =>
		itemNavTemRotaAtiva(pathname, search, item),
	);
}

function NavLinkMobile({
	href,
	children,
	onNavigate,
	ativo,
}: {
	href: string;
	children: React.ReactNode;
	onNavigate: () => void;
	ativo?: boolean;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			className={cn(
				"flex items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
				ativo && "bg-primary/10 font-medium text-primary",
			)}
		>
			{children}
		</Link>
	);
}

function NavItemMobile({
	item,
	pathname,
	search,
	onNavigate,
}: {
	item: NavItem;
	pathname: string;
	search: string;
	onNavigate: () => void;
}) {
	const isLeaf = Boolean(item.url) && !item.items?.length;

	if (isLeaf && item.url) {
		if (item.url === "#") return null;
		return (
			<NavLinkMobile
				href={item.url}
				onNavigate={onNavigate}
				ativo={rotaNavEstaAtiva(pathname, search, item.url)}
			>
				{item.icon ? <item.icon className="mr-2 size-4 shrink-0" /> : null}
				{item.title}
			</NavLinkMobile>
		);
	}

	const aberto = itemNavTemRotaAtiva(pathname, search, item);

	return (
		<Collapsible defaultOpen={aberto} className="group/collapsible">
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
				<span className="flex items-center gap-2">
					{item.icon ? <item.icon className="size-4 shrink-0" /> : null}
					{item.title}
				</span>
				<ChevronRight className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent className="ml-4 space-y-0.5 border-l pl-2">
				{item.items?.map((sub) => (
					<NavLinkMobile
						key={sub.url}
						href={sub.url}
						onNavigate={onNavigate}
						ativo={rotaNavEstaAtiva(pathname, search, sub.url)}
					>
						{sub.title}
					</NavLinkMobile>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

function NavSecaoMobile({
	secao,
	pathname,
	search,
	onNavigate,
}: {
	secao: NavSecaoTopbar;
	pathname: string;
	search: string;
	onNavigate: () => void;
}) {
	const aberto = secaoTemRotaAtiva(secao, pathname, search);

	return (
		<Collapsible defaultOpen={aberto} className="group/secao">
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted">
				{secao.label}
				<ChevronDown className="size-4 transition-transform group-data-[state=open]/secao:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-0.5 pb-2">
				{secao.items.map((item) => (
					<NavItemMobile
						key={item.title}
						item={item}
						pathname={pathname}
						search={search}
						onNavigate={onNavigate}
					/>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

function NavMenuMobileContent({ onNavigate }: { onNavigate: () => void }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	const { setOpen: setSearchOpen } = useSearchDialog();
	const {
		isGarcomUser,
		secoesTopbar,
		itensNavFixaveis,
	} = useNavFiltrada();

	return (
		<div className="flex-1 overflow-y-auto px-2">
			<div className="space-y-1 py-2">
				<button
					type="button"
					onClick={() => {
						setSearchOpen(true);
						onNavigate();
					}}
					className="flex w-full items-center justify-center rounded-md px-3 py-2 text-sm hover:bg-muted"
					aria-label="Pesquisar"
					title="Pesquisar"
				>
					<IconSearch className="size-5" />
				</button>

				{!isGarcomUser && itensNavFixaveis.length > 0 && (
					<div className="pt-2">
						<NavFixados itensDisponiveis={itensNavFixaveis} />
					</div>
				)}

				{secoesTopbar.map((secao) => (
					<NavSecaoMobile
						key={secao.label}
						secao={secao}
						pathname={pathname}
						search={search}
						onNavigate={onNavigate}
					/>
				))}
			</div>
		</div>
	);
}

export function NavMenuMobileSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { user } = useNavFiltrada();
	const onNavigate = () => onOpenChange(false);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="left" className="flex w-[min(100vw-2rem,18rem)] flex-col p-0">
				<SheetHeader className="border-b px-4 py-3 text-left">
					<div>
						<SheetTitle className="text-base">Mais Gestão</SheetTitle>
						<SheetDescription className="text-xs">
							Gestão Financeira & Fiscal
						</SheetDescription>
					</div>
				</SheetHeader>
				<NavFixadosProvider userId={user?.id}>
					<NavMenuMobileContent onNavigate={onNavigate} />
				</NavFixadosProvider>
			</SheetContent>
		</Sheet>
	);
}
