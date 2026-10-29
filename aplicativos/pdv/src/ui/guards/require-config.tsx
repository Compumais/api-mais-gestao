import { useEffect } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { rotaHomePdv, type StatusContext } from "@/lib/pdv-types";

/** Configurações do PDV só para admin, proprietário ou super. */
export function RequireConfig() {
	const navigate = useNavigate();
	const ctx = useOutletContext<StatusContext>();

	useEffect(() => {
		if (ctx.status && !ctx.status.podeConfigurar) {
			navigate(rotaHomePdv(ctx.status), { replace: true });
		}
	}, [ctx.status, navigate]);

	if (!ctx.status?.podeConfigurar) {
		return null;
	}

	return <Outlet context={ctx} />;
}
