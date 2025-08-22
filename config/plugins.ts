export default {
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '30d',
      },
    },
  },
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 10 * 1024 * 1024, // 10MB
    },
  },
};
