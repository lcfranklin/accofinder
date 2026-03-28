import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { v4 as uuidv4 } from "uuid"

dotenv.config()

const {
  JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRATION,
} = process.env

// ---------- ACCESS TOKEN ----------
export const generateAccessToken = user => {
  return jwt.sign(
    {
      sub: user._id,
      role: user.role,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRATION || "0.5m", algorithm: "HS256" }
  )
}

export const verifyAccessToken = token => {
  return jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ["HS256"] })
}

// ---------- REFRESH TOKEN ----------
export const generateRefreshToken = user => {
  return jwt.sign(
    {
      sub: user._id,
      jti: uuidv4(),
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRATION || "1d", algorithm: "HS256" }
  )
}

export const verifyRefreshToken = token => {
  return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ["HS256"] })
}