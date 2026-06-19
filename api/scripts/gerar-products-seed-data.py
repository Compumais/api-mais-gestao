#!/usr/bin/env python3
"""Gera drizzle/seeds/products-seed.data.json a partir da planilha de produtos."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

try:
    import openpyxl
except ImportError as exc:
    raise SystemExit("Instale openpyxl: pip install openpyxl") from exc

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = Path.home() / "Downloads" / "Produtos (1).xlsx"
DEFAULT_OUTPUT = ROOT / "drizzle" / "seeds" / "products-seed.data.json"
DEFAULT_IDEMPRESA = "8519c39b-a90c-42d5-8e4f-7d9ccf60eb04"

UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.I,
)


def extract_uuid(value) -> str | None:
    if not value:
        return None
    match = UUID_RE.search(str(value).strip())
    return match.group(0).lower() if match else None


def parse_ean(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        number = int(float(value))
        if -2147483648 <= number <= 2147483647:
            return number
    except (ValueError, TypeError):
        pass
    return None


def parse_date(value) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    parts = text.split("/")
    if len(parts) != 3:
        return None
    day, month, year = parts
    return f"{year.zfill(4)}-{month.zfill(2)}-{day.zfill(2)}"


def num(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def int_or_none(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def str_or_none(value, max_len: int | None = None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len] if max_len else text


def parse_codigo(codigo_val, referencia_val) -> int | None:
    codigo = int_or_none(codigo_val)
    if codigo is not None:
        return codigo
    codigo = int_or_none(referencia_val)
    if codigo is not None:
        return codigo
    referencia = str_or_none(referencia_val)
    if referencia:
        return abs(hash(referencia)) % 2_000_000_000 + 1
    return None


def gerar(input_path: Path, output_path: Path, idempresa: str) -> None:
    workbook = openpyxl.load_workbook(input_path, read_only=True)
    worksheet = workbook.active
    rows = list(worksheet.iter_rows(values_only=True))

    produtos: list[dict] = []
    skipped: list[dict] = []

    for index, row in enumerate(rows[1:], start=2):
        nome = str_or_none(row[3], 120)
        if not nome or str(nome).startswith("Gerado em"):
            skipped.append({"linha": index, "motivo": "linha invalida"})
            continue

        codigo = parse_codigo(row[0], row[1])
        if codigo is None:
            skipped.append({"linha": index, "motivo": "codigo ausente", "nome": nome})
            continue

        idgrupo = extract_uuid(row[20])
        if not idgrupo:
            skipped.append(
                {"linha": index, "motivo": "idhierarquia invalido", "nome": nome},
            )
            continue

        ean_raw = str_or_none(row[2])
        ean = parse_ean(row[2])
        observacoes: list[str] = []
        if ean_raw and ean is None:
            observacoes.append(f"EAN: {ean_raw}")

        codigo_origem = str_or_none(row[0])
        if codigo_origem and int_or_none(codigo_origem) is None:
            observacoes.append(f"Codigo origem: {codigo_origem}")

        tributado = str_or_none(row[12])
        if tributado:
            observacoes.append(f"Tributacao: {tributado}")

        tipoproduto_raw = int_or_none(row[27])
        tipoproduto = (
            str(tipoproduto_raw).zfill(2) if tipoproduto_raw is not None else "01"
        )

        cest_raw = str_or_none(row[25])
        cest = None
        if cest_raw:
            try:
                cest = int(cest_raw)
            except ValueError:
                pass

        produtos.append(
            {
                "codigo": codigo,
                "referencia": str_or_none(row[1], 60),
                "ean": ean,
                "nome": nome,
                "unidademedida": str_or_none(row[4], 6),
                "preco": num(row[5]),
                "custoaquisicao": num(row[7]),
                "precoultimacompra": num(row[8]),
                "dataultimacompra": parse_date(row[9]),
                "customedioinicial": num(row[10]),
                "pesavel": int_or_none(row[11]) or 0,
                "ncm": str_or_none(row[13], 10) or str_or_none(row[28], 10),
                "iat": str_or_none(row[14], 1),
                "ippt": str_or_none(row[15], 1),
                "kit": int_or_none(row[16]) or 0,
                "idgrupo": idgrupo,
                "icmsentrada": num(row[22]),
                "cest": cest,
                "tipoproduto": tipoproduto,
                "observacoes": "; ".join(observacoes) if observacoes else None,
            },
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": input_path.name,
        "generatedAt": date.today().isoformat(),
        "idempresa": idempresa,
        "total": len(produtos),
        "skipped": skipped,
        "produtos": produtos,
    }
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Gerado {output_path} com {len(produtos)} produtos")
    if skipped:
        print(f"Ignorados: {len(skipped)}")


if __name__ == "__main__":
    input_file = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    idempresa = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_IDEMPRESA
    gerar(input_file, output_file, idempresa)
