"""Verify the reviewed rotation groups against their source artwork.

Run from the repository root: python tests/test_mosaico_alignment.py
Requires Pillow and NumPy.
"""
import json
import math
from pathlib import Path
import unittest

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PIECES = json.loads((ROOT / 'mosaico/pieces.json').read_text())['pieces']


def pixels(piece):
    return np.asarray(Image.open(ROOT / 'mosaico/peças' / piece['file']).convert('RGBA'), dtype=float) / 255


class RotationAlignmentTests(unittest.TestCase):
    def test_artwork_matches_after_rotation_and_translation(self):
        for group in ([147, 149, 152, 154], [148, 150, 151, 153], [104, 105, 113, 114], [103, 108, 109, 110], [106, 107, 111, 112], [115, 116, 117, 118], [119, 120, 121, 122], [123, 124, 125, 126]):
            for source_id in group:
                source = PIECES[source_id - 1]
                self.assertEqual(sorted(set(sum(source['matches'], []))), sorted(group))
                for rotation, targets in enumerate(source['matches']):
                    for target_id in targets:
                        with self.subTest(source=source_id, target=target_id, degrees=rotation * 45):
                            self.assertEqual(rotation % 2, 0)
                            a = np.rot90(pixels(source), -rotation // 2)
                            b = pixels(PIECES[target_id - 1])
                            offset = source['placementOffsets'][rotation][str(target_id)]
                            dx, dy = offset['x'], offset['y']
                            left, top = min(dx, 0), min(dy, 0)
                            right = max(dx + a.shape[1], b.shape[1])
                            bottom = max(dy + a.shape[0], b.shape[0])
                            aligned_a = np.zeros((bottom - top, right - left, 4))
                            aligned_b = np.zeros_like(aligned_a)
                            aligned_a[dy-top:dy-top+a.shape[0], dx-left:dx-left+a.shape[1]] = a
                            aligned_b[-top:-top+b.shape[0], -left:-left+b.shape[1]] = b
                            union = np.maximum(aligned_a[:, :, 3], aligned_b[:, :, 3]).sum()
                            overlap = np.minimum(aligned_a[:, :, 3], aligned_b[:, :, 3]).sum() / union
                            rgb_error = np.abs(aligned_a[:, :, :3] * aligned_a[:, :, 3:] - aligned_b[:, :, :3] * aligned_b[:, :, 3:]).sum() / (3 * union)
                            # Piece 152 has slightly cropped tips; the remaining artwork must align.
                            self.assertGreater(overlap, .98)
                            self.assertLess(rgb_error, .006 if source_id >= 147 else .01)

    def test_reviewed_groups_with_diagonal_rasterization(self):
        for group in ([53,54,55,56,57,58,59,60], [21,22,23,24,25,26,27,28], [61,62,64,67,70,72,74,76],
                      [63,65,66,68,69,71,73,75], [77,78,79,80,81,82,83,84],
                      [85,87,90,92,94,96,97,99], [86,88,89,91,93,95,98,100],
                      [135,137,140,142], [136,138,139,141],
                      [167,169,172,174], [168,170,171,173], [175,178,180,182]):
            for source_id in group:
                source = PIECES[source_id - 1]
                self.assertEqual(sorted(set(sum(source['matches'], []))), list(group))
                for r, targets in enumerate(source['matches']):
                    for target_id in targets:
                        with self.subTest(source=source_id, target=target_id, degrees=r * 45):
                            image = Image.open(ROOT / 'mosaico/peças' / source['file']).convert('RGBA')
                            angle = r * math.pi / 4
                            c, sn = math.cos(angle), math.sin(angle)
                            w = math.ceil(abs(image.width*c) + abs(image.height*sn) - 1e-8)
                            h = math.ceil(abs(image.width*sn) + abs(image.height*c) - 1e-8)
                            # Same center and bounding box as Canvas rendering; do not scale or reflect.
                            image = image.transform((w, h), Image.Transform.AFFINE,
                                (c, sn, image.width/2-c*w/2-sn*h/2,
                                 -sn, c, image.height/2+sn*w/2-c*h/2), Image.Resampling.BICUBIC)
                            a = np.asarray(image, dtype=float) / 255
                            b = pixels(PIECES[target_id - 1])
                            offset = source['placementOffsets'][r][str(target_id)]
                            dx, dy = offset['x'], offset['y']
                            left, top = min(dx, 0), min(dy, 0)
                            right, bottom = max(dx+w, b.shape[1]), max(dy+h, b.shape[0])
                            aa = np.zeros((bottom-top, right-left, 4))
                            bb = np.zeros_like(aa)
                            aa[dy-top:dy-top+h, dx-left:dx-left+w] = a
                            bb[-top:-top+b.shape[0], -left:-left+b.shape[1]] = b
                            # Smooth only to compare exported antialiasing at 45 degrees.
                            # Premultiply first so invisible RGB pixels cannot affect the comparison.
                            for array in (aa, bb):
                                array[:, :, :3] *= array[:, :, 3:]
                            aa = np.asarray(Image.fromarray(np.uint8(np.round(aa*255))).filter(ImageFilter.GaussianBlur(2)), dtype=float)/255
                            bb = np.asarray(Image.fromarray(np.uint8(np.round(bb*255))).filter(ImageFilter.GaussianBlur(2)), dtype=float)/255
                            union = np.maximum(aa[:, :, 3], bb[:, :, 3]).sum()
                            overlap = np.minimum(aa[:, :, 3], bb[:, :, 3]).sum()/union
                            error = np.abs(aa[:, :, :3]-bb[:, :, :3]).sum()/(3*union)
                            self.assertGreater(overlap, .9)
                            self.assertLess(error, .045 if 53 <= source_id <= 60 else .04)

    def test_finished_compositions_against_reference(self):
        reference = Image.open(ROOT / 'mosaico/mosaico_ref.png').convert('RGBA')
        board = Image.open(ROOT / 'mosaico/background.png').convert('RGBA')
        images = {p['id']: Image.open(ROOT / 'mosaico/peças' / p['file']).convert('RGBA') for p in PIECES}
        complete = board.copy()
        for p in PIECES:
            complete.alpha_composite(images[p['id']], (p['x'], p['y']))
        difference = np.abs(np.asarray(complete, dtype=float)[:, :, :3] - np.asarray(reference, dtype=float)[:, :, :3]).mean()
        self.assertLess(difference, .1, 'Original piece positions must reconstruct the reference')
        for source_id in list(range(45, 61)) + list(range(77, 85)):
            source = PIECES[source_id-1]
            for r, targets in enumerate(source['matches']):
                im = images[source_id]
                angle = r*math.pi/4
                c, sn = math.cos(angle), math.sin(angle)
                w = math.ceil(abs(im.width*c)+abs(im.height*sn)-1e-8)
                h = math.ceil(abs(im.width*sn)+abs(im.height*c)-1e-8)
                turned = im.transform((w,h), Image.Transform.AFFINE,
                    (c,sn,im.width/2-c*w/2-sn*h/2,-sn,c,im.height/2+sn*w/2-c*h/2), Image.Resampling.BICUBIC)
                for target_id in targets:
                    with self.subTest(source=source_id, target=target_id, degrees=r*45):
                        target = PIECES[target_id-1]
                        offset = source['placementOffsets'][r][str(target_id)]
                        x, y = target['x']+offset['x'], target['y']+offset['y']
                        actual = board.copy()
                        for p in PIECES:
                            actual.alpha_composite(turned if p['id']==target_id else images[p['id']],
                                (x,y) if p['id']==target_id else (p['x'],p['y']))
                        box = (min(x,target['x'])-4,min(y,target['y'])-4,
                               max(x+w,target['x']+target['width'])+4,max(y+h,target['y']+target['height'])+4)
                        a = np.asarray(actual.crop(box).filter(ImageFilter.GaussianBlur(1.5)),dtype=float)[:,:,:3]/255
                        b = np.asarray(reference.crop(box).filter(ImageFilter.GaussianBlur(1.5)),dtype=float)[:,:,:3]/255
                        area = np.asarray(images[target_id])[:,:,3].sum()/255
                        # Exported diagonal versions of 53–60 have visibly different edge smoothing.
                        self.assertLess(np.abs(a-b).sum()/(3*area), .055 if 53 <= source_id <= 60 else .025,
                            'Swapped artwork must remain aligned with the reference and neighboring pieces')


if __name__ == '__main__':
    unittest.main()
