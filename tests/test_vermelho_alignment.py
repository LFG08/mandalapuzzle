"""Verify the reviewed 147–154 rotation groups against their source artwork.

Run from the repository root: python tests/test_vermelho_alignment.py
Requires Pillow and NumPy.
"""
import json
from pathlib import Path
import unittest

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PIECES = json.loads((ROOT / 'vermelho/pieces.json').read_text())['pieces']


def pixels(piece):
    return np.asarray(Image.open(ROOT / 'vermelho/peças' / piece['file']).convert('RGBA'), dtype=float) / 255


class RotationAlignmentTests(unittest.TestCase):
    def test_artwork_matches_after_rotation_and_translation(self):
        for group in ([147, 149, 152, 154], [148, 150, 151, 153]):
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
                            self.assertLess(rgb_error, .006)


if __name__ == '__main__':
    unittest.main()
