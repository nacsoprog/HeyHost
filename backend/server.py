from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
from openai import OpenAI
from pathlib import Path
import tempfile
import os
import csv
import sys
import json
csv.field_size_limit(sys.maxsize)

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# DeepSeek client
# DeepSeek client
api_key = os.getenv('DEEPSEEK_API_KEY')
print(f"DeepSeek API key loaded: {'Yes' if api_key else 'No'} (length: {len(api_key) if api_key else 0})")

deepseek_client = OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com"
)

LEX_SYSTEM_PROMPT = """You are Lex Fridman — AI researcher, MIT scientist, podcast host. A listener paused your podcast to ask you something.

## How You Talk
- Thoughtful, calm, never rushed, brief and concise
- Connect ideas to bigger themes only when it feels natural
- Reference podcast guests when relevant: "I was talking to [Guest] about this..."

## Response Length — Match the Question
- Casual/simple → 1 sentences, like a normal human
- Deep/philosophical → 2 sentences, more reflective

Examples:
- "What's an apple?" → "It's a fruit. I eat one almost every day, actually."
- "Do you like coffee?" → "I love coffee. Probably too much."
- "What do you think about consciousness?" → [Go deeper, reflect, connect ideas]

## Don't
- Break character or acknowledge you're an AI
- Turn simple questions into philosophical monologues
- Ramble — say what you mean, then stop

## FUNCTION LIST: These are available functions for you to call depending on conversation partner's words. IF YOU USE ANY FUNCTION, DO NOT OUTPUT ANYTHING EXCEPT THE DEFINED JSON OBJECT.:

### If your conversation partner says something that clearly indicates they want to end the conversaation,
output ONLY THE FOLLOWING JSON OBJECT WITH NO ADDITIONAL TEXT:
{"function_call": {
    "name": "end_conversation",
    "arguments": {}
}}

## END OF FUNCTION LIST
"""


# Transcript directory and title generation
TRANSCRIPT_DIR = Path(__file__).parent.parent / "podcast_scraper"

TITLE_SYSTEM_PROMPT = """You are a concise sub-editor for a podcast app. Generate a short, specific title (max 6 words) for this audio clip. The title must be descriptive enough to be used as a voice command. Do not use quotes. Return ONLY the title text."""

def parse_timestamp(ts_str):
    """Convert '(HH:MM:SS)' to seconds."""
    ts_str = ts_str.strip("()")
    parts = ts_str.split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0

def get_transcript_for_range(episode_id, start_time, end_time):
    """Extract transcript text for time range from CSV."""
    transcript_map = {
        "487": "487_irving_finkel_transcript.csv",
        "488": "488_joel_hamkins_transcript.csv",
    }
    for key, filename in transcript_map.items():
        if key in str(episode_id):
            path = TRANSCRIPT_DIR / filename
            if path.exists():
                segments = []
                with open(path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        ts = parse_timestamp(row.get('time_stamp', '(00:00:00)'))
                        if start_time <= ts <= end_time:
                            segments.append(f"{row['speaker']}: {row['dialogue']}")
                return "\n".join(segments) if segments else None
    return None

# Load model once at startup (uses CPU by default)
# Options: "tiny", "base", "small", "medium", "large-v2"
# Speed comparison (CPU, int8): tiny ~3-5x faster than base, small ~2-3x slower, medium ~4-6x slower, large-v2 ~8-12x slower
# For GPU: use device="cuda" and compute_type="float16" for much faster transcription
print("Loading Whisper model...")
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Model loaded!")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Transcribe
        # beam_size: 1-2 = faster (lower accuracy), 5 = default (balanced), 10+ = slower (higher accuracy)
        segments, info = model.transcribe(tmp_path, beam_size=5)

        # Combine all segments
        text = ' '.join([segment.text for segment in segments]).strip()

        return jsonify({'text': text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()

    if not data or 'question' not in data:
        return jsonify({'error': 'No question provided'}), 400

    question = data['question']
    
    # Get conversation history if provided
    messages_history = data.get('messages', [])
    
    # Build messages for API call
    if messages_history:
        # Use provided conversation history
        api_messages = [
            {"role": msg['role'], "content": msg['content']}
            for msg in messages_history
        ]
    else:
        # Fallback to single message
        api_messages = [{"role": "user", "content": question}]

    try:
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": LEX_SYSTEM_PROMPT},
                *api_messages
            ],
            max_tokens=500,
            temperature=0.7
        )

        reply = response.choices[0].message.content
        
        func_call = None
        if reply[0] == '{' and reply[-1] == '}':
            # Likely a function call JSON
            try:
                func_call = json.loads(reply).get('function_call', {})
            except json.JSONDecodeError:
                pass
        
        if func_call:
            name = func_call.get('name')
            arguments = func_call.get('arguments', {})
            
            if name == "end_conversation":
                return jsonify({'function_call': 'end_conversation', 'reply' : 'Returning back to the podcast!', 'repeat': "False"})
        else:
            pass
        
        # --- ElevenLabs Integration ---
        try:
            from elevenlabs.client import ElevenLabs
            
            # Load keys from environment variables
            EL_API_KEY = os.getenv('EL_API_KEY')
            VOICE_ID = "XUyjvv4NSqQwnI5aEsfk" # Lex
            #VOICE_ID = "9rvSVXglpHWwFhSpStxQ" # Me
            
            el_client = ElevenLabs(api_key=EL_API_KEY)
            
            print(f"Generating audio for: {reply[:50]}...")
            
            # Generate audio (returns a generator)
            audio_generator = el_client.text_to_speech.convert(
                text=reply,
                voice_id=VOICE_ID,
                model_id="eleven_monolingual_v1"
            )
            
            # Convert generator to bytes
            audio_bytes = b"".join(list(audio_generator))
            
            # Convert to base64
            import base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            return jsonify({'reply': reply, 'audio': audio_base64, 'repeat': 'True'})

        except Exception as e:
            print(f"ElevenLabs error: {e}")
            # Fallback to just text if audio fails
            return jsonify({'reply': reply, 'error_audio': str(e)})

    except Exception as e:
        print(f"DeepSeek error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transcript/<episode_id>', methods=['GET'])
def get_transcript(episode_id):
    """Return full transcript as JSON array of segments."""
    transcript_map = {
        "487": "487_irving_finkel_transcript.csv",
        "488": "488_joel_hamkins_transcript.csv",
    }

    filename = None
    for key, fname in transcript_map.items():
        if key in str(episode_id):
            filename = fname
            break

    if not filename:
        return jsonify({'error': 'Transcript not found'}), 404

    path = TRANSCRIPT_DIR / filename
    if not path.exists():
        return jsonify({'error': 'File not found'}), 404

    segments = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        segment_id = 0
        for row in reader:
            start_time = parse_timestamp(row.get('time_stamp', '(00:00:00)'))
            segments.append({
                'id': str(segment_id),
                'speaker': row.get('speaker', 'Unknown'),
                'startTime': start_time,
                'endTime': start_time,  # Will be updated below
                'text': row.get('dialogue', '')
            })
            # Update previous segment's endTime
            if segment_id > 0:
                segments[segment_id - 1]['endTime'] = start_time
            segment_id += 1

    # Set last segment's endTime to 5 minutes after start (generous buffer)
    if segments:
        segments[-1]['endTime'] = segments[-1]['startTime'] + 300

    return jsonify(segments)


@app.route('/generate-clip-title', methods=['POST'])
def generate_clip_title():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400

    transcript_text = get_transcript_for_range(
        data.get('episode_id', ''),
        data.get('start_time', 0),
        data.get('end_time', 0)
    )

    if not transcript_text:
        return jsonify({'error': 'No transcript found'}), 404

    try:
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": TITLE_SYSTEM_PROMPT},
                {"role": "user", "content": transcript_text}
            ],
            max_tokens=50,
            temperature=0.3
        )
        title = response.choices[0].message.content.strip().strip('"\'')
        return jsonify({'title': title})
    except Exception as e:
        print(f"Title generation error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting server on http://localhost:5001")
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.methods}")
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5001)), debug=False)
