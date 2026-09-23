class ProdutoLan {
  const ProdutoLan({
    required this.id,
    required this.descricao,
    required this.preco,
    this.unidademedida,
    this.idunidademedida,
    this.ean,
    this.codigo,
    this.caminhoimagem,
  });

  final String id;
  final String descricao;
  final double preco;
  final String? unidademedida;
  final String? idunidademedida;
  final String? ean;
  final int? codigo;
  final String? caminhoimagem;

  factory ProdutoLan.fromJson(Map<String, dynamic> json) {
    return ProdutoLan(
      id: '${json['id'] ?? ''}',
      descricao: '${json['descricao'] ?? ''}',
      preco: (json['preco'] as num?)?.toDouble() ?? 0,
      unidademedida: json['unidademedida']?.toString(),
      idunidademedida: json['idunidademedida']?.toString(),
      ean: json['ean']?.toString(),
      codigo: json['codigo'] is num ? (json['codigo'] as num).toInt() : null,
      caminhoimagem: json['caminhoimagem']?.toString(),
    );
  }

  bool get vendidoPorKg {
    final u = (unidademedida ?? '').toUpperCase().trim();
    if (u.isEmpty) return false;
    return u == 'KG' ||
        u == 'K' ||
        u == 'KG.' ||
        u.contains('KG') ||
        u.contains('QUILO') ||
        u.contains('KILO');
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'descricao': descricao,
        'preco': preco,
        'unidademedida': unidademedida,
        'idunidademedida': idunidademedida,
        'ean': ean,
        'codigo': codigo,
        'caminhoimagem': caminhoimagem,
      };
}

class ContaLan {
  const ContaLan({
    required this.id,
    required this.numero,
    this.nomecliente,
  });

  final String id;
  final int numero;
  final String? nomecliente;

  factory ContaLan.fromJson(Map<String, dynamic> json) {
    return ContaLan(
      id: '${json['id'] ?? ''}',
      numero: (json['numero_mesa'] as num?)?.toInt() ??
          (json['numero'] as num?)?.toInt() ??
          (json['numeromesa'] as num?)?.toInt() ??
          0,
      nomecliente: json['nomecliente']?.toString(),
    );
  }
}

class EmpresaLan {
  const EmpresaLan({required this.id, required this.nome});

  final String id;
  final String nome;

  factory EmpresaLan.fromJson(Map<String, dynamic> json) {
    return EmpresaLan(
      id: '${json['id'] ?? json['idempresa'] ?? ''}',
      nome: '${json['nome'] ?? json['nomeempresa'] ?? ''}',
    );
  }
}

class PesoPdv {
  const PesoPdv({
    required this.peso,
    required this.conectado,
    this.mensagem,
  });

  final double peso;
  final bool conectado;
  final String? mensagem;

  factory PesoPdv.fromJson(Map<String, dynamic> json) {
    return PesoPdv(
      peso: (json['peso'] as num?)?.toDouble() ?? 0,
      conectado: json['conectado'] == true,
      mensagem: json['mensagem']?.toString(),
    );
  }
}

class LanException implements Exception {
  LanException(this.message, {this.statusCode = 0});

  final String message;
  final int statusCode;

  @override
  String toString() => message;
}
