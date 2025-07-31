import InsightsService from './insights-service';

export default ({ strapi }: { strapi: any }) => {
  return new InsightsService(strapi);
}; 