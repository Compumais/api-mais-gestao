import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { aplicarTema } from "@/lib/theme";
import { GlobalEscapeBack } from "@/ui/components/global-escape-back";
import { RequireCaixa } from "@/ui/guards/require-caixa";
import { RequireConfig } from "@/ui/guards/require-config";
import { RequireGourmet } from "@/ui/guards/require-gourmet";
import { RequireSessao } from "@/ui/guards/require-sessao";
import { AberturaCaixaPage } from "@/ui/pages/abertura-caixa-page";
import { BalcaoPage } from "@/ui/pages/balcao-page";
import { BootPage } from "@/ui/pages/boot-page";
import { ConfigPage } from "@/ui/pages/config-page";
import { DeliveryPage } from "@/ui/pages/delivery-page";
import { HomeEntry } from "@/ui/pages/home-page";
import { LoginPage } from "@/ui/pages/login-page";
import { MesaContaPage } from "@/ui/pages/mesa-conta-page";
import { NotasNaoSincronizadasPage } from "@/ui/pages/notas-nao-sincronizadas-page";
import { PedidosPage } from "@/ui/pages/pedidos-page";
import { VendasPage } from "@/ui/pages/vendas-page";

export function App() {
	useEffect(() => {
		void (async () => {
			try {
				const config = await pdvInvoke<Record<string, string>>("getConfig");
				aplicarTema(config.tema);
			} catch {
				// Mantém tema claro se a config ainda não estiver disponível.
			}
		})();
	}, []);

	return (
		<HashRouter>
			<GlobalEscapeBack />
			<Routes>
				<Route path="/boot" element={<BootPage />} />
				<Route path="/login" element={<LoginPage />} />

				<Route element={<RequireSessao />}>
					<Route path="/abertura-caixa" element={<AberturaCaixaPage />} />
					<Route element={<RequireConfig />}>
						<Route path="/config" element={<ConfigPage />} />
					</Route>

					<Route element={<RequireCaixa />}>
						<Route path="/" element={<HomeEntry />} />
						<Route element={<RequireGourmet />}>
							<Route path="/mesas/:numero" element={<MesaContaPage />} />
							<Route path="/delivery" element={<DeliveryPage />} />
							<Route path="/delivery/:id" element={<MesaContaPage />} />
							<Route path="/pedidos" element={<PedidosPage />} />
						</Route>
						<Route path="/balcao" element={<BalcaoPage />} />
						<Route path="/vendas" element={<VendasPage />} />
						<Route
							path="/vendas/nao-sincronizadas"
							element={<NotasNaoSincronizadasPage />}
						/>
					</Route>
				</Route>

				<Route path="*" element={<Navigate to="/boot" replace />} />
			</Routes>
		</HashRouter>
	);
}
