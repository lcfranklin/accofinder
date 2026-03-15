import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const CLUSTER_URI = process.env.MONGO_URL_CLUSTER;
const CAMPUS_URI = process.env.MONGO_URI_CAMPUS;  

const connectDB = async () => {
    try {
        const connectionString = CLUSTER_URI || CAMPUS_URI || CLUSTER_URI;
        
        if (!connectionString) {
            throw new Error('No MongoDB connection string provided. Check your .env file');
        }

        const conn = await mongoose.connect(connectionString);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;