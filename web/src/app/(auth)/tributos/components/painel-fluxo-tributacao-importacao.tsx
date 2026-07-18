import { IconInfoCircle } from "@tabler/icons-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type VariantePainel = "cfop-depara" | "parametrizacao";

type PainelFluxoTributacaoImportacaoProps = {
	variante: VariantePainel;
};

export function PainelFluxoTributacaoImportacao({
	variante,
}: PainelFluxoTributacaoImportacaoProps) {
	if (variante === "cfop-depara") {
		return (
			<Alert>
				<IconInfoCircle aria-hidden="true" />
				<AlertTitle>Para que serve este cadastro?</AlertTitle>
				<AlertDescription>
					<p>
						Ao finalizar a importação de uma NF de compra, o sistema precisa
						definir o <strong>CFOP de saída</strong> no cadastro do produto
						(para futuras vendas). Esta tela mapeia o CFOP que veio na nota de
						entrada para o CFOP de saída desejado.
					</p>
					<p className="mt-2">
						<strong>Exemplo:</strong> compra com CFOP 1102 (entrada dentro do
						estado) → produto recebe CFOP 5102 (venda dentro do estado).
					</p>
					<p className="mt-2">
						<strong>Ordem de prioridade na importação:</strong>
					</p>
					<ol className="mt-1 list-decimal pl-5 space-y-1">
						<li>
							<Link
								href="/tributos/parametrizacao"
								className="text-primary underline-offset-4 hover:underline"
							>
								Parametrização de tributos
							</Link>{" "}
							(regra completa com CST, NCM e tributos de saída)
						</li>
						<li>
							<strong>Mapeamento CFOP</strong> (esta tela) — apenas conversão de
							CFOP
						</li>
						<li>
							Conversão automática quando não houver cadastro (1xxx→5xxx,
							2xxx→6xxx, 3xxx→7xxx)
						</li>
					</ol>
					<p className="mt-2 text-muted-foreground">
						O campo UF é opcional: use quando a regra valer apenas para
						fornecedores de um estado. Regras com UF têm prioridade sobre regras
						gerais (sem UF).
					</p>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert>
			<IconInfoCircle aria-hidden="true" />
			<AlertTitle>Para que serve este cadastro?</AlertTitle>
			<AlertDescription>
				<p>
					Define regras completas de <strong>tributação de saída</strong> com
					base no perfil fiscal do item no XML da NF de compra: CFOP do
					fornecedor, CST/CSOSN, NCM e UF. Na finalização da importação, o
					sistema aplica CFOP de saída (NFe e NFC-e), CST/CSOSN e demais campos
					no cadastro do produto.
				</p>
				<p className="mt-2">
					<strong>CFOP do critério:</strong> deve ser o CFOP do XML do fornecedor
					(ex.: 5102, 6102), não o CFOP operacional de entrada (1xxx/2xxx) usado
					no estoque.
				</p>
				<p className="mt-2">
					<strong>Critérios:</strong> CFOP é obrigatório; CST, CSOSN, NCM e UF
					refinam a regra. Quanto mais campos preenchidos, mais específica é a
					regra e maior a prioridade no matching.
				</p>
				<p className="mt-2">
					<strong>Ordem de prioridade na importação:</strong>
				</p>
				<ol className="mt-1 list-decimal pl-5 space-y-1">
					<li>
						<strong>Parametrização de tributos</strong> (esta tela) — tem
						prioridade máxima
					</li>
					<li>
						<Link
							href="/tributos/cfop-depara"
							className="text-primary underline-offset-4 hover:underline"
						>
							Mapeamento CFOP
						</Link>{" "}
						— apenas CFOP de saída, se não houver regra aqui
					</li>
					<li>Heurística automática de CST e conversão de CFOP</li>
				</ol>
				<p className="mt-2 text-muted-foreground">
					Marque &quot;Ignorar primeiro dígito do CST&quot; quando o XML trouxer
					CST com origem (ex.: 000) e a regra estiver cadastrada só com os dois
					últimos dígitos (ex.: 00). O sistema também compara os últimos 2
					dígitos quando os comprimentos diferem.
				</p>
			</AlertDescription>
		</Alert>
	);
}
