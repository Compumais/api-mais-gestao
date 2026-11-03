import 'dart:convert';

const int resultadoOkAndroid = -1;

class RetornoTef {
  const RetornoTef({
    required this.aprovado,
    this.mensagem,
    this.nsu,
    this.autorizacao,
    this.bandeira,
    this.viaCliente,
    this.tipoCartao,
  });

  final bool aprovado;
  final String? mensagem;
  final String? nsu;
  final String? autorizacao;
  final String? bandeira;
  final String? viaCliente;
  final String? tipoCartao;
}

Map<String, String> extrasTransacao({
  required String funcao,
  required String valor,
}) {
  final extras = <String, String>{
    'funcao': funcao,
    'valor': valor,
  };
  if (funcao == 'credito') {
    extras['parcelas'] = '1';
    extras['financiamento'] = '1';
  }
  return extras;
}

Map<String, String> extrasConfigurar() {
  return const {
    'funcao': 'configurar',
    'nome': 'POSselfpay',
    'versao': '1.0.0',
    'textoPinpad': 'POSselfpay',
  };
}

Map<String, String> extrasAtivar(String cnpjCpf) {
  return {
    'funcao': 'ativar',
    'cnpjCpf': cnpjCpf.trim(),
  };
}

RetornoTef interpretarRetorno({
  required int resultCode,
  required Map<String, String?> extras,
  bool exigeNsu = true,
}) {
  final campos = reunirCampos(extras);
  final mensagem = textoCampo(campos, const ['mensagem']);
  if (resultCode != resultadoOkAndroid) {
    return RetornoTef(
      aprovado: false,
      mensagem: mensagem ?? 'Pagamento cancelado.',
    );
  }
  final nsu = textoCampo(campos, const ['nsu', 'NSU_SITEF', 'NSU_HOST']);
  if (exigeNsu && nsu == null) {
    return RetornoTef(
      aprovado: false,
      mensagem: mensagem ?? 'O TEF não devolveu o NSU.',
    );
  }
  return RetornoTef(
    aprovado: true,
    mensagem: mensagem,
    nsu: nsu,
    autorizacao: textoCampo(campos, const ['autorizacao', 'COD_AUTORIZACAO']),
    bandeira: textoCampo(campos, const ['administradora', 'BANDEIRA', 'bandeira']),
    viaCliente: textoCampo(campos, const ['viaCliente', 'VIA_CLIENTE']),
    tipoCartao: textoCampo(campos, const ['tipoCartao']),
  );
}

Map<String, dynamic> reunirCampos(Map<String, String?> extras) {
  final campos = <String, dynamic>{};
  for (final entrada in extras.entries) {
    final valor = entrada.value?.trim();
    if (valor == null || valor.isEmpty) {
      continue;
    }
    final json = _jsonObjeto(valor);
    if (json != null) {
      campos.addAll(json);
    } else {
      campos[entrada.key] = valor;
    }
  }
  final resultado = campos['resultado'];
  if (resultado is String) {
    final json = _jsonObjeto(resultado);
    if (json != null) {
      campos['resultado'] = json;
    }
  }
  return campos;
}

String? textoCampo(Map<String, dynamic> campos, List<String> chaves) {
  for (final chave in chaves) {
    final direto = _texto(campos[chave]);
    if (direto != null) {
      return direto;
    }
    final resultado = campos['resultado'];
    if (resultado is Map) {
      final aninhado = _texto(resultado[chave]);
      if (aninhado != null) {
        return aninhado;
      }
    }
  }
  return null;
}

Map<String, dynamic>? _jsonObjeto(String texto) {
  if (!texto.startsWith('{')) {
    return null;
  }
  try {
    final decoded = jsonDecode(texto);
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
  } catch (_) {
    return null;
  }
  return null;
}

String? _texto(Object? valor) {
  final texto = valor?.toString().trim() ?? '';
  if (texto.isEmpty || texto == 'null') {
    return null;
  }
  return texto;
}
