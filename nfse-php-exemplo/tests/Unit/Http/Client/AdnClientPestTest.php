<?php

namespace Nfse\Tests\Unit\Http\Client;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Nfse\Enums\TipoAmbiente;
use Nfse\Enums\TipoNsu;
use Nfse\Http\Client\AdnClient;
use Nfse\Http\NfseContext;
use ReflectionClass;

it('sends correct tipoNSU query parameter in baixarDfeMunicipio', function () {
    $container = [];
    $history = Middleware::history($container);

    $mock = new MockHandler([
        new Response(200, [], json_encode(['UltimoNSU' => 100, 'LoteDFe' => []])),
    ]);

    $handlerStack = HandlerStack::create($mock);
    $handlerStack->push($history);
    $httpClient = new Client(['handler' => $handlerStack]);

    $context = new NfseContext(
        TipoAmbiente::Homologacao,
        'fake/path.pfx',
        'password'
    );

    $client = new AdnClient($context);
    $reflection = new ReflectionClass($client);
    $property = $reflection->getProperty('httpClient');
    $property->setValue($client, $httpClient);

    $client->baixarDfeMunicipio(100, TipoNsu::Geral);

    expect($container)->toHaveCount(1);
    $request = $container[0]['request'];

    expect($request->getUri()->getQuery())->toContain('tipoNSU=GERAL');
});
