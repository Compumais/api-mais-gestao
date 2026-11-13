# Estratégias de Serialização

A comunicação com o Ambiente Nacional e Prefeituras muitas vezes exige formatos específicos (XML com envelopes SOAP, JSON REST, etc).

## Abordagem

O pacote utiliza o padrão **Serializer** para transformar os DTOs em strings formatadas.

### XML (Padrão Nacional)

O XML deve seguir estritamente o XSD. Utilizamos anotações nos DTOs para controlar a geração das tags.

```php
// Exemplo conceitual
#[XmlRoot('DPS')]
class Dps {
    #[XmlElement('infDPS')]
    public $info;
}
```

### JSON

Para APIs REST (futuro ou integrações internas), oferecemos suporte nativo a `json_encode` via interface `JsonSerializable`.
