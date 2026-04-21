// jest.setup.js
import mongoose from 'mongoose';
import connectDB from './src/config/db.mjs';

// Set test environment
process.env.NODE_ENV = 'test';

// Connect to database before all tests
beforeAll(async () => {
  try {
    // Wait for Jest-MongoDB to provide the URL
    const mongoUri = process.env.MONGO_TEST_URI;
    if (!mongoUri) {
      console.error('MONGO_TEST_URI not provided by Jest-MongoDB');
      return;
    }
    
    console.log('Connecting to test database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection failed:', error.message);
  }
}, 60000);

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Close connection after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('Test database disconnected');
  }
});