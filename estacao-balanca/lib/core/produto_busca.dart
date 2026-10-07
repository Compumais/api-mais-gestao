import 'package:estacao_balanca/core/models.dart';

const _comAcento = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const _semAcento = 'aaaaaeeeeiiiiooooouuuucn';

/// Minúsculas e sem acentos, para a busca não depender de digitar `ã`, `ç`...
String normalizarTextoBusca(String texto) {
  final minusculo = texto.trim().toLowerCase();
  final saida = StringBuffer();
  for (final c in minusculo.split('')) {
    final i = _comAcento.indexOf(c);
    saida.write(i >= 0 ? _semAcento[i] : c);
  }
  return saida.toString();
}

/// Filtra o catálogo por nome, EAN ou código (todos os termos precisam bater
/// no nome; EAN e código batem por trecho). Mantém a ordem recebida.
List<ProdutoLan> filtrarProdutos(List<ProdutoLan> produtos, String consulta) {
  final termos = normalizarTextoBusca(consulta)
      .split(RegExp(r'\s+'))
      .where((t) => t.isNotEmpty)
      .toList();
  if (termos.isEmpty) return produtos;
  return produtos.where((p) {
    final nome = normalizarTextoBusca(p.descricao);
    final ean = (p.ean ?? '').toLowerCase();
    final codigo = '${p.codigo ?? ''}';
    return termos.every(
      (t) => nome.contains(t) || ean.contains(t) || codigo.contains(t),
    );
  }).toList();
}

/// Lê uma quantidade digitada (`1,5`, `1.5`, `1.250,5`). `null` se inválida ou
/// não positiva.
double? lerQuantidade(String valor) {
  var limpo = valor.replaceAll(RegExp(r'\s'), '');
  if (limpo.isEmpty) return null;
  final virgula = limpo.lastIndexOf(',');
  final ponto = limpo.lastIndexOf('.');
  if (virgula >= 0 && ponto >= 0) {
    limpo = virgula > ponto
        ? limpo.replaceAll('.', '').replaceAll(',', '.')
        : limpo.replaceAll(',', '');
  } else if (virgula >= 0) {
    limpo = limpo.replaceAll(',', '.');
  }
  if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(limpo)) return null;
  final n = double.tryParse(limpo);
  return n != null && n > 0 ? n : null;
}

/// Preço no formato brasileiro (`R$ 12,50`), com `/kg` quando vendido por peso.
String formatarPrecoProduto(ProdutoLan p) {
  final valor = 'R\$ ${p.preco.toStringAsFixed(2).replaceAll('.', ',')}';
  return p.vendidoPorKg ? '$valor/kg' : valor;
}
