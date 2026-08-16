import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { isBooted } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import type { StatusPdv } from "@/lib/pdv-types";

/**
 * Garante sessão ativa. Na primeira vez que uma rota protegida é acessada
 * nesta execução do app, redireciona para /boot (sincronização inicial).
 */
export function RequireSessao() {
	const navigate = useNavigate();
	const [status, setStatus] = useState<StatusPdv | null>(null);
	const [redirecionarBoot, setRedirecionarBoot] = useState(false);
	const [pronto, setPronto] = useState(false);

	const refresh = useCallback(async () => {
		const s = await pdvInvoke<StatusPdv>("getStatus");
		setStatus(s);
		if (!s.sessao.logado) {
			navigate("/login", { replace: true });
			return;
		}
		setPronto(true);
	}, [navigate]);

	useEffect(() => {
		if (!isBooted()) {
			setRedirecionarBoot(true);
			return;
		}
		void refresh();
		const id = setInterval(() => void refresh(), 15000);
		return () => clearInterval(id);
	}, [refresh]);

	if (redirecionarBoot) {
		return <Navigate to="/boot" replace />;
	}

	if (!pronto) {
		return null;
	}

	return <Outlet context={{ status, refresh }} />;
}
