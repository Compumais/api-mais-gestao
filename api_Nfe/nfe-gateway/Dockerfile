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
	libfreetype6-dev \
	libjpeg62-turbo-dev \
	libpng-dev \
	&& docker-php-ext-configure gd --with-freetype --with-jpeg \
	&& docker-php-ext-install -j"$(nproc)" \
	dom \
	simplexml \
	soap \
	zip \
	mbstring \
	gd \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY sped-nfe /app/sped-nfe
RUN cd /app/sped-nfe && composer install --no-dev --no-interaction --prefer-dist

COPY nfe-gateway /app/nfe-gateway
WORKDIR /app/nfe-gateway
RUN composer install --no-dev --no-interaction --prefer-dist

EXPOSE 8088

CMD ["php", "-S", "0.0.0.0:8088", "-t", "public"]
