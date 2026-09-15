import {
	IconBrandFacebook,
	IconBrandInstagram,
	IconBrandLinkedin,
	IconBrandTwitter,
	IconCashRegister,
	IconChartBar,
	IconClipboardList,
	IconFileInvoice,
	IconPackage,
	IconReceiptTax,
	IconReportMoney,
	IconShield,
	IconToolsKitchen2,
	IconUsers,
} from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LEGAL_CONTACT } from "@/constants/legal-contact";
import { SolicitacaoDemonstracaoForm } from "./components/solicitacao-demonstracao-form";

export const metadata: Metadata = {
	title: "Mais Gestão - Sistema de gestão para o seu negócio",
	description:
		"Venda no caixa, controle estoque e acompanhe o financeiro. Módulos de Gourmet, emissão de NF-e e NFC-e e ordens de serviço conforme o seu negócio.",
	openGraph: {
		title: "Mais Gestão - Sistema de gestão para o seu negócio",
		description:
			"Sistema de gestão com módulos para restaurante, notas fiscais e ordens de serviço.",
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};

const pilares = [
	{
		title: "Vender com facilidade",
		description:
			"Atenda no caixa, faça orçamentos e registre o pagamento. Sem passar a venda de um programa para outro.",
	},
	{
		title: "Saber o que tem e o que falta",
		description:
			"Estoque atualizado a cada venda ou compra, e o caixa visível: o que pagar, o que receber e o saldo das contas.",
	},
	{
		title: "Facilitar a vida do contador",
		description:
			"O movimento do mês já está organizado. Você envia os arquivos e relatórios que a contabilidade precisa, sem montar planilha no fim do período.",
	},
	{
		title: "Ligar só o que o negócio precisa",
		description:
			"Gourmet, emissão de notas e ordens de serviço são módulos. Você usa o sistema e escolhe o que entra na sua operação.",
	},
];

const modulos = [
	{
		icon: IconToolsKitchen2,
		title: "Gourmet",
		paraQuem: "Restaurante e lanchonete",
		description:
			"Mesas, comanda e pedido pelo celular do garçom. Fecha a conta na hora, com o que foi consumido.",
	},
	{
		icon: IconFileInvoice,
		title: "Emissão de notas",
		paraQuem: "NF-e e NFC-e",
		description:
			"Nota da venda para o cliente e cupom no caixa, sem outro programa. A nota de compra do fornecedor também entra no sistema.",
	},
	{
		icon: IconClipboardList,
		title: "Ordens de serviço",
		paraQuem: "Oficina e assistência",
		description:
			"Abra o serviço, acompanhe o andamento e feche com o cliente. Do orçamento ao reparo, tudo no mesmo lugar.",
	},
];

const capacidadesBase = [
	{
		icon: IconCashRegister,
		title: "Caixa da loja",
		description:
			"Venda no computador, no celular ou na maquininha. Fecha o caixa no fim do dia e vê como o cliente pagou.",
	},
	{
		icon: IconPackage,
		title: "Estoque sob controle",
		description:
			"Saiba o que tem na prateleira, o que precisa comprar e o custo do produto. A venda baixa o estoque automaticamente.",
	},
	{
		icon: IconChartBar,
		title: "Financeiro do jeito que você usa",
		description:
			"Contas a pagar e a receber, contas bancárias e relatórios para entender se o mês fechou no azul.",
	},
	{
		icon: IconReceiptTax,
		title: "Impostos calculados para você",
		description:
			"O sistema aplica as regras da sua empresa na hora da venda. Menos erro na nota e menos surpresa na hora de emitir.",
	},
	{
		icon: IconReportMoney,
		title: "Relatórios para decidir e prestar contas",
		description:
			"Acompanhe vendas, compras e o resultado do período. Quando o contador pedir, os arquivos já saem prontos.",
	},
	{
		icon: IconUsers,
		title: "Equipe e mais de uma empresa",
		description:
			"Cada pessoa vê só o que precisa. Se você tem mais de um CNPJ, gerencia todos na mesma conta.",
	},
];

const etapasContratacao = [
	{
		passo: "1",
		title: "Peça uma demonstração",
		description:
			"Conte o tipo do seu negócio e se precisa de Gourmet, notas ou ordens de serviço.",
	},
	{
		passo: "2",
		title: "Veja o sistema na prática",
		description:
			"Mostramos o sistema e só os módulos que fazem sentido para você.",
	},
	{
		passo: "3",
		title: "Receba uma proposta do seu jeito",
		description:
			"Você monta o que vai usar: o sistema e, se quiser, Gourmet, emissão de notas e OS.",
	},
	{
		passo: "4",
		title: "Comece com a gente junto",
		description:
			"Ajudamos a cadastrar, treinar a equipe e colocar o sistema para rodar.",
	},
];

/*
const plans = [
	{
		name: "Básico",
		price: "R$ 99",
		period: "/mês",
		description: "Ideal para pequenas empresas que estão começando",
		features: [
			"Até 2 empresas",
			"Gestão de contas a pagar e receber",
			"Relatórios básicos",
			"Suporte por email",
			"Dashboard simplificado",
			"Até 5 usuários",
		],
		cta: "Começar agora",
		popular: false,
	},
	{
		name: "Premium",
		price: "R$ 299",
		period: "/mês",
		description: "Para empresas em crescimento que precisam de mais recursos",
		features: [
			"Empresas ilimitadas",
			"Todas as funcionalidades do Básico",
			"Relatórios avançados e personalizados",
			"Suporte prioritário 24/7",
			"Dashboard completo com analytics",
			"Usuários ilimitados",
			"API para integrações",
			"Backup automático diário",
		],
		cta: "Assinar Premium",
		popular: true,
	},
	{
		name: "Multi-empresa",
		price: "Em breve",
		period: "",
		description: "Solução completa para grupos empresariais",
		features: [
			"Todas as funcionalidades Premium",
			"Gestão centralizada de múltiplas empresas",
			"Consolidação de relatórios",
			"Suporte dedicado",
			"Customizações avançadas",
		],
		cta: "Avisar quando disponível",
		popular: false,
		comingSoon: true,
	},
];

const clients = [
	{ name: "TechCorp Solutions", initials: "TC" },
	{ name: "Global Finance Group", initials: "GF" },
	{ name: "Innovate Systems", initials: "IS" },
	{ name: "Prime Business", initials: "PB" },
	{ name: "Elite Commerce", initials: "EC" },
	{ name: "Smart Ventures", initials: "SV" },
	{ name: "Dynamic Enterprises", initials: "DE" },
	{ name: "Apex Industries", initials: "AI" },
	{ name: "Nexus Corporation", initials: "NC" },
	{ name: "Summit Holdings", initials: "SH" },
	{ name: "Velocity Partners", initials: "VP" },
	{ name: "Catalyst Group", initials: "CG" },
];
*/

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
							MG
						</div>
						<span className="text-xl font-bold">Mais Gestão</span>
					</div>

					<nav className="flex items-center gap-2 sm:gap-4">
						<Link
							href="#sistema"
							className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline"
						>
							O sistema
						</Link>
						<Link
							href="#modulos"
							className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
						>
							Módulos
						</Link>
						<Link
							href="#demonstracao"
							className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
						>
							Demonstração
						</Link>
						<Button asChild variant="outline" size="sm">
							<Link href="/entrar">Entrar</Link>
						</Button>
						<Button asChild size="sm">
							<Link href="#demonstracao">Solicitar demonstração</Link>
						</Button>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				<section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
					<div className="container mx-auto px-4">
						<div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
							<Badge
								variant="secondary"
								className="mb-4 animate-fade-in-up"
								style={{ animationDelay: "0.1s" }}
							>
								Sistema de gestão para o seu negócio
							</Badge>
							<h1
								className="mb-6 animate-fade-in-up text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
								style={{ animationDelay: "0.2s" }}
							>
								Venda, emita notas e controle o caixa{" "}
								<span className="text-primary">em um só lugar</span>
							</h1>
							<p
								className="mb-8 animate-fade-in-up text-lg text-muted-foreground sm:text-xl"
								style={{ animationDelay: "0.3s" }}
							>
								O Mais Gestão organiza o dia a dia da loja: venda, estoque e
								caixa. Se o seu negócio precisa, você liga os módulos de
								Gourmet, emissão de notas ou ordens de serviço.
							</p>
							<div
								className="flex animate-fade-in-up flex-col items-center justify-center gap-4 sm:flex-row"
								style={{ animationDelay: "0.4s" }}
							>
								<Button asChild size="lg" className="w-full sm:w-auto">
									<Link href="#demonstracao">Solicitar demonstração</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									size="lg"
									className="w-full sm:w-auto"
								>
									<Link href="#modulos">Ver os módulos</Link>
								</Button>
							</div>
						</div>
					</div>
					<div className="absolute inset-0 -z-10 bg-grid-pattern opacity-5" />
				</section>

				<section id="sistema" className="py-20 md:py-32">
					<div className="container mx-auto px-4">
						<div className="mx-auto mb-16 max-w-3xl text-center">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								Um sistema para o dia a dia da{" "}
								<span className="text-primary">sua empresa</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Você atende o cliente, baixa o estoque e registra o pagamento no
								mesmo lugar. Os módulos entram só se o seu negócio precisar:
								restaurante, notas fiscais ou oficina.
							</p>
						</div>
						<div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
							{pilares.map((pilar, index) => (
								<Card
									key={pilar.title}
									className="animate-fade-in-up"
									style={{ animationDelay: `${0.1 * index}s` }}
								>
									<CardHeader>
										<CardTitle>{pilar.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription className="text-base">
											{pilar.description}
										</CardDescription>
									</CardContent>
								</Card>
							))}
						</div>
						<div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-2">
							{[
								"Caixa e vendas",
								"Estoque",
								"Financeiro",
								"Módulo Gourmet",
								"Módulo de notas",
								"Módulo de OS",
							].map((item) => (
								<Badge key={item} variant="secondary">
									{item}
								</Badge>
							))}
						</div>
					</div>
				</section>

				<section id="modulos" className="border-t bg-muted/30 py-20 md:py-32">
					<div className="container mx-auto px-4">
						<div className="mx-auto mb-16 max-w-2xl text-center">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								Módulos para o{" "}
								<span className="text-primary">seu tipo de negócio</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								O sistema já cuida de venda, estoque e financeiro. Os módulos
								abaixo entram só se você precisar — restaurante, notas fiscais
								ou oficina.
							</p>
						</div>
						<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
							{modulos.map((modulo, index) => {
								const Icon = modulo.icon;
								return (
									<Card
										key={modulo.title}
										className="group animate-fade-in-up transition-all duration-300 hover:scale-105 hover:shadow-lg"
										style={{ animationDelay: `${0.1 * index}s` }}
									>
										<CardHeader>
											<div className="mb-4 flex items-center justify-between gap-3">
												<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
													<Icon className="h-6 w-6" aria-hidden="true" />
												</div>
												<Badge variant="secondary">Módulo</Badge>
											</div>
											<CardTitle>{modulo.title}</CardTitle>
											<p className="text-sm font-medium text-primary">
												{modulo.paraQuem}
											</p>
										</CardHeader>
										<CardContent>
											<CardDescription className="text-base">
												{modulo.description}
											</CardDescription>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>
				</section>

				<section id="features" className="border-t py-20 md:py-32">
					<div className="container mx-auto px-4">
						<div className="mx-auto mb-16 max-w-2xl text-center">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								O que já vem no <span className="text-primary">sistema</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Para o dia a dia da loja, com ou sem os módulos. Tudo no mesmo
								lugar, sem passar informação de um programa para outro.
							</p>
						</div>
						<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
							{capacidadesBase.map((feature, index) => {
								const Icon = feature.icon;
								return (
									<Card
										key={feature.title}
										className="group animate-fade-in-up transition-all duration-300 hover:scale-105 hover:shadow-lg"
										style={{ animationDelay: `${0.1 * index}s` }}
									>
										<CardHeader>
											<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
												<Icon className="h-6 w-6" aria-hidden="true" />
											</div>
											<CardTitle>{feature.title}</CardTitle>
										</CardHeader>
										<CardContent>
											<CardDescription className="text-base">
												{feature.description}
											</CardDescription>
										</CardContent>
									</Card>
								);
							})}
						</div>
						<div className="mx-auto mt-12 flex max-w-xl items-start gap-3 rounded-lg border bg-muted/30 p-4">
							<IconShield
								className="mt-0.5 h-5 w-5 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<p className="text-sm text-muted-foreground">
								Cada empresa fica separada, e cada pessoa da equipe vê só o que
								precisa. Você acessa pelo navegador, de qualquer computador.
							</p>
						</div>
					</div>
				</section>

				{/*
				<section className="border-t bg-background py-12 md:py-16">
					<div className="container px-4 mx-auto">
						<div className="mx-auto max-w-2xl text-center mb-12">
							<h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
								Empresas que confiam no{" "}
								<span className="text-primary">Mais Gestão</span>
							</h2>
							<p className="text-muted-foreground">
								Centenas de empresas já utilizam nossa plataforma para gerenciar
								suas finanças
							</p>
						</div>
						<div className="logo-slider-container">
							<div className="logo-slider">
								{[...clients, ...clients].map((client, index) => (
									<div
										key={`${client.name}-${index.toString()}`}
										className="flex shrink-0 items-center justify-center"
									>
										<div className="flex h-20 w-32 items-center justify-center rounded-lg border bg-card px-4 transition-all duration-300 hover:scale-105 hover:shadow-md md:h-24 md:w-40">
											<div className="flex flex-col items-center gap-1">
												<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold md:h-12 md:w-12">
													{client.initials}
												</div>
												<span className="text-xs font-medium text-muted-foreground text-center md:text-sm">
													{client.name}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
				*/}

				<section
					id="demonstracao"
					className="border-t bg-background py-20 md:py-32"
				>
					<div className="container mx-auto px-4">
						<div className="mx-auto mb-16 max-w-2xl text-center">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								Quer conhecer?{" "}
								<span className="text-primary">Peça uma demonstração</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Não é um pacote único. Primeiro entendemos o seu negócio,
								mostramos o sistema e os módulos que fazem sentido, e só então
								montamos uma proposta.
							</p>
						</div>
						<div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-2">
							<ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
								{etapasContratacao.map((etapa) => (
									<li key={etapa.passo}>
										<Card>
											<CardHeader className="flex flex-row items-start gap-4 space-y-0">
												<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
													{etapa.passo}
												</span>
												<div>
													<CardTitle className="text-lg">
														{etapa.title}
													</CardTitle>
													<CardDescription className="mt-1 text-base">
														{etapa.description}
													</CardDescription>
												</div>
											</CardHeader>
										</Card>
									</li>
								))}
							</ol>
							<Card className="border-primary/40 shadow-lg">
								<CardHeader>
									<CardTitle className="text-2xl">
										Solicitar demonstração
									</CardTitle>
									<CardDescription className="text-base">
										Preencha seus dados. Abrimos o WhatsApp com a mensagem
										pronta para conversar com a nossa equipe.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<SolicitacaoDemonstracaoForm />
								</CardContent>
							</Card>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t bg-muted/30">
				<div className="container mx-auto max-w-6xl px-4 py-12">
					<div className="grid gap-8 md:grid-cols-4">
						<div className="md:col-span-2">
							<div className="mb-4 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
									MG
								</div>
								<span className="text-xl font-bold">Mais Gestão</span>
							</div>
							<p className="mb-4 text-sm text-muted-foreground">
								Sistema de gestão para lojas, com módulos de Gourmet, emissão de
								notas e ordens de serviço conforme o seu negócio.
							</p>
							<div className="flex gap-4">
								<Button
									variant="ghost"
									size="icon"
									asChild
									className="h-9 w-9"
									aria-label="Facebook"
								>
									<Link
										href="https://facebook.com"
										target="_blank"
										rel="noopener noreferrer"
									>
										<IconBrandFacebook className="h-5 w-5" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className="h-9 w-9"
									aria-label="Instagram"
								>
									<Link
										href="https://instagram.com"
										target="_blank"
										rel="noopener noreferrer"
									>
										<IconBrandInstagram className="h-5 w-5" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className="h-9 w-9"
									aria-label="LinkedIn"
								>
									<Link
										href="https://linkedin.com"
										target="_blank"
										rel="noopener noreferrer"
									>
										<IconBrandLinkedin className="h-5 w-5" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className="h-9 w-9"
									aria-label="Twitter"
								>
									<Link
										href="https://twitter.com"
										target="_blank"
										rel="noopener noreferrer"
									>
										<IconBrandTwitter className="h-5 w-5" />
									</Link>
								</Button>
							</div>
						</div>
						<div>
							<h3 className="mb-4 font-semibold">Produto</h3>
							<ul className="space-y-2 text-sm">
								<li>
									<Link
										href="#sistema"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										O sistema
									</Link>
								</li>
								<li>
									<Link
										href="#modulos"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Módulos
									</Link>
								</li>
								<li>
									<Link
										href="#demonstracao"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Solicitar demonstração
									</Link>
								</li>
								<li>
									<Link
										href="/entrar"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Entrar
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="mb-4 font-semibold">Institucional</h3>
							<ul className="space-y-2 text-sm">
								<li>
									<Link
										href="/termos-de-servico"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Termos de Serviço
									</Link>
								</li>
								<li>
									<Link
										href="/politica-de-privacidade"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Política de Privacidade
									</Link>
								</li>
								<li>
									<a
										href={`mailto:${LEGAL_CONTACT.email}`}
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										{LEGAL_CONTACT.email}
									</a>
								</li>
								<li>
									<a
										href={`tel:+${LEGAL_CONTACT.whatsapp}`}
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										{LEGAL_CONTACT.telefone}
									</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
						<p>
							© {new Date().getFullYear()} Mais Gestão. Todos os direitos
							reservados.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
