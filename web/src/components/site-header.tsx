import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CompanyToogle } from "./company-toogle";
import { RefreshButton } from "./refresh-button";
import { ThemeToogle } from "./theme-toogle";

export function SiteHeader() {
	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<div className="ml-auto flex items-center gap-2">
					<CompanyToogle />
					<RefreshButton />
					<ThemeToogle />
					<Button variant="secondary" size="sm">
						<BellIcon className="size-4" />
					</Button>
				</div>
			</div>
		</header>
	);
}
