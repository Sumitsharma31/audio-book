# 📚 AudioBook Converter

An interactive, high-fidelity web application that transforms standard PDF books into immersive audiobooks. Users can upload any PDF and listen to it page-by-page using either advanced Google Cloud AI voices or local device speech engines.

---

## 🌟 Key Features

1. **Seamless PDF Upload & Parsing:** Drag and drop or upload any PDF file. The application automatically extracts and splits the text into readable and listenable pages.
2. **Dual-Mode Speech System:**
   - **Cloud AI Mode:** Uses **Google Cloud Text-to-Speech** to generate highly natural, human-like voice synthesis (premium neural models).
   - **Device Voice Mode:** Uses the browser's built-in **Web Speech API** as a lightweight local voice fallback (no API key required).
3. **Smart Pagination & Auto-Play:** The application keeps track of your current page. Once a page finishes reading, it automatically moves to the next page with a natural breathing space of 300ms.
4. **Playback Speed Control:** Adjust reading speeds from `0.5x` (slower) up to `2.0x` (faster) dynamically for local playback.
5. **Robust Audio Handling:** Features protection against common audio hardware clip-offs and browser speech synthesis queue locks.

---

## 🛠️ Technology Stack

### **Frontend**
* **React (Vite):** Fast, component-based user interface.
* **Tailwind CSS:** Modern, responsive dark-mode styling with glassmorphism effects.
* **React Dropzone:** Simple drag-and-drop file upload interface.

### **Backend**
* **Node.js & Express:** Lightweight, scalable server-side environment.
* **Multer Middleware:** For handling PDF file uploads.
* **PDF Parse:** Parses binary PDF files into raw text content.
* **Google Cloud Text-to-Speech API:** Converts raw text to high-fidelity MP3 audio files.

---

## ⚙️ How It Works (Under the Hood)

### **1. Text Extraction & Chunking**
When you upload a PDF:
* The frontend uploads the file to the Express server using `/api/upload`.
* The backend parses the PDF and splits the text into logical page chunks (approximately 800 characters per chunk, split cleanly at sentence endings).
* This ensures that the text segments sent to the speech engine are concise and don't get truncated or sound awkward.

### **2. Audio Generation**
* **Cloud Mode:** The frontend requests audio for the current page. The backend contacts Google Cloud TTS. It wraps the text inside **SSML (Speech Synthesis Markup Language)**, generates a temporary MP3 file on the server, and returns the URL. The browser plays it using a standard HTML5 `<audio>` player.
* **Device Mode:** The frontend uses `window.speechSynthesis` directly in the browser, matching user-selected system voices and custom rates.

---

## 🚀 Setup & Installation

### **Prerequisites**
* [Node.js](https://nodejs.org/) installed on your machine.
* A Google Cloud API Key with Text-to-Speech enabled (optional, only needed for Cloud AI mode).

### **Backend Setup**
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add your Google Cloud API key:
   ```env
   PORT=5000
   GOOGLE_API_KEY=your_google_api_key_here
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### **Frontend Setup**
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser (usually `http://localhost:5173`).

---

## 💡 Key Technical Challenges Solved (Great for Presentation!)

During the development, two major audio bugs were identified and successfully resolved:

### **Bug 1: Voice Skipping the First 1-2 Words on Start**
* **The Problem:** In local browser synthesis, calling `speechSynthesis.cancel()` (to stop previous speech) and `speechSynthesis.speak()` consecutively caused the browser's audio engine to clip the first 1-2 words. The engine didn't have enough time to clear its buffer and reset.
* **The Solution:** Added a `250ms` delay via `setTimeout` right after calling `cancel()`. This allows the speech engine to fully clear its state before receiving the next instruction, ensuring every word is spoken cleanly.

### **Bug 2: Physical Audio Device Wake-Up Latency**
* **The Problem:** When starting audio playback (especially through Bluetooth headphones or speakers), the hardware goes into a power-saving standby mode. When the generated TTS MP3 played immediately at `0:00`, the first few words were lost while the physical speaker initialized.
* **The Solution:** Upgraded the backend TTS service to use SSML (`<speak><break time="500ms"/>{text}</speak>`). Prepending a `500ms` silence break in the generated audio file gives the hardware speaker ample time to wake up and start streaming before the voice actually speaks.
