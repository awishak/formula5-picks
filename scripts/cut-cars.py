"""Cut the studio background off every car render with u2net.

Reads the source PNGs in hedra_assets_2026-10-05 through the same index to
team code map used for public/cars, writes public/cars/<CODE>-<view>.png as a
transparent cutout cropped to the car and scaled to 800 wide.

  python3 cut.py <project> <model.onnx> <files.txt>
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

project, model_path, files_txt = sys.argv[1:4]
files = open(files_txt).read().split()
MAP = ("00:MKR:top 03:MKR:side 01:TNT:side 32:TNT:top 02:EBR:side 21:EBR:top 04:WLD:top 06:WLD:side "
       "05:PEL:side 13:PEL:top 07:TJP:side 14:TJP:top 08:STL:side 18:STL:top 09:AGS:side 44:AGS:top "
       "10:ISK:side 46:ISK:top 11:CSC:top 19:CSC:side 12:LUX:side 25:LUX:top 15:XRT:top 23:XRT:side "
       "16:SHO:top 17:SHO:side 20:VAN:side 40:VAN:top 22:HWT:side 47:HWT:top 24:MEA:top 26:MEA:side "
       "27:CAR:side 43:CAR:top 28:JSV:top 29:JSV:side 30:BRO:side 38:BRO:top 31:TEX:top 39:TEX:side "
       "33:GAR:top 35:GAR:side 34:PRS:top 45:PRS:side 36:ECR:top 37:ECR:side 41:COU:side 42:COU:top").split()

sess = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0].name
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def mask_of(im):
    small = im.convert("RGB").resize((320, 320), Image.BILINEAR)
    a = np.asarray(small, dtype=np.float32) / 255.0
    a = (a - MEAN) / STD
    a = a.transpose(2, 0, 1)[None]
    out = sess.run(None, {inp: a})[0][0, 0]
    out = (out - out.min()) / max(1e-6, out.max() - out.min())
    m = Image.fromarray((out * 255).astype(np.uint8)).resize(im.size, Image.BILINEAR)
    return m

out_dir = os.path.join(project, "public", "cars")
n = 0
for entry in MAP:
    i, code, view = entry.split(":")
    src = os.path.join(project, files[int(i)]) if not files[int(i)].startswith("/") else files[int(i)]
    im = Image.open(src).convert("RGBA")
    m = mask_of(im)
    # Firm up the edge: the studio floor reflection comes out as a faint grey
    # halo at 30 to 60, so anything under 70 goes, and the rest is stretched.
    arr = np.asarray(m, dtype=np.float32)
    arr = np.clip((arr - 70) / (200 - 70), 0, 1) * 255
    m = Image.fromarray(arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(m)
    bbox = m.point(lambda v: 255 if v > 24 else 0).getbbox()
    if bbox:
        pad = 8
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
        im = im.crop(bbox)
    w = 800
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(out_dir, f"{code}-{view}.png"), optimize=True)
    n += 1
    print(code, view, im.size, flush=True)
print(n, "cutouts")
