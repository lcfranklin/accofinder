import express from "express";
import { getUploadUrl } from "../controllers/uploadController.mjs";

const router = express.Router();

router.get("/presigned-url", getUploadUrl);

export default router;