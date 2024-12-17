import boto3
import requests
from lxml import html
from datetime import datetime
import os
import json
import logging
from typing import Dict, List
from tqdm import tqdm
import time
import uuid
import string
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException
from urllib3.exceptions import MaxRetryError
import socket
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_driver(max_retries=5, retry_interval=10):
    """Selenium WebDriver 생성 함수"""
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    
    selenium_url = os.environ.get('SELENIUM_URL', 'http://localhost:4444/wd/hub')
    
    for attempt in range(max_retries):
        try:
            driver = webdriver.Remote(
                command_executor=selenium_url,
                options=options
            )
            return driver
        except (WebDriverException, MaxRetryError, socket.error) as e:
            if attempt == max_retries - 1:
                raise
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)

class MovieMusicCrawler:
    def __init__(self):
        self.base_url = "https://www.what-song.com"
        self.s3 = boto3.client('s3')
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(os.environ['TABLE_NAME'])
        self.bucket = os.environ['BUCKET_NAME']
        
    def get_movie_list(self, page: str) -> List[Dict]:
        """알파벳별 영화 목록 크롤링"""
        try:
            url = f"{self.base_url}/browse/movies/{page.lower()}"
            logger.info(f"Fetching URL: {url}")
            
            driver = create_driver()
            
            try:
                # 페이지 로드
                driver.get(url)
                
                # 영화 목록이 로드될 때까지 대기
                wait = WebDriverWait(driver, 20)  # 타임아웃 증가
                movie_elements = wait.until(
                    EC.presence_of_all_elements_located(
                        (By.CSS_SELECTOR, 'a[href*="/Movies/Soundtrack/"]')
                    )
                )
                
                movies = []
                for movie in movie_elements:
                    try:
                        title = movie.find_element(By.CSS_SELECTOR, 'div p:not(.text-slate-500)').text.strip()
                        year = movie.find_element(By.CSS_SELECTOR, 'p.text-slate-500').text.strip()
                        href = movie.get_attribute('href')
                        movie_id = href.split('/')[-1]
                        
                        movies.append({
                            'movieId': movie_id,
                            'title': title,
                            'year': year,
                            'url': href
                        })
                        logger.info(f"Found movie: {title} ({year})")
                    except Exception as e:
                        logger.error(f"Error parsing movie: {e}")
                        continue
                
                logger.info(f"Total movies found for letter {page}: {len(movies)}")
                return movies
                
            finally:
                driver.quit()
                
        except Exception as e:
            logger.error(f"Error in get_movie_list: {e}")
            return []
            
    def get_movie_songs(self, url: str) -> List[Dict]:
        """영화별 수록곡 정보 크롤링"""
        try:
            logger.info(f"Fetching songs from URL: {url}")
            
            driver = create_driver()
            
            try:
                # 페이지 로드
                driver.get(url)
                
                # 영화 제목이 로드될 때까지 대기
                wait = WebDriverWait(driver, 20)  # 타임아웃 증가
                movie_title_elem = wait.until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, 'h1.font-medium')
                    )
                )
                
                # 영화 제목 추출 (Soundtrack 제외)
                movie_title = movie_title_elem.text.replace(' Soundtrack', '').strip()
                
                # 음악 목록이 로드될 때까지 대기
                song_elements = wait.until(
                    EC.presence_of_all_elements_located(
                        (By.CSS_SELECTOR, 'p.my-0')
                    )
                )
                
                songs = []
                for song in song_elements:
                    try:
                        # 노래 제목
                        title = song.text.strip()
                        
                        # 아티스트 (다음 형제 요소)
                        artist = driver.execute_script(
                            "return arguments[0].nextElementSibling.textContent;",
                            song
                        ).strip()
                        
                        songs.append({
                            'songId': str(uuid.uuid4()),
                            'title': title,
                            'artist': artist,
                            'movieTitle': movie_title
                        })
                        logger.info(f"Found song: {title} by {artist}")
                    except Exception as e:
                        logger.error(f"Error parsing song element: {e}")
                        continue
                
                return songs
                
            finally:
                driver.quit()
                
        except Exception as e:
            logger.error(f"Error in get_movie_songs: {e}")
            return []

    def save_to_dynamodb(self, movie: Dict, songs: List[Dict]):
        """DynamoDB에 데이터 저장"""
        for song in songs:
            try:
                self.table.put_item(Item={
                    'movieId': movie['movieId'],
                    'songId': song['songId'],
                    'movieTitle': movie['title'],
                    'songTitle': song['title'],
                    'artist': song['artist'],
                    'updatedAt': datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Error saving to DynamoDB: {e}")

    def save_to_s3(self, movie: Dict, songs: List[Dict]):
        """S3에 원본 데이터 저장"""
        data = {
            'movie': movie,
            'songs': songs,
            'crawledAt': datetime.now().isoformat()
        }
        
        key = f"movies/{movie['movieId']}/data.json"
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=json.dumps(data)
            )
        except Exception as e:
            logger.error(f"Error saving to S3: {e}")

    def run(self):
        """크롤링 실행"""
        try:
            # A부터 Z까지 각 알파벳 페이지 크롤링
            for letter in string.ascii_uppercase:
                logger.info(f"Processing movies starting with {letter}")
                
                movies = self.get_movie_list(letter)
                logger.info(f"Found {len(movies)} movies for letter {letter}")
                
                for movie in movies:
                    try:
                        logger.info(f"Processing movie: {movie['title']}")
                        songs = self.get_movie_songs(movie['url'])
                        
                        if songs:
                            self.save_to_dynamodb(movie, songs)
                            self.save_to_s3(movie, songs)
                            logger.info(f"Saved {len(songs)} songs for {movie['title']}")
                        
                        time.sleep(1)  # 요청 간격
                        
                    except Exception as e:
                        logger.error(f"Error processing movie {movie['title']}: {e}")
                        continue
                        
                time.sleep(2)  # 알파벳 페이지 간 간격
                
        except Exception as e:
            logger.error(f"Critical error in crawler: {e}")
            raise

if __name__ == "__main__":
    crawler = MovieMusicCrawler()
    crawler.run() 