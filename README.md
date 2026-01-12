# Hey Host!
> **Don't just listen. Join the conversation.**

[![Devpost](https://img.shields.io/badge/Devpost-Winner-blue?logo=devpost)](https://devpost.com/software/hey-host)


**Hey Host!** transforms passive podcast listening into an active, two-way dialogue. Imagine pausing an episode just to ask the host a question—and *actually getting an answer* in their own voice.

[**Watch the Demo Video**](https://www.loom.com/share/918b799f052a4dd3a075bd4221af496a)


## Screenshots
![Gallery 1](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/004/153/815/datas/gallery.jpg)
![Gallery 2](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/004/153/816/datas/gallery.jpg)
![Gallery 3](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/004/153/814/datas/gallery.jpg)

## Why Hey Host?
We all love podcasts, but they are a one-way street. **Hey Host!** changes the game:
*   **Talk Back**: Just say **"Hey Host!"** to interrupt. Ask your favorite host about anything.
*   **Intelligent Responses**: Powered by **DeepSeek** and **ElevenLabs**, the host replies with their real personality and voice.
*   **Voice Control**: No hands needed.
    *   *"Rewind"* to catch that last point.
    *   *"Forward"* to skip the ads.
    *   *"Save that"* to instantly clip a memorable moment.
*   **Smart Clipping**: Automatically save and title the best parts of the conversation.

## Under the Hood
We built a high-performance audio pipeline to make this happen:
1.  **Wake Word**: Uses **Porcupine** for instant, privacy-focused "Hey Host!" detection.
2.  **Speech-to-Text**: **Faster-Whisper** processes your speech in real-time.
3.  **The Brain**: **DeepSeek** generates context-aware, persona-driven responses.
4.  **The Voice**: **ElevenLabs** clones the host's voice for hyper-realistic audio.
5.  **Frontend**: Built with **Next.js 14**, **React**, and **Tailwind**.

## Getting Started
### Prerequisites
*   Node.js & npm
*   Python 3.10+
*   API Keys (DeepSeek, ElevenLabs)

### Backend Setup (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate
pip install -r requirements.txt
```
Create `.env` in `backend/`:
```env
DEEPSEEK_API_KEY=your_key
EL_API_KEY=your_key
PORT=5001
```
Run: `python server.py`

### Frontend Setup (Next.js)
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.

## Accolades
**Winner - Grand Prize (First Place)** at [SB Hacks XII](https://sb-hacks-xii.devpost.com/)

## Creators
-- [Nathan So](https://devpost.com/nathansocollege) - [Quinn Godfredsen](https://devpost.com/qsgodfredsen) - [Joshua Lee](https://devpost.com/lee717) --
