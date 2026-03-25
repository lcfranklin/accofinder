import mongoose from "mongoose";
import dotenv from 'dotenv';
import { hashPassword } from "../utils/helpers.mjs";
import User from "../models/User.mjs";

dotenv.config();

const CLUSTER_URI = process.env.MONGO_URL_CLUSTER;
const CAMPUS_URI = process.env.MONGO_URI_CAMPUS;  

const connectDB = async () => {
    try {
        const connectionString = CLUSTER_URI || CAMPUS_URI ;
        
        if (!connectionString) {
            throw new Error('No MongoDB connection string provided. Check your .env file');
        }

        const conn = await mongoose.connect(connectionString);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
        await createAdmin();
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
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
        console.log(" admin already exists")
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

        console.log("admin account created:", admin.emailAddress)
    } catch (error) {
        console.error("Failed to create admin:", error.message)
    }
}