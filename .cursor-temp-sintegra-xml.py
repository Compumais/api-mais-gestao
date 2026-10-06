from pathlib import Path
from collections import defaultdict
import re
import xml.etree.ElementTree as ET

xml_dir = Path(r"c:\Users\Gomes\Downloads\xmls-fiscais-56259933000152-2026-09-01-2026-09-30\nfce")
xmls = sorted(xml_dir.glob("*.xml"))
print(f"total_xml={len(xmls)}")

NS = {"": "http://www.portalfiscal.inf.br/nfe"}

def findtext(el, path):
    # try with and without ns
    n = el.find(path)
    if n is not None and n.text:
        return n.text
    # strip ns in path by searching recursively by localname
    parts = [p for p in path.split("/") if p]
    cur = el
    for p in parts:
        nxt = None
        for ch in cur:
            tag = ch.tag.split("}")[-1] if "}" in ch.tag else ch.tag
            if tag == p:
                nxt = ch
                break
        if nxt is None:
            return None
        cur = nxt
    return cur.text

by_day = defaultdict(list)
sem_dest = 0
com_dest = 0
modelos = Counter = defaultdict(int)
icms_samples = []
csosn_set = set()
tot_vnf = 0.0
tot_vbc = 0.0
tot_vicms = 0.0
cancelados = 0
sem_prot = 0

for i, path in enumerate(xmls):
    raw = path.read_text(encoding="utf-8", errors="replace")
    # quick cancel check
    if "nfeCancelamento" in raw or "<cStat>101</cStat>" in raw or "eventoCanc" in path.name.lower():
        cancelados += 1
    try:
        root = ET.fromstring(raw)
    except Exception as e:
        print("parse_fail", path.name, e)
        continue

    # find infNFe
    inf = None
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag == "infNFe":
            inf = el
            break
    if inf is None:
        # maybe only procEvento
        continue

    ide = None
    dest = None
    total = None
    for ch in inf:
        t = ch.tag.split("}")[-1]
        if t == "ide": ide = ch
        elif t == "dest": dest = ch
        elif t == "total": total = ch

    def child(parent, name):
        if parent is None: return None
        for ch in parent:
            if ch.tag.split("}")[-1] == name:
                return ch
        return None

    def text(parent, name):
        c = child(parent, name)
        return c.text if c is not None else None

    dhEmi = text(ide, "dhEmi") or text(ide, "dEmi") or ""
    dia = dhEmi[:10]
    modelo = text(ide, "mod")
    serie = text(ide, "serie")
    nNF = text(ide, "nNF")
    modelos[modelo or "?"] += 1

    # dest doc
    doc = None
    if dest is not None:
        for name in ("CNPJ", "CPF", "idEstrangeiro"):
            t = text(dest, name)
            if t:
                doc = t
                break
    if doc:
        com_dest += 1
    else:
        sem_dest += 1

    # ICMS totals
    ICMSTot = None
    if total is not None:
        ICMSTot = child(total, "ICMSTot")
    vNF = float(text(ICMSTot, "vNF") or 0)
    vBC = float(text(ICMSTot, "vBC") or 0)
    vICMS = float(text(ICMSTot, "vICMS") or 0)
    tot_vnf += vNF
    tot_vbc += vBC
    tot_vicms += vICMS

    # CSOSN from first item
    for el in inf.iter():
        if el.tag.split("}")[-1] == "CSOSN" and el.text:
            csosn_set.add(el.text)
        if el.tag.split("}")[-1] == "CST" and el.text:
            csosn_set.add("CST:"+el.text)

    by_day[dia].append({
        "nNF": int(nNF or 0),
        "serie": serie,
        "vNF": vNF,
        "vBC": vBC,
        "vICMS": vICMS,
        "doc": doc,
        "file": path.name,
    })

print(f"com_dest={com_dest} sem_dest={sem_dest}")
print(f"modelos={dict(modelos)}")
print(f"csosn/cst={sorted(csosn_set)}")
print(f"tot_vNF={tot_vnf:.2f} tot_vBC={tot_vbc:.2f} tot_vICMS={tot_vicms:.2f}")

print("\n=== POR DIA (XML) ===")
for dia in sorted(by_day):
    nums = sorted(x["nNF"] for x in by_day[dia])
    v = sum(x["vNF"] for x in by_day[dia])
    vbc = sum(x["vBC"] for x in by_day[dia])
    vicms = sum(x["vICMS"] for x in by_day[dia])
    print(f"{dia}: qtd={len(nums)} min={nums[0]} max={nums[-1]} gaps={nums[-1]-nums[0]+1-len(nums)} vNF={v:.2f} vBC={vbc:.2f} vICMS={vicms:.2f}")
    # check continuity
    missing = [n for n in range(nums[0], nums[-1]+1) if n not in set(nums)]
    if missing[:10]:
        print(f"  missing sample: {missing[:15]} ... total_missing={len(missing)}")

# Compare with SINTEGRA 61
print("\n=== SINTEGRA 61 vs XML ===")
sintegra = Path(r"c:\Users\Gomes\Downloads\sintegra-56259933000152-2026-09-01-2026-09-16.txt").read_text(encoding="latin-1")
for ln in sintegra.splitlines():
    if not ln.startswith("61"):
        continue
    data = ln[30:38]
    dia = f"{data[:4]}-{data[4:6]}-{data[6:8]}"
    numini = int(ln[45:51])
    numfim = int(ln[51:57])
    vtotal = int(ln[57:70]) / 100
    base = int(ln[70:83]) / 100
    icms = int(ln[83:95]) / 100
    xmls_day = by_day.get(dia, [])
    if not xmls_day:
        print(f"{dia}: SINTEGRA sem XML correspondente ini={numini} fim={numfim} v={vtotal}")
        continue
    nums = [x["nNF"] for x in xmls_day]
    xv = sum(x["vNF"] for x in xmls_day)
    print(f"{dia}: S61 ini={numini} fim={numfim} v={vtotal:.2f} base={base:.2f} | XML qtd={len(nums)} min={min(nums)} max={max(nums)} v={xv:.2f} | ini>fim={numini>numfim} v_diff={abs(vtotal-xv):.2f}")
