import UserBehaviorService from './user-behavior';

export default ({ strapi }: { strapi: any }) => {
  return new UserBehaviorService(strapi);
}; 