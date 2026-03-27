export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.m?js$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(uuid)/)"  
  ]
};