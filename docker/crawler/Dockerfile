# docker/crawler/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY packages/crawler/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY packages/crawler/ .

CMD ["python", "src/main.py"]