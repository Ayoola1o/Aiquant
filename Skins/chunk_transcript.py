import sys
import re

txt_path = r"c:\Users\ASUS\Documents\Aiquant\transcript_clean.txt"
out_path = r"c:\Users\ASUS\Documents\Aiquant\transcript_summary.md"

with open(txt_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Split into paragraphs/chunks
sentences = re.split(r'(?<=[.!?]) +', text)
chunks = []
current_chunk = []
current_length = 0

for sentence in sentences:
    if current_length + len(sentence) > 3000:
        chunks.append(" ".join(current_chunk))
        current_chunk = [sentence]
        current_length = len(sentence)
    else:
        current_chunk.append(sentence)
        current_length += len(sentence)
if current_chunk:
    chunks.append(" ".join(current_chunk))

# We will just dump the chunks to a structured format for easier reading by the LLM
# Or use a local model if we had one, but we are the LLM. 
# So let's just write a script that helps the LLM read the document page by page.
# Actually, since the LLM context is large enough, I can just read the file in smaller chunks directly.

with open(out_path, 'w', encoding='utf-8') as f:
    for i, chunk in enumerate(chunks):
        f.write(f"\n\n## Chunk {i+1}\n")
        f.write(chunk)
