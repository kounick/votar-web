#!/usr/bin/env python3
"""Convertit une photo (webp, jpg, png...) en pixels bruts RGBA + dimensions.

Usage : to_rgba.py photo.webp sortie.rgba
Affiche "largeur hauteur" sur la sortie standard.
Les pixels sont écrits R,G,B,A octet par octet, de haut en bas, comme le
Bitmap ARGB_8888 d'Android et comme le canvas d'un navigateur.
"""
import sys
from PIL import Image, ImageOps

src, dst = sys.argv[1], sys.argv[2]
img = ImageOps.exif_transpose(Image.open(src)).convert("RGBA")
with open(dst, "wb") as f:
    f.write(img.tobytes())
print(img.width, img.height)
