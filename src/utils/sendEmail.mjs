import { BirdClient } from "@messagebird/sdk";
import dotenv from "dotenv";
dotenv.config();

const bird_api_key = process.env.BIRD_API_KEY;

const sendEmail = async (user_email, code, purpose) => {
  const bird = new BirdClient({ apiKey: bird_api_key });

  try {
    const msg = await bird.email.send({
      from: { email: "onboarding@messagebird.dev", name: "Bird" },
      to: [user_email],
      subject: `Your OTP for ${purpose}`,
      html: `<p>Your OTP code is: <strong>${code}</strong>. It will expire in 10 minutes.</p>`
    });
    return true;
  } catch (error) {
    console.error("Send email error:", {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.response?.data || error,
    });
    return false;
  }
}

export default sendEmail;