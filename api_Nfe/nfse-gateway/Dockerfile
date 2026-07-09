FROM php:8.3-cli-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1
ENV COMPOSER_HOME=/tmp/composer

RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	unzip \
	zip \
	libxml2-dev \
	libzip-dev \
	libcurl4-openssl-dev \
	libonig-dev \
	&& docker-php-ext-install -j"$(nproc)" \
	dom \
	simplexml \
	soap \
	zip \
	mbstring \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app/nfse-gateway

COPY nfse-gateway /app/nfse-gateway
RUN composer install --no-dev --no-interaction --prefer-dist

EXPOSE 8089

CMD ["php", "-S", "0.0.0.0:8089", "-t", "public"]
