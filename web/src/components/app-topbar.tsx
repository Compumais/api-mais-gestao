"use client";

import { IconSearch } from "@tabler/icons-react";
import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavMenuMobileSheet } from "@/components/nav-menu-mobile-sheet";
import { NavUserTopbar } from "@/components/nav-user-topbar";
import { Button } from "@/components/ui/button";
import { useNavFiltrada, type NavSecaoTopbar } from "@/hooks/use-nav-filtrada";
import { NavFixadosProvider } from "@/hooks/use-nav-fixados";
import { useSearchDialog } from "@/hooks/use-search-dialog";
import {
	itemNavTemRotaAtiva,
	rotaNavEstaAtiva,
} from "@/lib/nav-rota-ativa";
import { cn } from "@/lib/utils";

function secaoTemRotaAtiva(
	secao: NavSecaoTopbar,
	pathname: string,
	search: string,
): boolean {
	return secao.items.some((item) =>
		itemNavTemRotaAtiva(pathname, search, item),
	);
}

const topbarTriggerClass =
	"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary-foreground/10 whitespace-nowrap";

const topbarTriggerAtivoClass =
	"bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary";

function TopbarSecaoPainel({
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
	return (
		<div className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{secao.items.map((item) => {
				if (item.url && !item.items?.length) {
					const ativo = rotaNavEstaAtiva(pathname, search, item.url);
					return (
						<div key={item.title}>
							<Link
								href={item.url}
								onClick={onNavigate}
								className={cn(
									"flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
									ativo && "font-medium text-primary",
								)}
							>
								{item.icon ? <item.icon className="size-4 shrink-0" /> : null}
								{item.title}
							</Link>
						</div>
					);
				}

				return (
					<div key={item.title} className="space-y-1">
						<div className="flex items-center gap-2 px-2 text-sm font-semibold">
							{item.icon ? <item.icon className="size-4 shrink-0" /> : null}
							{item.title}
						</div>
						<ul className="space-y-0.5">
							{item.items?.map((sub) => {
								const ativo = rotaNavEstaAtiva(pathname, search, sub.url);
								return (
									<li key={sub.url}>
										<Link
											href={sub.url}
											onClick={onNavigate}
											className={cn(
												"block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
												ativo && "font-medium text-primary",
											)}
										>
											{sub.title}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				);
			})}
		</div>
	);
}

export function AppTopbar() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	const { setOpen: setSearchOpen } = useSearchDialog();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
	const navRef = useRef<HTMLDivElement>(null);
	const { user, secoesTopbar } = useNavFiltrada();

	const secaoAtual = secoesTopbar.find((s) => s.label === secaoAberta) ?? null;

	useEffect(() => {
		setSecaoAberta(null);
	}, [pathname]);

	useEffect(() => {
		if (!secaoAberta) return;

		const fecharComEsc = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSecaoAberta(null);
		};

		const fecharFora = (event: MouseEvent) => {
			if (!navRef.current?.contains(event.target as Node)) {
				setSecaoAberta(null);
			}
		};

		document.addEventListener("keydown", fecharComEsc);
		document.addEventListener("mousedown", fecharFora);
		return () => {
			document.removeEventListener("keydown", fecharComEsc);
			document.removeEventListener("mousedown", fecharFora);
		};
	}, [secaoAberta]);

	const alternarSecao = (label: string) => {
		setSecaoAberta((atual) => (atual === label ? null : label));
	};

	return (
		<NavFixadosProvider userId={user?.id}>
			<div ref={navRef} className="relative">
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

						<Link href="/dashboard" className="shrink-0 select-none leading-tight">
							<div className="text-sm font-semibold">Mais Gestão</div>
							<div className="text-[0.65rem] opacity-80">
								Gestão Financeira & Fiscal
							</div>
						</Link>

						<nav
							className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 md:flex"
							aria-label="Menu principal"
						>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setSearchOpen(true)}
								className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
								aria-label="Pesquisar"
								title="Pesquisar"
							>
								<IconSearch className="size-4" />
							</Button>

							{secoesTopbar.map((secao) => {
								const ativo =
									secaoAberta === secao.label ||
									secaoTemRotaAtiva(secao, pathname, search);

								return (
									<button
										key={secao.label}
										type="button"
										onClick={() => alternarSecao(secao.label)}
										className={cn(
											topbarTriggerClass,
											ativo && topbarTriggerAtivoClass,
											"cursor-pointer",
										)}
										aria-expanded={secaoAberta === secao.label}
										aria-haspopup="true"
									>
										{secao.label}
										<ChevronDown
											className={cn(
												"size-3.5 opacity-80 transition-transform",
												secaoAberta === secao.label && "rotate-180",
											)}
										/>
									</button>
								);
							})}
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

				{secaoAtual ? (
					<div className="absolute left-0 right-0 top-full z-50 w-full border-b bg-background shadow-lg">
						<TopbarSecaoPainel
							secao={secaoAtual}
							pathname={pathname}
							search={search}
							onNavigate={() => setSecaoAberta(null)}
						/>
					</div>
				) : null}
			</div>

			<NavMenuMobileSheet open={mobileOpen} onOpenChange={setMobileOpen} />
		</NavFixadosProvider>
	);
}
