"""Cut the studio background off the car renders by flood fill from the edge.

u2net at 320px took the thin parts (wings, wheels) for background. The studio
is a near-white grey with almost no colour, so anything bright, colourless,
smooth and connected to the edge of the frame is background, and everything
else, however thin, stays.
"""
import sys, glob, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

src_dir, out_dir = sys.argv[1:3]
for f in sorted(glob.glob(os.path.join(src_dir, "*.jpg"))):
    im = Image.open(f).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    L = a.mean(2); C = a.max(2) - a.min(2)
    g = np.hypot(ndi.sobel(L, 0), ndi.sobel(L, 1)) / 8
    cand = (((C < 20) & (L > 120)) | ((C < 40) & (L > 185))) & (g < 6)
    lab, _ = ndi.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # The seams the gradient test leaves between background regions.
    bg = ndi.binary_closing(bg, iterations=2) | bg
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)
    # Drop specks: keep components of a real size.
    lab2, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab2, range(1, n + 1))
    fg = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= 0.05 * sizes.max()])
    m = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert("RGBA"); rgba.putalpha(m)
    bbox = m.point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 8
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    rgba = rgba.crop(bbox)
    rgba.save(os.path.join(out_dir, os.path.basename(f)[:-4] + ".png"), optimize=True)
