import type { Metadata } from "next";
import { MinhaContaForm } from "./components/minha-conta-form";

export const metadata: Metadata = {
	title: "Minha Conta",
	description: "Gerencie suas informações pessoais e senha",
};

export default function MinhaContaPage() {
	return (
		<div className="container py-6 px-4">
			<div className="max-w-2xl">
				<MinhaContaForm />
			</div>
		</div>
	);
}
