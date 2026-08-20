"use client";

import { use } from "react";
import { PedidoEditor } from "../components/pedido-editor";

export default function PedidoDetalhePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <PedidoEditor pedidoId={id} />;
}
