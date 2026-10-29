import 'package:flutter/material.dart';

enum MgLogoVariant { colorido, branco }

class MgLogo extends StatelessWidget {
  const MgLogo({
    super.key,
    this.variant = MgLogoVariant.colorido,
    this.height = 40,
  });

  final MgLogoVariant variant;
  final double height;

  @override
  Widget build(BuildContext context) {
    final asset = variant == MgLogoVariant.branco
        ? 'assets/brand/mais-gestao-branco.png'
        : 'assets/brand/mais-gestao-colorido.png';
    return Image.asset(
      asset,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      errorBuilder: (_, __, ___) => Text(
        'Mais Gestão',
        style: TextStyle(
          fontSize: height * 0.55,
          fontWeight: FontWeight.w700,
          color: variant == MgLogoVariant.branco
              ? Colors.white
              : const Color(0xFF4271F0),
          letterSpacing: -0.5,
        ),
      ),
    );
  }
}
