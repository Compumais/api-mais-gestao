import { EditarFichaProducaoClient } from "./editar-ficha-producao-client";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarFichaProducaoPage({ params }: PageProps) {
	const { id } = await params;
	return <EditarFichaProducaoClient id={id} />;
}
