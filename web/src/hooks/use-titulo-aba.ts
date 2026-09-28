"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { useNavAbasAbertasOpcional } from "@/hooks/use-nav-abas-abertas";
import { truncarTituloAba } from "@/lib/nav-aba-titulos";

/**
 * Atualiza o título da aba da rota atual quando o nome da entidade estiver disponível.
 * No-op fora do NavAbasAbertasProvider.
 */
export function useTituloAba(titulo: string | undefined | null) {
	const pathname = usePathname() ?? "";
	const ctx = useNavAbasAbertasOpcional();
	const atualizarTituloAba = ctx?.atualizarTituloAba;
	const abaExiste = Boolean(ctx?.abas.some((aba) => aba.id === pathname));

	React.useEffect(() => {
		if (!atualizarTituloAba || !pathname || !titulo?.trim() || !abaExiste) {
			return;
		}
		atualizarTituloAba(pathname, truncarTituloAba(titulo));
	}, [atualizarTituloAba, pathname, titulo, abaExiste]);
}
