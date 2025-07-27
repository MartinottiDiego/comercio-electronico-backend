export default ({ env }) => ({
  upload: {
    config: {
      providerOptions: {
        baseUrl: env('PUBLIC_URL', 'http://localhost:1337'),
      },
    },
  },
});
