from pathlib import Path
from collections import Counter

sintegra = Path(r"c:\Users\Gomes\Downloads\sintegra-56259933000152-2026-09-01-2026-09-16.txt")
xml_dir = Path(r"c:\Users\Gomes\Downloads\xmls-fiscais-56259933000152-2026-09-01-2026-09-30")

text = sintegra.read_text(encoding="latin-1", errors="replace")
lines = [ln for ln in text.splitlines() if ln.strip()]
print(f"total_linhas={len(lines)}")
print(f"tamanho={sintegra.stat().st_size}")

types = Counter(ln[:2] for ln in lines)
print("tipos:", dict(sorted(types.items())))

print("\n=== AMOSTRA REG 10/11 ===")
for ln in lines[:2]:
    print(repr(ln))
    print("len=", len(ln))

print("\n=== AMOSTRA REG 50 (3) ===")
for ln in [l for l in lines if l.startswith("50")][:3]:
    print(repr(ln))
    print("len=", len(ln), "cnpj_pos2_16=", repr(ln[2:16]))

print("\n=== AMOSTRA REG 61 (todas ou 10) ===")
regs61 = [l for l in lines if l.startswith("61")]
print(f"qtd_61={len(regs61)}")
for ln in regs61[:10]:
    print(repr(ln))
    print("len=", len(ln))
    # layout 61 approx: tipo2 + brancos14 + brancos14 + data8 + modelo2 + serie3 + subserie2 + numini6 + numfim6 + ...
    print("  data=", ln[30:38] if len(ln)>38 else "?", "modelo=", ln[38:40] if len(ln)>40 else "?", "serie=", repr(ln[40:43]) if len(ln)>43 else "?")
    print("  numini=", ln[45:51] if len(ln)>51 else "?", "numfim=", ln[51:57] if len(ln)>57 else "?")
    print("  vtotal=", ln[57:70] if len(ln)>70 else "?", "base=", ln[70:83] if len(ln)>83 else "?", "icms=", ln[83:95] if len(ln)>95 else "?")

print("\n=== REG 90 ===")
for ln in [l for l in lines if l.startswith("90")]:
    print(repr(ln))

print("\n=== XML FOLDER ===")
if not xml_dir.exists():
    print("nao existe")
else:
    items = list(xml_dir.iterdir())
    print("itens_raiz=", len(items))
    for it in items[:20]:
        print(it.name, "dir" if it.is_dir() else "file", it.stat().st_size if it.is_file() else "")
    xmls = list(xml_dir.rglob("*.xml"))
    print("total_xml=", len(xmls))
    for x in xmls[:5]:
        print(" sample:", x.name, x.stat().st_size)
