
import bcrypt from "bcrypt"
// import {ObjectId} from "mongoose";
import jwt from "jsonwebtoken"
import sharp from "sharp";
import crypto from "crypto"
import User from "../models/User.mjs"
import dotenv from "dotenv"

dotenv.config();

const PAYCHANGU_API = "https://api.paychangu.com";
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const saltRounds = process.env.SALT_ROUNDS;

/**
 * Wrapper for async route handlers to automatically catch and forward errors to the error middleware
 * @param {Function} fn - The asynchronous route handler
 * @returns {Function} wrapped handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standardized API Response formatter
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {boolean} success - Operation success flag
 * @param {string} message - User-friendly message
 * @param {any} data - Response payload
 * 
 * It handles response sending. whether success or failure 
 */
export const sendResponse = (res, status, success, message, data = null) => {
  res.status(status).json({
    success,
    message,
    data,
  });
};

/**
 * Formats mongoose validation errors into a clean key-value object
 * @param {Object} err - Mongoose error object
 * @returns {Object} formated errors
 */
export const formatMongooseValidationErrors = (err) => {
  const formattedErrors = {};
  if (err.name === 'ValidationError') {
    for (const field in err.errors) {
      formattedErrors[field] = err.errors[field].message;
    }
  }
  return formattedErrors;
};

// Capitalize first letter of a string
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
};

// Format a user's full name
export const formatFullName = (user) => {
  if(!user instanceof User) return '';

  const {firstName, lastName} = user;

  const formattedFirstName = firstName?.trim() || '';
  const formattedLastName = lastName?.trim() || '';

  return `${formattedFirstName}${formattedFirstName && formattedLastName ? '' : ''}${formattedLastName}`.trim();

};

// Format date to YYYY-MM-DD string
export const formatDate = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = (date.getMonth()).padStart(2, '0');
  const day = (date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;


};

// Mask an email for privacy 
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email; // Too short to mask
  
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const maskedLocal = localPart.length <= 4 ? `${firstChar}***` : `${firstChar}${('*').repeat(localPart.length - 2)}${lastChar}`;
  
  return `${maskedLocal}@${domain}`;
  
};

// Generate random code (e.g., for OTPs or IDs)
export const generateRandomCode = () => {
  // Generates a number between 0 and 999999
  const code = crypto.randomInt(0, 1_000_000)
    .toString()
    .padStart(6, "0"); // ensures exactly 6 digits

  return code;
};

// Check if user has a given role
export const hasRole = (user, roles = []) => {
  if (!user instanceof User || !user.roles || !Array.isArray(roles)) return false;
  
  return roles.some(role => user.roles.includes(role));
  
};
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(Number(saltRounds) || 10)
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  } catch (error) {
    console.error("Error hashing password:", error)
    throw new Error("Error hashing password")
  }
}

//copare the raw and hashed password
export const comparePassword = async (raw, hashed) => {
  // if (!raw || !hashed || typeof raw !== 'string' || typeof hashed !== 'string') {
  //   return false;
  // }
  try {
    const comparedPassword = await bcrypt.compare(raw, hashed);
    console.log(comparedPassword)
    return comparedPassword
  } catch (err) {

    return false;
  }
    
};

// Validate if a string is a valid ObjectId
export const validateObjectId = (id, fieldName = "ID") => {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }
  if (!ObjectId.isValid(id)) {
    return { isValid: false, error: `${fieldName} is not a valid ObjectId` };
  }
  return { isValid: true, error: null };

};

//geting the expiration date from jwt
export const getExpiryDate = (token) => {
  const decoded = jwt.decode(token)
  const expiration = decoded ? decoded.exp : null

  if(!expiration){
    return {status:500, message:"exp null"}
  }
  return new Date(expiration * 1000);

  
};

//optimise image
export const optimizeImage = async (filePath) => {
  try {
    const optimsedImage = sharp(filePath)
                        .resize(800,800,{fit:'inside',withoutEnlargement: true})
                        .webp({quality: 80, effort:4})
                        .toBuffer();
  return optimizeImage;
  } catch (error) {
    return {status:500, message: "error processing image"}
  }
};
// Helper: call PayChangu
export const pcFetch = async (path, init = {}) => {
  const res = await fetch(`${PAYCHANGU_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${SECRET_KEY}`, // Secret Key
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  // Get raw text and parse JSON safely
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Invalid JSON from PayChangu:", text);
    throw new Error(`Invalid response from PayChangu: ${text.substring(0, 100)}`);
  }

  // Log full response for debugging
  if (!res.ok) {
    console.error("PayChangu API Error:", {
      status: res.status,
      body: data,
    });

    // Extract readable error message
    let errorMsg =
      data?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      (data?.errors ? JSON.stringify(data.errors) : null) ||
      `PayChangu error (${res.status})`;

    throw new Error(errorMsg);
  }

  return data;
};

//mas phone number
export const maskPhone = (phone)=>{
  if (!phone) return null
  return phone.slice(0, 3) + "****" + phone.slice(-2)
}
//transition
export function canTransition(current, next) {
  return allowedTransitions[current]?.includes(next)
}