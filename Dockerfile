FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive


RUN apt-get update && apt-get install -y \
  sudo \
  python3 \
  python3-pip \
  nginx \
  supervisor \
    && rm -rf /var/lib/apt/lists/*


# App
COPY ./ShikimoryAPI /ShikimoryClone/ShikimoryAPI
COPY ./ShikimoryParser /ShikimoryClone/ShikimoryParser
COPY ./ShikimorySite /var/www/html/ShikimoryClone
COPY ./ShikimorySite/ShikimoryClone.conf /etc/nginx/conf.d

# PIP
RUN pip3 install -r /ShikimoryClone/ShikimoryAPI/requirements.txt
RUN pip3 install -r /ShikimoryClone/ShikimoryParser/requirements.txt

# supervisord
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

#RUN chmod +x /tmp/main.py
# Открываем порты (если нужно)
EXPOSE 80 443 5432


# Запускаем supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
