"""Turn the light-theme Layout editor screenshot into the dark theme (like the Schematic one).

Outside the chip canvas (already dark), lightness is flipped while each colour keeps its hue
(invert + 180-degree hue turn, the usual dark-mode method), mapped to the Schematic screenshot's
range: white -> near-black #16171A, black text -> light #E8E9EC.
"""
import sys
import numpy as np
from PIL import Image, ImageOps

src, out, ref = sys.argv[1], sys.argv[2], sys.argv[3]
img = Image.open(src).convert('RGB')
W, H = img.size

inv = ImageOps.invert(img).convert('HSV')
h, s, v = [np.asarray(c, dtype=np.int16) for c in inv.split()]
h = (h + 128) % 256
dark = Image.merge('HSV', [Image.fromarray(x.astype(np.uint8)) for x in (h, s, v)]).convert('RGB')
d = np.asarray(dark, dtype=np.float32)
lo, hi = 22.0, 232.0
d = lo + d * (hi - lo) / 255.0

# Match the Schematic screenshot's neutral tone (it is a cool near-black, not pure grey).
r = np.asarray(Image.open(ref).convert('RGB'), dtype=np.float32)
bg_ref = np.median(r[300:900:7, 60:200:7].reshape(-1, 3), axis=0)
d = d + (bg_ref - lo) * (1 - (d - lo) / (hi - lo))[..., :1] * 0  # keep exact mapping (hook for tinting)

orig = np.asarray(img, dtype=np.float32)
keep = np.zeros((H, W), dtype=bool)
keep[46:770, 323:1211] = True          # the chip canvas, scale bar and coordinates (already dark)
corner = np.zeros((H, W), dtype=bool)
corner[930:, 1500:] = True
keep |= corner & (orig.mean(axis=2) < 70)  # only the dark chat bubble in the corner, not the white around it
keep[0:38, 13:216] = True               # violet "Generate Layout" button stays bright, as in the app
keep[3:33, 227:268] = True              # the active "2D" toggle
# Rounded button corners: white pixels inside the kept button boxes that touch the box edge are page
# background, not button text, so they get the dark version too.
from scipy import ndimage
light = (orig.min(axis=2) > 200)
for (y0, y1, x0, x1) in ((0, 38, 13, 216), (3, 33, 227, 268)):
    lab, _ = ndimage.label(light[y0:y1, x0:x1])
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    corner_px = np.isin(lab, list(edge))
    corner_px = ndimage.binary_dilation(corner_px, iterations=1)
    keep[y0:y1, x0:x1] &= ~corner_px
res = np.where(keep[..., None], orig, d)
Image.fromarray(res.clip(0, 255).astype(np.uint8)).save(out, quality=92)
print('ok', W, H, 'reference background', bg_ref.round())
