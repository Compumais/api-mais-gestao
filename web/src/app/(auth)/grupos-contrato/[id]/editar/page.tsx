import { EditarGrupoContratoClient } from "./editar-grupo-contrato-client";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function EditarGrupoContratoPage({ params }: Props) {
	const { id } = await params;
	return <EditarGrupoContratoClient id={id} />;
}
