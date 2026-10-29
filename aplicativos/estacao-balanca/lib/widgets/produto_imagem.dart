import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';

class ProdutoImagem extends StatelessWidget {
  const ProdutoImagem({
    super.key,
    required this.client,
    required this.produto,
    this.fit = BoxFit.cover,
  });

  final LanClient client;
  final ProdutoLan produto;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final url = client.urlImagemProduto(produto);
    if (url == null) {
      return const ColoredBox(
        color: MgColors.accent,
        child: Center(
          child: Icon(Icons.inventory_2_outlined, color: MgColors.primary, size: 40),
        ),
      );
    }
    return Image.network(
      url,
      fit: fit,
      headers: client.authHeaders(),
      errorBuilder: (_, __, ___) => const ColoredBox(
        color: MgColors.accent,
        child: Center(
          child: Icon(Icons.broken_image_outlined, color: MgColors.mutedForeground),
        ),
      ),
    );
  }
}
