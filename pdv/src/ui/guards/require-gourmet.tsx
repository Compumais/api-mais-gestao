import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { rotaHomePdv, type StatusContext } from "@/lib/pdv-types";

/** Mesas e comandas só com o módulo gourmet da empresa. */
export function RequireGourmet() {
	const ctx = useOutletContext<StatusContext>();
	if (ctx.status && !ctx.status.moduloGourmet) {
		return <Navigate to={rotaHomePdv(ctx.status)} replace />;
	}
	if (!ctx.status?.moduloGourmet) {
		return null;
	}
	return <Outlet context={ctx} />;
}
