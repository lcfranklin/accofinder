import twilio from "twilio"

/*const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

 const sendSms = async (message,to)=> {

    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        })
        return "SMS sent successfully"
    } catch (error) {
        return {status:500, message:error.message}
        
    }
    
}

export default sendSms
*/