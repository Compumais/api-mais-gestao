import 'package:flutter/material.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_logo.dart';

class MgBootScreen extends StatelessWidget {
  const MgBootScreen({super.key, this.erro, this.onRetry});

  final Object? erro;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MgColors.surface,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const MgLogo(height: 48),
                const SizedBox(height: 28),
                if (erro == null) ...[
                  const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: MgColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Carregando…',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: MgColors.mutedForeground,
                        ),
                  ),
                ] else ...[
                  const Icon(Icons.error_outline, size: 40, color: MgColors.danger),
                  const SizedBox(height: 12),
                  Text(
                    'Falha ao iniciar',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$erro',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: MgColors.mutedForeground),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: onRetry,
                    child: const Text('Tentar de novo'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
