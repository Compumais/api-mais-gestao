import { IconArrowLeft, IconArrowRight, IconClock } from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CategoryPageProps {
    params: {
        slug: string;
    };
}

const categories = {
    "primeiros-passos": {
        title: "Primeiros Passos",
        description:
            "Aprenda a configurar sua conta e começar a usar o Mais Gestão",
        articles: [
            {
                id: "1",
                title: "Bem-vindo ao Mais Gestão",
                description: "Conheça os recursos principais do sistema",
                readTime: "5 min",
            },
            {
                id: "2",
                title: "Configurando sua empresa",
                description: "Como cadastrar e configurar os dados da sua empresa",
                readTime: "4 min",
            },
            {
                id: "3",
                title: "Navegando pelo sistema",
                description: "Entenda a interface e os menus principais",
                readTime: "3 min",
            },
        ],
    },
    "contas-pagar": {
        title: "Contas a Pagar",
        description: "Gerencie suas despesas e pagamentos de forma eficiente",
        articles: [
            {
                id: "1",
                title: "Como criar uma conta a pagar",
                description: "Passo a passo para cadastrar uma nova despesa",
                readTime: "3 min",
            },
            {
                id: "2",
                title: "Gerenciando vencimentos",
                description: "Como acompanhar e organizar datas de pagamento",
                readTime: "4 min",
            },
            {
                id: "3",
                title: "Baixando contas pagas",
                description: "Como registrar o pagamento de uma conta",
                readTime: "2 min",
            },
        ],
    },
    // Adicione mais categorias conforme necessário
};

export async function generateMetadata({
    params,
}: CategoryPageProps): Promise<Metadata> {
    const category = categories[params.slug as keyof typeof categories];

    if (!category) {
        return {
            title: "Categoria não encontrada",
        };
    }

    return {
        title: `${category.title} - Central de Ajuda | Mais Gestão`,
        description: category.description,
    };
}

export default function CategoryPage({ params }: CategoryPageProps) {
    const category = categories[params.slug as keyof typeof categories];

    if (!category) {
        notFound();
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/ajuda" className="hover:text-foreground">
                    Central de Ajuda
                </Link>
                <IconArrowRight className="size-4" />
                <span className="text-foreground">{category.title}</span>
            </nav>

            {/* Header */}
            <div className="mb-12">
                <h1 className="mb-3 text-4xl font-bold">{category.title}</h1>
                <p className="text-lg text-muted-foreground">{category.description}</p>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
                {category.articles.map((article) => (
                    <Link
                        key={article.id}
                        href={`/ajuda/artigo/${params.slug}-${article.id}`}
                        className="group block rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="mb-2 text-xl font-semibold group-hover:text-primary">
                                    {article.title}
                                </h2>
                                <p className="text-muted-foreground">{article.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <IconClock className="size-4" />
                                {article.readTime}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Back Link */}
            <div className="mt-12">
                <Link
                    href="/ajuda"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <IconArrowLeft className="size-4" />
                    Voltar para Central de Ajuda
                </Link>
            </div>
        </div>
    );
}
