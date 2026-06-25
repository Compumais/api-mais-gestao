import { redirect } from "next/navigation";

export default function ConfiguracaoFiscalRedirectPage() {
	redirect("/configuracoes?tab=empresa-fiscal");
}
