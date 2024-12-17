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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MovieMusicCrawler:
    def __init__(self):
        self.base_url = "https://www.what-song.com"
        self.s3 = boto3.client('s3')
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(os.environ['TABLE_NAME'])
        self.bucket = os.environ['BUCKET_NAME']

    def get_movie_list(self, page: int = 1) -> List[Dict]:
        """영화 목록 페이지 크롤링"""
        url = f"{self.base_url}/Movies/browse/date_desc/{page}"
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        movies = []
        for movie in soup.select('.movie-item'):
            movie_url = movie.select_one('a')['href']
            movie_id = movie_url.split('/')[-1]
            title = movie.select_one('.movie-title').text.strip()
            
            movies.append({
                'movieId': movie_id,
                'title': title,
                'url': f"{self.base_url}{movie_url}"
            })
            time.sleep(0.5)  # 요청 간격 조절
        
        return movies

    def get_movie_songs(self, movie_url: str) -> List[Dict]:
        """영화별 수록곡 크롤링"""
        response = requests.get(movie_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        songs = []
        for song in tqdm(soup.select('.song-entry'), desc="Crawling songs"):
            song_id = song['data-song-id']
            title = song.select_one('.song-title').text.strip()
            artist = song.select_one('.song-artist').text.strip()
            
            songs.append({
                'songId': song_id,
                'title': title,
                'artist': artist
            })
            time.sleep(0.2)  # 요청 간격 조절
        
        return songs

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
            for page in tqdm(range(1, 6), desc="Crawling pages"):
                movies = self.get_movie_list(page)
                
                for movie in tqdm(movies, desc=f"Processing movies from page {page}"):
                    logger.info(f"Crawling movie: {movie['title']}")
                    songs = self.get_movie_songs(movie['url'])
                    
                    if songs:
                        self.save_to_dynamodb(movie, songs)
                        self.save_to_s3(movie, songs)
                    
                    logger.info(f"Completed: {movie['title']} - {len(songs)} songs")
                    
        except Exception as e:
            logger.error(f"Crawling error: {e}")

if __name__ == "__main__":
    crawler = MovieMusicCrawler()
    crawler.run() 