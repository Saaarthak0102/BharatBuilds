import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

output_dir = Path("apps/web/public/sample-reports")
output_dir.mkdir(parents=True, exist_ok=True)

configs = [
    {
        "filename": "r01.jpg",
        "title": "Crop Residue Burning",
        "subtitle": "Rajpura Fields • Stubble Smoke",
        "bg_top": (45, 20, 15),
        "bg_bottom": (120, 60, 25),
        "accent": (245, 130, 32),
        "category": "CROP BURNING"
    },
    {
        "filename": "r02.jpg",
        "title": "Field Stubble Smoke",
        "subtitle": "Khanna Outskirts • Harvest Clearing",
        "bg_top": (40, 25, 18),
        "bg_bottom": (130, 75, 30),
        "accent": (250, 160, 50),
        "category": "CROP BURNING"
    },
    {
        "filename": "r03.jpg",
        "title": "Perimeter Farm Fire",
        "subtitle": "Karnal Farm Zone • Verification Pending",
        "bg_top": (35, 25, 20),
        "bg_bottom": (110, 65, 35),
        "accent": (230, 110, 40),
        "category": "CROP BURNING"
    },
    {
        "filename": "r04.jpg",
        "title": "Urban Waste Burning",
        "subtitle": "Anand Vihar • Plastic & Refuse",
        "bg_top": (30, 25, 35),
        "bg_bottom": (90, 45, 60),
        "accent": (240, 80, 80),
        "category": "GARBAGE BURNING"
    },
    {
        "filename": "r05.jpg",
        "title": "Open Trash Burning",
        "subtitle": "Laxmi Nagar • Municipal Zone",
        "bg_top": (32, 28, 38),
        "bg_bottom": (95, 50, 65),
        "accent": (235, 95, 95),
        "category": "GARBAGE BURNING"
    },
    {
        "filename": "r06.jpg",
        "title": "Firecracker Smog Haze",
        "subtitle": "Civil Lines • Post-Festival Sparks",
        "bg_top": (25, 20, 40),
        "bg_bottom": (70, 40, 95),
        "accent": (200, 100, 240),
        "category": "CRACKER BURNING"
    },
    {
        "filename": "r07.jpg",
        "title": "Construction Dust Cloud",
        "subtitle": "Sector 62, Noida • Commercial Dig",
        "bg_top": (35, 35, 35),
        "bg_bottom": (100, 95, 80),
        "accent": (210, 180, 90),
        "category": "CONSTRUCTION DUST"
    },
    {
        "filename": "r08.jpg",
        "title": "Demolition Dust Plume",
        "subtitle": "Hauz Khas • Uncovered Debris",
        "bg_top": (38, 38, 36),
        "bg_bottom": (105, 100, 85),
        "accent": (220, 195, 105),
        "category": "CONSTRUCTION DUST"
    },
]

width, height = 800, 600

for cfg in configs:
    img = Image.new("RGB", (width, height), cfg["bg_top"])
    draw = ImageDraw.Draw(img)

    # Vertical gradient
    r1, g1, b1 = cfg["bg_top"]
    r2, g2, b2 = cfg["bg_bottom"]
    for y in range(height):
        ratio = y / float(height)
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Atmospheric smoke / haze layers
    ar, ag, ab = cfg["accent"]
    for i in range(12):
        cx = 100 + i * 55
        cy = 340 + (i % 4) * 30
        rad = 120 + (i % 3) * 40
        draw.ellipse(
            [cx - rad, cy - rad, cx + rad, cy + rad],
            fill=(ar // 4, ag // 4, ab // 4),
            outline=(ar // 2, ag // 2, ab // 2, 80)
        )

    # Ground silhouette
    draw.polygon([(0, 480), (800, 480), (800, 600), (0, 600)], fill=(15, 15, 18))

    # Card border overlay
    draw.rectangle([12, 12, width - 12, height - 12], outline=(255, 255, 255, 60), width=2)

    # Category badge
    draw.rounded_rectangle([40, 40, 260, 75], radius=6, fill=(ar, ag, ab))
    draw.text((50, 48), cfg["category"], fill=(15, 15, 18))

    # Title & Subtitle
    draw.text((40, 495), cfg["title"], fill=(255, 255, 255))
    draw.text((40, 530), cfg["subtitle"], fill=(200, 200, 200))
    draw.text((630, 535), "AI SAMPLE PHOTO", fill=(160, 160, 160))

    dest = output_dir / cfg["filename"]
    img.save(dest, "JPEG", quality=92)
    print(f"Generated: {dest}")
