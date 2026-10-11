import os
from PIL import Image, ImageDraw, ImageFont

def convert_jpg_to_png():
    jpg_path = r"C:\Users\saaar\.gemini\antigravity-ide\brain\e734dad0-a1e7-4fff-9095-d6d81f80faac\aws_architecture_diagram_1791717114755.jpg"
    artifact_dir = r"C:\Users\saaar\.gemini\antigravity-ide\brain\e734dad0-a1e7-4fff-9095-d6d81f80faac"
    docs_dir = r"d:\BharatBuilds\docs"
    
    if os.path.exists(jpg_path):
        img = Image.open(jpg_path)
        # Save to artifacts directory as png
        img.save(os.path.join(artifact_dir, "aws_architecture_diagram.png"), "PNG")
        # Save to docs as well
        img.save(os.path.join(docs_dir, "aws_architecture_diagram.png"), "PNG")
        print("Converted AI diagram to PNG successfully.")
    else:
        print("JPG not found:", jpg_path)

if __name__ == "__main__":
    convert_jpg_to_png()
