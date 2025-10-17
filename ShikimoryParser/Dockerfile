FROM python:3.13-alpine as builder

WORKDIR /app

# Устанавливаем пакеты, необходимые для сборки psycopg2
RUN apk update && apk add --no-cache postgresql-dev gcc python3-dev musl-dev

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/dependencies -r requirements.txt

FROM python:3.13-alpine

WORKDIR /app

# Устанавливаем только runtime зависимости для psycopg2
RUN apk update && apk add --no-cache libpq

COPY --from=builder /app/dependencies /app/dependencies
COPY *.py .

ENV PYTHONPATH=/app/dependencies
CMD ["python3", "main.py"]