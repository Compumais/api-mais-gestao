import { EditarTipoContratoClient } from "./editar-tipo-contrato-client";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function EditarTipoContratoPage({ params }: Props) {
	const { id } = await params;
	return <EditarTipoContratoClient id={id} />;
}
