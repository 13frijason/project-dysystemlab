from PIL import Image, ImageDraw
import math

def draw_dot_snowflake(draw, center, size, color, width=18):
    # Central circle
    center_radius = size * 0.22
    draw.ellipse([center[0]-center_radius, center[1]-center_radius, center[0]+center_radius, center[1]+center_radius], fill=color)
    # 6 lines and dots
    dot_radius = width * 1.2
    for i in range(6):
        angle = math.radians(i * 60)
        x2 = center[0] + size * math.cos(angle)
        y2 = center[1] + size * math.sin(angle)
        # Draw line from center to dot
        draw.line([center, (x2, y2)], fill=color, width=width)
        # Draw dot at the end
        draw.ellipse([x2-dot_radius, y2-dot_radius, x2+dot_radius, y2+dot_radius], fill=color)

def create_logo():
    # Load the base Freemason logo (with G already erased or masked)
    base = Image.open('freemason_base.png').convert('RGBA')
    width, height = base.size

    # Create an overlay for the snowflake
    overlay = Image.new('RGBA', base.size, (0,0,0,0))
    draw = ImageDraw.Draw(overlay)

    # Draw a dot-style blue snowflake at the center
    center = (width//2, height//2)
    snowflake_size = int(min(width, height) * 0.13)
    blue = (0, 150, 255, 230)
    draw_dot_snowflake(draw, center, snowflake_size, blue, width=18)

    # Merge overlay with base
    result = Image.alpha_composite(base, overlay)
    result = result.convert('RGB')
    result.save('company_logo.png')
    print("Logo has been created as 'company_logo.png'")

if __name__ == "__main__":
    create_logo() 