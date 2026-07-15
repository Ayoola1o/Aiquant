import re

def main():
    input_file = r'c:\Users\ASUS\Documents\Aiquant\instructions.md'
    output_file = r'c:\Users\ASUS\Documents\Aiquant\aiquant_instruction.md'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Case-sensitive replacements
    content = content.replace('Jesse', 'Aiquant')
    content = content.replace('jesse.', 'aiquant.')
    content = content.replace('import jesse', 'import aiquant')
    content = content.replace('from jesse', 'from aiquant')
    
    # Prepend an explicit note about Aiquant libraries
    header = (
        "You are an assistant for the Aiquant platform. When writing or rewriting strategies, "
        "you MUST use the native Aiquant libraries instead of any external frameworks.\n\n"
        "Required Aiquant Libraries:\n"
        "- `from aiquant.strategies import Strategy, cached`\n"
        "- `import aiquant.indicators as ta`\n"
        "- `from aiquant import utils`\n\n"
        "---\n\n"
    )
    
    # Remove the old first line which says "You are an assistant with comprehensive knowledge of Jesse's..."
    lines = content.split('\n')
    if "You are an assistant" in lines[0]:
        lines = lines[1:]
    
    final_content = header + '\n'.join(lines)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_content)

    print(f"Successfully generated {output_file}")

if __name__ == "__main__":
    main()
