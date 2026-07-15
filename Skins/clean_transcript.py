import sys
import re

srt_path = r"c:\Users\ASUS\Documents\Aiquant\Full AI Trading Course 2026 Master Agentic Trading (Beginner to Pro) [English (auto-generated)] [DownloadYoutubeSubtitles.com].srt"
txt_path = r"c:\Users\ASUS\Documents\Aiquant\transcript_clean.txt"

with open(srt_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    line = line.strip()
    # Skip empty lines
    if not line:
        continue
    # Skip numeric sequence lines
    if line.isdigit():
        continue
    # Skip timestamp lines
    if '-->' in line:
        continue
    clean_lines.append(line)

# Join and remove duplicate consecutive lines (common in auto-generated captions)
final_text = []
for text in clean_lines:
    if not final_text or final_text[-1] != text:
        final_text.append(text)

with open(txt_path, 'w', encoding='utf-8') as f:
    f.write(" ".join(final_text))

print(f"Cleaned transcript saved to {txt_path} with {len(final_text)} lines.")
