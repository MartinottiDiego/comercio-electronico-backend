import RecommendationEngine from './recommendation-engine';

export default ({ strapi }: { strapi: any }) => {
  return new RecommendationEngine(strapi);
}; 