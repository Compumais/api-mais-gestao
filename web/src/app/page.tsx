import {
	IconBrandFacebook,
	IconBrandInstagram,
	IconBrandLinkedin,
	IconBrandTwitter,
	IconChartBar,
	IconCheck,
	IconCreditCard,
	IconDashboard,
	IconLock,
	IconShield,
	IconTrendingUp,
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
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
	title: "Mais Gestão - Controle Financeiro Completo para sua Empresa",
	description:
		"Plataforma SaaS multi-empresas para gestão financeira completa. Controle contas a pagar e receber, bancos, contas correntes, relatórios e muito mais. Planos Básico e Premium disponíveis.",
	openGraph: {
		title: "Mais Gestão - Controle Financeiro Completo",
		description:
			"Plataforma SaaS multi-empresas para gestão financeira completa.",
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};

const features = [
	{
		icon: IconDashboard,
		title: "Dashboard Intuitivo",
		description:
			"Visualize todas as informações financeiras em um único lugar com gráficos e métricas em tempo real.",
	},
	{
		icon: IconCreditCard,
		title: "Gestão de Contas",
		description:
			"Controle completo de contas a pagar e receber, com lembretes automáticos e categorização inteligente.",
	},
	{
		icon: IconChartBar,
		title: "Relatórios Detalhados",
		description:
			"Gere relatórios financeiros completos com análises profundas para tomada de decisão estratégica.",
	},
	{
		icon: IconUsers,
		title: "Multi-empresas",
		description:
			"Gerencie múltiplas empresas em uma única plataforma, com controle de acesso e permissões granulares.",
	},
	{
		icon: IconTrendingUp,
		title: "Análise de Performance",
		description:
			"Acompanhe indicadores financeiros e métricas de performance para otimizar seus resultados.",
	},
	{
		icon: IconShield,
		title: "Segurança Avançada",
		description:
			"Seus dados protegidos com criptografia de ponta a ponta e backups automáticos diários.",
	},
];

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

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container h-16 mx-auto flex items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
							MG
						</div>
						<span className="text-xl font-bold">Mais Gestão</span>
					</div>

					<nav className="flex items-center gap-4">
						<Link
							href="#features"
							className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							Funcionalidades
						</Link>
						<Link
							href="#pricing"
							className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							Planos
						</Link>
						<Button asChild variant="outline" size="sm">
							<Link href="/entrar">Entrar</Link>
						</Button>
						<Button asChild size="sm">
							<Link href="/registrar">Começar grátis</Link>
						</Button>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
					<div className="container px-4 mx-auto">
						<div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
							<Badge
								variant="secondary"
								className="mb-4 animate-fade-in-up"
								style={{ animationDelay: "0.1s" }}
							>
								Plataforma SaaS Multi-empresas
							</Badge>
							<h1
								className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up"
								style={{ animationDelay: "0.2s" }}
							>
								Controle Financeiro{" "}
								<span className="text-primary">Completo</span> para sua Empresa
							</h1>
							<p
								className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl animate-fade-in-up"
								style={{ animationDelay: "0.3s" }}
							>
								Gerencie suas finanças com facilidade. Controle contas,
								relatórios, bancos e muito mais em uma única plataforma
								intuitiva e poderosa.
							</p>
							<div
								className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up"
								style={{ animationDelay: "0.4s" }}
							>
								<Button asChild size="lg" className="w-full sm:w-auto">
									<Link href="/registrar">Começar grátis</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									size="lg"
									className="w-full sm:w-auto"
								>
									<Link href="#features">Conhecer funcionalidades</Link>
								</Button>
							</div>
						</div>
					</div>
					<div className="absolute inset-0 -z-10 bg-grid-pattern opacity-5" />
				</section>

				{/* Features Section */}
				<section id="features" className="py-20 md:py-32">
					<div className="container px-4 mx-auto">
						<div className="mx-auto max-w-2xl text-center mb-16">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								Tudo que você precisa para{" "}
								<span className="text-primary">gerenciar suas finanças</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Funcionalidades poderosas projetadas para simplificar sua gestão
								financeira
							</p>
						</div>
						<div className="mx-auto max-w-6xl grid gap-8 md:grid-cols-2 lg:grid-cols-3">
							{features.map((feature, index) => {
								const Icon = feature.icon;
								return (
									<Card
										key={feature.title}
										className="group transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in-up"
										style={{ animationDelay: `${0.1 * index}s` }}
									>
										<CardHeader>
											<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
												<Icon className="h-6 w-6" />
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
					</div>
				</section>

				{/* Clients Section */}
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
								{/* Duplicar a lista para criar loop infinito */}
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

				{/* Pricing Section */}
				<section id="pricing" className="border-t bg-muted/30 py-20 md:py-32">
					<div className="container px-4 mx-auto">
						<div className="mx-auto max-w-2xl text-center mb-16">
							<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
								Planos que se adaptam ao seu{" "}
								<span className="text-primary">negócio</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Escolha o plano ideal para suas necessidades. Todos os planos
								incluem suporte e atualizações regulares.
							</p>
						</div>
						<div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
							{plans.map((plan, index) => (
								<Card
									key={plan.name}
									className={`relative flex flex-col transition-all duration-300 hover:shadow-lg ${
										plan.popular ? "border-primary shadow-lg md:scale-105" : ""
									} ${
										plan.comingSoon
											? "opacity-60 grayscale"
											: "animate-fade-in-up"
									}`}
									style={{
										animationDelay: plan.comingSoon
											? undefined
											: `${0.1 * index}s`,
									}}
								>
									{plan.popular && (
										<div className="absolute -top-4 left-1/2 -translate-x-1/2">
											<Badge variant="default">Mais Popular</Badge>
										</div>
									)}
									{plan.comingSoon && (
										<div className="absolute -top-4 right-4">
											<Badge variant="outline" className="gap-1">
												<IconLock className="h-3 w-3" />
												Em breve
											</Badge>
										</div>
									)}
									<CardHeader>
										<CardTitle className="text-2xl">{plan.name}</CardTitle>
										<CardDescription>{plan.description}</CardDescription>
										<div className="mt-4 flex items-baseline gap-1">
											<span className="text-4xl font-bold">{plan.price}</span>
											{plan.period && (
												<span className="text-muted-foreground">
													{plan.period}
												</span>
											)}
										</div>
									</CardHeader>
									<CardContent className="flex-1">
										<ul className="space-y-3">
											{plan.features.map((feature) => (
												<li key={feature} className="flex items-start gap-2">
													<IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
													<span className="text-sm">{feature}</span>
												</li>
											))}
										</ul>
									</CardContent>
									<CardFooter>
										<Button
											asChild
											variant={plan.popular ? "default" : "outline"}
											className="w-full"
											disabled={plan.comingSoon}
										>
											<Link href={plan.comingSoon ? "#" : "/registrar"}>
												{plan.cta}
											</Link>
										</Button>
									</CardFooter>
								</Card>
							))}
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="border-t py-20 md:py-32">
					<div className="container px-4 mx-auto">
						<Card className="mx-auto max-w-3xl border-primary bg-gradient-to-br from-primary/5 to-primary/10">
							<CardHeader className="text-center">
								<CardTitle className="text-3xl md:text-4xl">
									Pronto para começar?
								</CardTitle>
								<CardDescription className="text-lg">
									Junte-se a centenas de empresas que já confiam no Mais Gestão
									para gerenciar suas finanças.
								</CardDescription>
							</CardHeader>
							<CardFooter className="justify-center">
								<Button asChild size="lg">
									<Link href="/registrar">Criar conta gratuita</Link>
								</Button>
							</CardFooter>
						</Card>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t bg-muted/30">
				<div className="container px-4 py-12 mx-auto max-w-6xl">
					<div className="grid gap-8 md:grid-cols-4">
						<div className="md:col-span-2">
							<div className="mb-4 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
									MG
								</div>
								<span className="text-xl font-bold">Mais Gestão</span>
							</div>
							<p className="mb-4 text-sm text-muted-foreground">
								Plataforma SaaS multi-empresas para controle financeiro
								completo. Gerencie suas finanças com facilidade e segurança.
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
										href="#features"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Funcionalidades
									</Link>
								</li>
								<li>
									<Link
										href="#pricing"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Planos
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
										href="mailto:contato@compumais.com"
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										Contato
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
