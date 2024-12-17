FROM python:3.9-slim

WORKDIR /app

# lxml 빌드에 필요한 의존성 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# 필요한 패키지 설치
COPY packages/crawler/requirements.txt .
RUN pip install -r requirements.txt

# 소스 코드 복사
COPY packages/crawler/src/ .

# 실행
CMD ["python", "main.py"]