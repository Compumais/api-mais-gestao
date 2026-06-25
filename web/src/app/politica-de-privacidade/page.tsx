import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import {
	LEGAL_CONTACT,
	LEGAL_LAST_UPDATED,
} from "@/constants/legal-contact";

export const metadata: Metadata = {
	title: "Política de Privacidade | Mais Gestão",
	description:
		"Política de Privacidade da plataforma Mais Gestão — como tratamos seus dados pessoais.",
	openGraph: {
		title: "Política de Privacidade | Mais Gestão",
		description:
			"Informações sobre coleta, uso e proteção de dados na plataforma Mais Gestão.",
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function PoliticaDePrivacidadePage() {
	return (
		<LegalDocumentLayout
			title="Política de Privacidade"
			lastUpdated={LEGAL_LAST_UPDATED}
		>
			<section>
				<h2>1. Introdução</h2>
				<p>
					Esta Política de Privacidade descreve como a plataforma Mais Gestão
					trata dados pessoais no contexto de prestação do serviço SaaS de gestão
					financeira empresarial, em conformidade com a Lei Geral de Proteção de
					Dados (LGPD — Lei nº 13.709/2018).
				</p>
			</section>

			<section>
				<h2>2. Dados que podemos coletar</h2>
				<p>Dependendo do uso da plataforma, podemos tratar:</p>
				<ul>
					<li>
						dados de cadastro: nome, e-mail e informações necessárias para
						identificação da conta;
					</li>
					<li>
						dados de uso: registros de acesso, preferências e interações com
						funcionalidades da plataforma;
					</li>
					<li>
						dados operacionais inseridos pelo usuário: informações financeiras e
						cadastrais relacionadas às empresas gerenciadas;
					</li>
					<li>
						dados técnicos: endereço IP, tipo de navegador e informações de
						dispositivo, para segurança e funcionamento do serviço.
					</li>
				</ul>
			</section>

			<section>
				<h2>3. Finalidades do tratamento</h2>
				<p>Utilizamos os dados para:</p>
				<ul>
					<li>criar, autenticar e gerenciar contas de usuário;</li>
					<li>disponibilizar e melhorar as funcionalidades da plataforma;</li>
					<li>prestar suporte e responder solicitações;</li>
					<li>cumprir obrigações legais e regulatórias;</li>
					<li>proteger a segurança do serviço e prevenir fraudes.</li>
				</ul>
			</section>

			<section>
				<h2>4. Bases legais</h2>
				<p>
					O tratamento de dados pessoais pode ocorrer com fundamento em execução
					de contrato, cumprimento de obrigação legal, legítimo interesse
					(sempre respeitando direitos do titular) e, quando aplicável, com base
					no consentimento.
				</p>
			</section>

			<section>
				<h2>5. Compartilhamento de dados</h2>
				<p>
					Podemos compartilhar dados apenas quando necessário para operação do
					serviço, incluindo:
				</p>
				<ul>
					<li>
						prestadores de infraestrutura e serviços essenciais (por exemplo,
						hospedagem e comunicação);
					</li>
					<li>
						cumprimento de determinações legais, judiciais ou de autoridades
						competentes;
					</li>
					<li>
						proteção de direitos, segurança e integridade da plataforma e de
						seus usuários.
					</li>
				</ul>
				<p>
					Não comercializamos dados pessoais dos usuários.
				</p>
			</section>

			<section>
				<h2>6. Armazenamento e retenção</h2>
				<p>
					Os dados são mantidos pelo tempo necessário para cumprir as finalidades
					descritas nesta Política, respeitando prazos legais e contratuais.
					Após o encerramento da conta, informações podem ser mantidas pelo
					periodo exigido por lei ou para resguardar direitos legítimos.
				</p>
			</section>

			<section>
				<h2>7. Direitos do titular</h2>
				<p>
					Nos termos da LGPD, você pode solicitar, quando aplicável:
				</p>
				<ul>
					<li>confirmação da existência de tratamento;</li>
					<li>acesso, correção ou atualização de dados;</li>
					<li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
					<li>portabilidade, revogação de consentimento e informações sobre compartilhamento.</li>
				</ul>
				<p>
					Solicitações podem ser feitas pelos canais de contato indicados ao final
					desta Política.
				</p>
			</section>

			<section>
				<h2>8. Cookies e tecnologias similares</h2>
				<p>
					Utilizamos cookies e tecnologias similares para autenticação, preferências
					de sessão e funcionamento adequado da plataforma. Você pode gerenciar
					cookies nas configurações do seu navegador, ciente de que algumas
					funcionalidades podem ser afetadas.
				</p>
			</section>

			<section>
				<h2>9. Segurança da informação</h2>
				<p>
					Adotamos medidas técnicas e organizacionais compatíveis com a natureza
					do serviço para proteger dados pessoais contra acessos não autorizados,
					perda ou uso indevido. Nenhum sistema é totalmente imune a riscos, por
					isso recomendamos que cada usuário também adote boas práticas de
					segurança.
				</p>
			</section>

			<section>
				<h2>10. Alterações desta Política</h2>
				<p>
					Esta Política pode ser atualizada periodicamente. A data da última
					revisão será indicada no topo desta página. Alterações relevantes serão
					comunicadas por meios adequados, quando necessário.
				</p>
			</section>

			<section>
				<h2>11. Contato</h2>
				<p>
					Para exercer seus direitos ou esclarecer dúvidas sobre privacidade,
					entre em contato:
				</p>
				<ul>
					<li>
						E-mail:{" "}
						<a
							href={`mailto:${LEGAL_CONTACT.email}`}
							className="text-primary underline-offset-4 hover:underline"
						>
							{LEGAL_CONTACT.email}
						</a>
					</li>
					<li>Telefone: {LEGAL_CONTACT.telefone}</li>
					<li>Endereço: {LEGAL_CONTACT.endereco}</li>
				</ul>
				<p>
					Consulte também nossos{" "}
					<Link
						href="/termos-de-servico"
						className="text-primary underline-offset-4 hover:underline"
					>
						Termos de Serviço
					</Link>
					.
				</p>
			</section>
		</LegalDocumentLayout>
	);
}
