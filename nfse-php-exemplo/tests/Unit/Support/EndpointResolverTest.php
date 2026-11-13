<?php

use Nfse\Enums\TipoAmbiente;
use Nfse\Http\NfseContext;
use Nfse\Support\SefinEndpointResolver;
use Nfse\Dto\Http\Endpoint;

it('resolves default production endpoint when municipio is not informed', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolve($context))
        ->toBe('https://sefin.nfse.gov.br/SefinNacional');
});

it('resolves default homologation endpoint when municipio is not informed', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Homologacao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolve($context))
        ->toBe('https://sefin.producaorestrita.nfse.gov.br/SefinNacional');
});

it('resolves Catanduva production endpoint', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456',
        codigoMunicipio: '3511102'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolve($context))
        ->toBe('https://cidadaoonline.catanduva.sp.gov.br/nota/nacional');
});

it('resolves Catanduva homologation endpoint', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Homologacao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456',
        codigoMunicipio: '3511102'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolve($context))
        ->toBe('https://catanduva.prefeitura.rlz.com.br/nota/nacional');
});

it('resolves custom endpoint when provided in context', function () {
    $customEndpoint = new Endpoint([
        'production' => 'https://custom.api.com/prod',
        'homologation' => 'https://custom.api.com/homo',
    ]);

    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456',
        endpoint: $customEndpoint
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolve($context))
        ->toBe('https://custom.api.com/prod');

    $context->ambiente = TipoAmbiente::Homologacao;
    expect($resolver->resolve($context))
        ->toBe('https://custom.api.com/homo');
});

it('resolves danfse url on the municipality endpoint', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456',
        codigoMunicipio: '3511102'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolveDanfse($context, 'CHAVE123'))
        ->toBe('https://cidadaoonline.catanduva.sp.gov.br/nota/nacional/danfse/CHAVE123/pdf');
});

it('resolves null danfse url when municipio has no mapped endpoint', function () {
    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456'
    );

    $resolver = new SefinEndpointResolver();
    expect($resolver->resolveDanfse($context, 'CHAVE123'))->toBeNull();

    $context->codigoMunicipio = '3550308';
    expect($resolver->resolveDanfse($context, 'CHAVE123'))->toBeNull();
});
it('pins the Catanduva hostname to its original IP for TLS host verification', function () {
    expect(SefinEndpointResolver::pinnedHosts())
        ->toBe(['cidadaoonline.catanduva.sp.gov.br:443:164.152.60.237']);

    $context = new NfseContext(
        ambiente: TipoAmbiente::Producao,
        certificatePath: '/tmp/cert.pfx',
        certificatePassword: '123456',
        codigoMunicipio: '3511102'
    );

    $host = parse_url((new SefinEndpointResolver())->resolve($context), PHP_URL_HOST);
    expect(SefinEndpointResolver::pinnedHosts()[0])->toStartWith($host.':443:');
});
