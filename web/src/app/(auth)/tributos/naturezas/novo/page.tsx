import { NaturezaForm } from "../components/natureza-form";

export default function NovaNaturezaPage() {
	return (
		<section className="px-4">
			<h1 className="mb-4 text-2xl font-bold">Nova natureza</h1>
			<div className="rounded-lg border bg-card p-4">
				<NaturezaForm modo="criar" />
			</div>
		</section>
	);
}
