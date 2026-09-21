import type { ReactNode } from "react";

export default function CardapioLayout({ children }: { children: ReactNode }) {
	return <div className="cardapio-publico min-h-svh">{children}</div>;
}
