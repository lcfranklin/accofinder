import { generateUploadUrl } from "../utils/s3Presigner.mjs";

export const getUploadUrl = async (req, res) => {
  try {
    const { fileType } = req.query;

    const key = `uploads/${Date.now()}.${fileType || "jpg"}`;

    const url = await generateUploadUrl({
      key,
      contentType: `image/${fileType || "jpeg"}`,
    });

    return res.json({
      uploadUrl: url,
      key,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to generate upload URL",
    });
  }
};