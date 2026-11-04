const { Blob } = require('buffer');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Check karo ki variables Netlify me set hue hain ya nahi
    if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
      throw new Error("BOT_TOKEN ya CHAT_ID Netlify ke Environment variables me set nahi hai.");
    }

    const { fileData, fileName, fileType, caption } = JSON.parse(event.body);
    const buffer = Buffer.from(fileData, 'base64');
    const blob = new Blob([buffer], { type: fileType });

    const formData = new FormData();
    // trim() lagaya hai taaki agar copy-paste me extra space aa gaya ho toh hat jaye
    formData.append("chat_id", process.env.CHAT_ID.trim());
    formData.append("document", blob, fileName || "file.jpg");
    formData.append("caption", caption || "New Photo");

    // Telegram API ko request bhejo
    const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN.trim()}/sendDocument`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    
    // Agar Telegram ne error diya (jaise galat token ya chat id)
    if (!res.ok || !data.ok) {
      throw new Error("Telegram Error: " + (data.description || JSON.stringify(data)));
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true }) 
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
