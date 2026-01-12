import requests
from bs4 import BeautifulSoup
import csv
import re

# --- CONFIGURATION ---
URL = "https://lexfridman.com/irving-finkel-transcript"
OUTPUT_FILE = "487_irving_finkel_transcript.csv"

def clean_text(text):
    """Removes extra whitespace and invisible characters."""
    if text:
        text = text.replace('\xa0', ' ').strip()
        return re.sub(r'\s+', ' ', text)
    return ""

def main():
    print(f"Fetching {URL}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(URL, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching page: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # --- CRITICAL STEP: Remove all headers ---
    # We find all h1, h2, h3 tags and destroy them so they cannot be read.
    for header in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        header.decompose()

    # --- Extract Transcript Body ---
    transcript_rows = []

    # Strategy 1: Look for "ts-segment" divs (Newer format)
    segments = soup.find_all('div', class_='ts-segment')
    if segments:
        print(f"Found {len(segments)} segments using 'ts-segment' class.")
        for seg in segments:
            # Extract Name
            name_span = seg.find('span', class_='ts-name')
            name = clean_text(name_span.get_text()) if name_span else "Unknown"

            # Extract Timestamp
            time_span = seg.find('span', class_='ts-timestamp')
            timestamp = clean_text(time_span.get_text()) if time_span else ""

            # Extract Text
            text_span = seg.find('span', class_='ts-text')
            body = clean_text(text_span.get_text()) if text_span else ""

            if name and body:
                transcript_rows.append([name, timestamp, body])

    # Strategy 2: Look for <p> tags with regex (Older format)
    if not transcript_rows:
        print("No 'ts-segment' found. Trying <p> tag fallback...")
        paragraphs = soup.find_all('p')
        
        for p in paragraphs:
            text = clean_text(p.get_text())
            
            # Regex Explanation:
            # ^(.*?)\s* -> Group 1: Speaker Name (everything before the timestamp)
            # (\(\d{1,2}:\d{2}(?::\d{2})?\)) -> Group 2: Timestamp WITH parentheses included
            # \s*(.*)            -> Group 3: The actual dialogue text
            match = re.match(r'^(.*?)\s*(\(\d{1,2}:\d{2}(?::\d{2})?\))\s*(.*)', text)
            
            if match:
                current_speaker = match.group(1).strip()
                timestamp = match.group(2).strip()
                body = match.group(3).strip()
                
                transcript_rows.append([current_speaker, timestamp, body])
                
            elif text and len(text) > 20 and transcript_rows:
                # If line has no timestamp, append it to previous speaker.
                # We skip short lines (<20 chars) to avoid capturing random UI text.
                transcript_rows[-1][2] += " " + text

    # --- Write to CSV ---
    print(f"Found {len(transcript_rows)} dialogue segments.")
    print(f"Writing to {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Headers exactly as requested
        writer.writerow(["speaker", "time_stamp", "dialogue"])
        
        writer.writerows(transcript_rows)

    print("Done!")

if __name__ == "__main__":
    main()