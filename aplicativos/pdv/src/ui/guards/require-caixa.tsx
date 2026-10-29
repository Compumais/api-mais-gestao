import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import type { StatusContext } from "@/lib/pdv-types";

/** Garante caixa aberto; caso contrário, envia para a abertura de caixa obrigatória. */
export function RequireCaixa() {
	const navigate = useNavigate();
	const ctx = useOutletContext<StatusContext>();
	const [verificando, setVerificando] = useState(!ctx.status?.caixa);
	const tentouRefresh = useRef(false);

	useEffect(() => {
		if (ctx.status?.caixa) {
			setVerificando(false);
			return;
		}
		if (tentouRefresh.current) {
			setVerificando(false);
			return;
		}
		tentouRefresh.current = true;
		let ativo = true;
		void (async () => {
			try {
				await ctx.refresh();
			} finally {
				if (ativo) setVerificando(false);
			}
		})();
		return () => {
			ativo = false;
		};
	}, [ctx.status?.caixa, ctx.refresh]);

	useEffect(() => {
		if (verificando) return;
		if (ctx.status && !ctx.status.caixa) {
			navigate("/abertura-caixa", { replace: true });
		}
	}, [ctx.status, navigate, verificando]);

	if (verificando || !ctx.status?.caixa) {
		return null;
	}

	return <Outlet context={ctx} />;
}
