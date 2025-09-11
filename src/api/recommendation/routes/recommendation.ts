/**
 * Recommendation API Routes
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/recommendations/run',
      handler: 'recommendation.run',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/me',
      handler: 'recommendation.getMyRecommendations',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations',
      handler: 'recommendation.find',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/recommendations/feedback',
      handler: 'recommendation.feedback',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/recommendations/track',
      handler: 'recommendation.track',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/recommendations/generate-basic',
      handler: 'recommendation.generateBasic',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/public',
      handler: 'recommendation.getPublicRecommendations',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};