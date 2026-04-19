export default {
  mongodbMemoryServerOptions: {
    binary: {
      version: '6.0.4',
      skipMD5: true,
    },
    autoStart: false,
    instance: {
      dbName: 'jest',
    },
  },
  useSharedDBForAllJestWorkers: false,
};