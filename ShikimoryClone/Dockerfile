FROM nginx:alpine

# Копируем код приложения
COPY . /var/www/html/ShikimoryClone

# Копируем конфигурацию nginx
COPY ./ShikimoryClone.conf /etc/nginx/conf.d/default.conf

# Создаем том для изображений (если нужно сохранять данные)
VOLUME /var/www/html/ShikimoryClone/img/

EXPOSE 80