from pathlib import Path
from collections import Counter

f = Path(r"c:\Users\Gomes\Downloads\sintegra-56259933000152-2026-09-01-2026-09-16 (1).txt")
print("exists", f.exists(), "size", f.stat().st_size if f.exists() else 0)
text = f.read_text(encoding="latin-1", errors="replace")
lines = [ln for ln in text.splitlines() if ln.strip()]
print("total_linhas", len(lines))
print("tipos", dict(sorted(Counter(ln[:2] for ln in lines).items())))

print("\n=== REG 10/11 ===")
for ln in lines[:2]:
    print(repr(ln), "len", len(ln))

print("\n=== REG 50 ===")
for ln in [l for l in lines if l.startswith("50")]:
    print(repr(ln))

print("\n=== REG 61 (todos) ===")
regs61 = [l for l in lines if l.startswith("61")]
print("qtd", len(regs61))
total_v = 0
total_outras = 0
for ln in regs61:
    data = ln[30:38]
    dia = f"{data[:4]}-{data[4:6]}-{data[6:8]}"
    modelo = ln[38:40]
    serie = ln[40:43]
    # layout: 61 +14 +14 +8 +2 +3 +2 +6 +6 +13 +13 +12 +13 +13 +4 +1
    # after serie(3) comes subserie(2)
    numini = int(ln[45:51])
    numfim = int(ln[51:57])
    vtotal = int(ln[57:70]) / 100
    base = int(ln[70:83]) / 100
    icms = int(ln[83:95]) / 100
    isento = int(ln[95:108]) / 100
    outras = int(ln[108:121]) / 100
    aliq = int(ln[121:125]) / 100
    total_v += vtotal
    total_outras += outras
    ok_faixa = numini <= numfim
    ok_eq = abs(vtotal - (base + isento + outras)) < 0.02
    print(f"{dia} mod={modelo} ser={serie!r} {numini}-{numfim} v={vtotal:.2f} base={base:.2f} icms={icms:.2f} isento={isento:.2f} outras={outras:.2f} aliq={aliq:.2f} faixa_ok={ok_faixa} eq_ok={ok_eq}")

print(f"\nTOTAL 61 valor={total_v:.2f} outras={total_outras:.2f}")

print("\n=== REG 90 ===")
for ln in [l for l in lines if l.startswith("90")]:
    print(repr(ln))

# compare with previous file if exists
old = Path(r"c:\Users\Gomes\Downloads\sintegra-56259933000152-2026-09-01-2026-09-16.txt")
if old.exists():
    old_lines = [ln for ln in old.read_text(encoding="latin-1").splitlines() if ln.startswith("61")]
    new_lines = regs61
    print(f"\n=== DIFF 61 vs arquivo anterior ({len(old_lines)} -> {len(new_lines)}) ===")
    def parse61(ln):
        data = ln[30:38]
        return {
            "dia": f"{data[:4]}-{data[4:6]}-{data[6:8]}",
            "ini": int(ln[45:51]),
            "fim": int(ln[51:57]),
            "v": int(ln[57:70])/100,
            "outras": int(ln[108:121])/100,
        }
    old_map = {p["dia"]: p for p in map(parse61, old_lines)}
    new_map = {p["dia"]: p for p in map(parse61, new_lines)}
    for dia in sorted(set(old_map)|set(new_map)):
        o, n = old_map.get(dia), new_map.get(dia)
        if o != n:
            print(f"{dia}: ANTES {o} -> AGORA {n}")
