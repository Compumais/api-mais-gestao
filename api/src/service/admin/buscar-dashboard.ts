import type { HttpResponse } from "@/model/http-model.js";
import { buscarMetricasDashboardAdmin } from "@/repositories/admin-metricas-repositories.js";
import { httpOk } from "@/util/http-util.js";

export async function buscarDashboardAdminService(): Promise<HttpResponse<unknown>> {
	const metricas = await buscarMetricasDashboardAdmin();
	return httpOk(metricas);
}
