import { EditarNaturezaClient } from "./editar-natureza-client";

type EditarNaturezaPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarNaturezaPage({
	params,
}: EditarNaturezaPageProps) {
	const { id } = await params;

	return <EditarNaturezaClient id={id} />;
}
