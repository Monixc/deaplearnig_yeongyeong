interface UserTaste {
  genres: string[];
  popularity: number;
  selectedTracks: {
    id: string;
    name: string;
    artists: string[];
    popularity: number;
  }[];
}

interface MovieRecommendation {
  title: string;
  reason: string;
  musical_elements: string;
}

interface GptResponse {
  recommendations: MovieRecommendation[];
}
