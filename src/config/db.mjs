import mongoose from "mongoose";
import dotenv from 'dotenv';
import { hashPassword } from "../utils/helpers.mjs";
import User from "../models/User.mjs";

dotenv.config();

const CLUSTER_URI = process.env.MONGO_URL_CLASTER;
const CAMPUS_URI = process.env.MONGO_URI_CAMPUSS;  
const TEST_URI = process.env.MONGO_TEST_URI;

const connectDB = async () => {
    try {
        // Use test database in test environment
        let connectionString;
        
        if (process.env.NODE_ENV === 'test') {
            connectionString = TEST_URI;
            if (!connectionString) {
                console.log('No TEST database URI found, using mock mode');
                return null;
            }
        } else {
            connectionString = CLUSTER_URI || CAMPUS_URI;
        }
        
        if (!connectionString && process.env.NODE_ENV !== 'test') {
            throw new Error('No MongoDB connection string provided. Check your .env file');
        }

        if (connectionString) {
            const conn = await mongoose.connect(connectionString);
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            console.log(`Database: ${conn.connection.name}`);
            
            // Only create admin in non-test environment
            if (process.env.NODE_ENV !== 'test') {
                //await createAdmin();
            }
        }
        
        return mongoose.connection;
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error;
    }
};

export default connectDB;

export const createAdmin = async () => {
    const adminId = process.env.ADMIN_ID
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    try {
        const existingAdmin = await User.findOne({ role: "admin" })
        if (existingAdmin) {
        console.log("admin already exists")
        return
        }

        const existingUser = await User.findOne({_id:adminId})
        console.log("this user will be promoted to admin role :",existingUser);

        if (existingUser) {
        existingUser.role = "admin"
        await existingUser.save()
        console.log("Existing user promoted to admin")
        return
        }

        const admin = await User.create({
        name:{
            firstName: "admin",
            surname:"admin"
        },
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        })

        console.log("admin account created:", admin.email)
    } catch (error) {
        console.error("Failed to create admin:", error.message)
    }
}