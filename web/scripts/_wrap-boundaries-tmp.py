from pathlib import Path

base = Path(r"c:/Code/mais-gestao/web/src/app")
auth = next(p for p in base.iterdir() if p.name == "(auth)")


def write(path: Path, text: str) -> None:
	tmp = path.with_suffix(path.suffix + ".tmp")
	tmp.write_text(text, encoding="utf-8")
	tmp.replace(path)


def ensure_import(text: str) -> str:
	if "bloco-error-boundary" in text:
		return text
	needle = 'import { toast } from "sonner";\n'
	if needle not in text:
		raise SystemExit("toast import not found")
	return text.replace(
		needle,
		needle
		+ "import {\n"
		+ "\tBlocoErrorBoundary,\n"
		+ "\tBlocoErrorBoundarySlot,\n"
		+ '} from "@/components/bloco-error-boundary";\n',
		1,
	)


# --- pedido-editor ---
path = auth / "pedidos" / "components" / "pedido-editor.tsx"
text = ensure_import(path.read_text(encoding="utf-8"))

start = "\t\t\t\t<FieldGroup>\n\t\t\t\t\t<FieldSet>\n\t\t\t\t\t\t<FieldLegend>Dados do pedido</FieldLegend>"
if start not in text:
	raise SystemExit("pedido start not found")
text = text.replace(
	start,
	"\t\t\t\t<BlocoErrorBoundary\n"
	'\t\t\t\t\ttitulo="Erro no formulário do pedido"\n'
	'\t\t\t\t\tvariante="painel"\n'
	"\t\t\t\t>\n"
	"\t\t\t\t\t<BlocoErrorBoundarySlot\n"
	"\t\t\t\t\t\trender={() => (\n"
	"\t\t\t\t\t\t\t<>\n"
	"\t\t\t\t\t\t\t\t<FieldGroup>\n"
	"\t\t\t\t\t\t\t\t\t<FieldSet>\n"
	"\t\t\t\t\t\t\t\t\t\t<FieldLegend>Dados do pedido</FieldLegend>",
	1,
)

end = "\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<ModalItemPedido"
if end not in text:
	raise SystemExit("pedido end not found")
text = text.replace(
	end,
	"\t\t\t\t\t</div>\n"
	"\t\t\t\t</div>\n"
	"\t\t\t\t\t\t\t</>\n"
	"\t\t\t\t\t\t)}\n"
	"\t\t\t\t\t/>\n"
	"\t\t\t\t</BlocoErrorBoundary>\n"
	"\t\t\t</div>\n"
	"\n"
	"\t\t\t<ModalItemPedido",
	1,
)
write(path, text)
print("OK pedido-editor")


# --- editar NF compra ---
path = auth / "nota-fiscal-compra" / "[id]" / "editar" / "page.tsx"
text = path.read_text(encoding="utf-8")
if "bloco-error-boundary" not in text:
	text = text.replace(
		'import { PageContainer } from "@/app/(auth)/components/page-container";\n',
		'import { PageContainer } from "@/app/(auth)/components/page-container";\n'
		'import {\n'
		"\tBlocoErrorBoundary,\n"
		"\tBlocoErrorBoundarySlot,\n"
		'} from "@/components/bloco-error-boundary";\n',
		1,
	)

start = (
	'\t\t\t\t<form\n'
	'\t\t\t\t\tclassName="mx-4 flex flex-col gap-6"\n'
	'\t\t\t\t\tonSubmit={handleSubmit((dados) => salvar(dados))}\n'
	"\t\t\t\t>"
)
if start not in text:
	raise SystemExit("editar start not found")
text = text.replace(
	start,
	"\t\t\t\t<BlocoErrorBoundary\n"
	'\t\t\t\t\ttitulo="Erro no formulário de edição da NF de compra"\n'
	'\t\t\t\t\tvariante="painel"\n'
	"\t\t\t\t>\n"
	"\t\t\t\t\t<BlocoErrorBoundarySlot\n"
	"\t\t\t\t\t\trender={() => (\n"
	"\t\t\t\t\t\t\t<form\n"
	'\t\t\t\t\t\t\t\tclassName="mx-4 flex flex-col gap-6"\n'
	"\t\t\t\t\t\t\t\tonSubmit={handleSubmit((dados) => salvar(dados))}\n"
	"\t\t\t\t\t\t\t>",
	1,
)

end = "\t\t\t\t</form>\n\t\t\t</div>\n\t\t</PageContainer>"
if end not in text:
	raise SystemExit("editar end not found")
text = text.replace(
	end,
	"\t\t\t\t\t\t\t</form>\n"
	"\t\t\t\t\t\t)}\n"
	"\t\t\t\t\t/>\n"
	"\t\t\t\t</BlocoErrorBoundary>\n"
	"\t\t\t</div>\n"
	"\t\t</PageContainer>",
	1,
)
write(path, text)
print("OK editar compra")


# --- NFS-e nova page-client ---
path = auth / "nota-fiscal-servico" / "nova" / "page-client.tsx"
text = path.read_text(encoding="utf-8")
if "bloco-error-boundary" not in text:
	text = text.replace(
		'import { toast } from "sonner";\n',
		'import { toast } from "sonner";\n'
		"import {\n"
		"\tBlocoErrorBoundary,\n"
		"\tBlocoErrorBoundarySlot,\n"
		'} from "@/components/bloco-error-boundary";\n',
		1,
	)

# Wrap everything after </header> until before </main>
start = "\t\t\t\t</header>\n\n\t\t\t\t{origemId && carregandoOrigem ? ("
if start not in text:
	raise SystemExit("nfse start not found")
text = text.replace(
	start,
	"\t\t\t\t</header>\n\n"
	"\t\t\t\t<BlocoErrorBoundary\n"
	'\t\t\t\t\ttitulo="Erro no formulário da NFS-e"\n'
	'\t\t\t\t\tvariante="painel"\n'
	"\t\t\t\t>\n"
	"\t\t\t\t\t<BlocoErrorBoundarySlot\n"
	"\t\t\t\t\t\trender={() => (\n"
	"\t\t\t\t\t\t\t<>\n"
	"\t\t\t\t\t\t\t\t{origemId && carregandoOrigem ? (",
	1,
)

end = "\t\t\t\t</form>\n\t\t\t</main>\n\t\t</PageContainer>"
if end not in text:
	# show nearby
	i = text.rfind("</form>")
	print(repr(text[i : i + 80]))
	raise SystemExit("nfse end not found")
text = text.replace(
	end,
	"\t\t\t\t\t\t\t\t</form>\n"
	"\t\t\t\t\t\t\t</>\n"
	"\t\t\t\t\t\t)}\n"
	"\t\t\t\t\t/>\n"
	"\t\t\t\t</BlocoErrorBoundary>\n"
	"\t\t\t</main>\n"
	"\t\t</PageContainer>",
	1,
)
write(path, text)
print("OK nfse")
