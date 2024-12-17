import boto3
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os
import json
import logging
from typing import Dict, List
from tqdm import tqdm
import time
import uuid
import string

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            
            response = requests.get(url)
            logger.info(f"Response status code: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch page: {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            movies = []
            
            # 영화 목록 찾기
            movie_links = soup.select('a[href^="/Movies/Soundtrack/"]')
            
            for movie in movie_links:
                try:
                    title = movie.select_one('p').text.strip()  # 영화 제목
                    url = movie['href']
                    movieId = url.split('/')[-1]
                    
                    movies.append({
                        'movieId': movieId,
                        'title': title,
                        'url': f"{self.base_url}{url}"
                    })
                    logger.info(f"Found movie: {title}")
                except Exception as e:
                    logger.error(f"Error parsing movie element: {e}")
                    continue
                
            return movies
            
        except Exception as e:
            logger.error(f"Error in get_movie_list: {e}")
            return []

    def get_movie_songs(self, url: str) -> List[Dict]:
        """영화별 수록곡 정보 크롤링"""
        try:
            response = requests.get(url)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            songs = []
            
            # 영화 제목 찾기 (Soundtrack 제외)
            movie_title = soup.select_one('h1.font-medium').text.replace(' Soundtrack', '').strip()
            
            # 음악 정보 찾기
            song_elements = soup.find_all('p', {'class': 'my-0'})
            
            for song in song_elements:
                try:
                    title = song.text.strip()
                    artist = song.find_next('p', {'class': 'text-md'}).text.strip()
                    
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