export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.m?js$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(uuid)/)"  
  ],
  testTimeout: 60000,
  preset: "@shelf/jest-mongodb",
  setupFilesAfterEnv: ["./jest.setup.js"] 
}