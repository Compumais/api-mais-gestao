import { redirect } from "next/navigation";

type CfopEditarRedirectPageProps = {
	params: Promise<{ id: string }>;
};

export default async function CfopEditarRedirectPage({
	params,
}: CfopEditarRedirectPageProps) {
	const { id } = await params;
	redirect(`/tributos/naturezas/${id}/editar`);
}
