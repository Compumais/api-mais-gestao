<?php

namespace Nfse\Tests\Unit\Http\Client;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Nfse\Enums\TipoAmbiente;
use Nfse\Http\Client\SefinClient;
use Nfse\Http\Exceptions\NfseApiException;
use Nfse\Http\NfseContext;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class SefinClientRegistrarInvalidJsonTest extends TestCase
{
    private function createClientWithMock(array $responses): SefinClient
    {
        $mock = new MockHandler($responses);
        $handlerStack = HandlerStack::create($mock);
        $httpClient = new Client(['handler' => $handlerStack]);

        $context = new NfseContext(
            TipoAmbiente::Homologacao,
            'fake/path.pfx',
            'password'
        );

        $client = new SefinClient($context);

        $reflection = new ReflectionClass($client);
        $property = $reflection->getProperty('httpClient');

        $property->setValue($client, $httpClient);

        return $client;
    }

    public function test_registrar_evento_with_invalid_json_throws_response_error()
    {
        $client = $this->createClientWithMock([
            new Response(200, [], 'not-a-json'),
        ]);

        $this->expectException(NfseApiException::class);
        $this->expectExceptionMessage('Resposta inválida da API');

        $client->registrarEvento('CHAVE123', 'payload');
    }
}
