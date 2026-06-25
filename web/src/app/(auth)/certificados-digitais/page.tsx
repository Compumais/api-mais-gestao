import { redirect } from "next/navigation";

export default function CertificadosDigitaisRedirectPage() {
	redirect("/configuracoes?tab=nfe");
}
