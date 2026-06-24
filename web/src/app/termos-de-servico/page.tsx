import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import {
	LEGAL_CONTACT,
	LEGAL_LAST_UPDATED,
} from "@/constants/legal-contact";

export const metadata: Metadata = {
	title: "Termos de Serviço | Mais Gestão",
	description:
		"Termos de Serviço da plataforma Mais Gestão — SaaS de gestão financeira para empresas.",
	openGraph: {
		title: "Termos de Serviço | Mais Gestão",
		description:
			"Condições de uso da plataforma Mais Gestão para gestão financeira empresarial.",
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function TermosDeServicoPage() {
	return (
		<LegalDocumentLayout
			title="Termos de Serviço"
			lastUpdated={LEGAL_LAST_UPDATED}
		>
			<section>
				<h2>1. Objeto</h2>
				<p>
					Estes Termos de Serviço regulam o uso da plataforma Mais Gestão,
					solução SaaS destinada à gestão financeira de empresas, incluindo
					funcionalidades como controle de contas a pagar e receber, movimentações
					bancárias, relatórios e demais recursos disponibilizados conforme o
					plano contratado.
				</p>
				<p>
					Ao criar uma conta ou utilizar a plataforma, você declara ter lido,
					compreendido e concordado com estes Termos.
				</p>
			</section>

			<section>
				<h2>2. Cadastro e elegibilidade</h2>
				<p>
					Para utilizar o serviço, é necessário fornecer informações verdadeiras
					e mantê-las atualizadas. O usuário deve ser maior de 18 anos e possuir
					capacidade legal para contratar em nome próprio ou da organização que
					representa.
				</p>
				<p>
					Você é responsável pela confidencialidade de suas credenciais de acesso
					e por todas as atividades realizadas em sua conta.
				</p>
			</section>

			<section>
				<h2>3. Uso permitido</h2>
				<p>
					A plataforma deve ser utilizada exclusivamente para fins legítimos de
					gestão financeira e operacional da sua empresa ou das empresas sob sua
					responsabilidade, respeitando a legislação aplicável.
				</p>
				<p>É vedado, entre outras condutas:</p>
				<ul>
					<li>utilizar o serviço para fins ilícitos ou fraudulentos;</li>
					<li>tentar acessar áreas ou dados sem autorização;</li>
					<li>interferir no funcionamento ou na segurança da plataforma;</li>
					<li>reproduzir, copiar ou revender o serviço sem autorização.</li>
				</ul>
			</section>

			<section>
				<h2>4. Planos, pagamento e disponibilidade</h2>
				<p>
					Recursos, limites e condições comerciais podem variar conforme o plano
					contratado. Valores, periodicidade e formas de pagamento são informados
					no momento da contratação ou na área de assinatura da plataforma.
				</p>
				<p>
					Buscamos manter o serviço disponível de forma contínua, porém podem
					ocorrer interrupções para manutenção, atualizações ou por motivos de
					força maior. O suporte é prestado pelos canais oficiais de contato.
				</p>
			</section>

			<section>
				<h2>5. Dados e responsabilidade do usuário</h2>
				<p>
					Os dados financeiros e cadastrais inseridos na plataforma são de
					responsabilidade do usuário. Recomendamos revisar periodicamente as
					informações registradas e adotar boas práticas de segurança no uso das
					credenciais de acesso.
				</p>
				<p>
					O tratamento de dados pessoais está descrito na{" "}
					<Link
						href="/politica-de-privacidade"
						className="text-primary underline-offset-4 hover:underline"
					>
						Política de Privacidade
					</Link>
					.
				</p>
			</section>

			<section>
				<h2>6. Propriedade intelectual</h2>
				<p>
					A plataforma, sua marca, interface, software e conteúdos proprietários
					são protegidos por legislação aplicável. Nenhuma disposição destes
					Termos concede ao usuário direitos de propriedade sobre o serviço,
					apenas licença de uso conforme aqui estabelecido.
				</p>
			</section>

			<section>
				<h2>7. Limitação de responsabilidade</h2>
				<p>
					O Mais Gestão é uma ferramenta de apoio à gestão financeira. Decisões
					empresariais, fiscais, contábeis ou financeiras tomadas com base nas
					informações da plataforma são de responsabilidade exclusiva do usuário.
				</p>
				<p>
					Na extensão permitida pela lei, não nos responsabilizamos por danos
					indiretos, lucros cessantes ou perdas decorrentes de uso inadequado do
					serviço, indisponibilidade temporária ou informações incorretas
					inseridas pelo próprio usuário.
				</p>
			</section>

			<section>
				<h2>8. Suspensão e encerramento</h2>
				<p>
					Podemos suspender ou encerrar o acesso em caso de violação destes
					Termos, inadimplência ou uso que comprometa a segurança ou a operação
					do serviço. O usuário pode solicitar o encerramento de sua conta pelos
					canais oficiais de contato.
				</p>
			</section>

			<section>
				<h2>9. Alterações</h2>
				<p>
					Estes Termos podem ser atualizados periodicamente. Quando houver
					alterações relevantes, a data de atualização será revisada nesta
					página. O uso continuado da plataforma após a publicação das mudanças
					indica concordância com a versão vigente.
				</p>
			</section>

			<section>
				<h2>10. Contato</h2>
				<p>
					Para dúvidas sobre estes Termos, entre em contato:
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
			</section>
		</LegalDocumentLayout>
	);
}
