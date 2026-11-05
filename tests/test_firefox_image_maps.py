"""Exercise real Firefox hit testing, not synthetic clicks on known SVG nodes."""
import functools
import http.server
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.service import Service

ROOT = Path(__file__).resolve().parents[1]
PROBE = Path(__file__).with_name("image-map-probe.js").read_text()
POSITION = """
const image = document.querySelector('.image-map-targets').previousElementSibling;
let rect = image.getBoundingClientRect();
const x = arguments[0].x * rect.width / image.clientWidth;
const y = arguments[0].y * rect.height / image.clientHeight;
if (arguments[1]) scrollBy(rect.left + x - 500, rect.top + y - 350);
rect = image.getBoundingClientRect();
return {x: rect.left + x, y: rect.top + y};
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class FirefoxImageMaps(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.addClassCleanup(cls.server.server_close)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.addClassCleanup(cls.server.shutdown)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}/"
        options = webdriver.FirefoxOptions()
        options.add_argument("-headless")
        if os.environ.get("FIREFOX_BINARY"):
            options.binary_location = os.environ["FIREFOX_BINARY"]
        cls.log = tempfile.TemporaryFile(mode="w+")
        cls.addClassCleanup(cls.log.close)
        service = Service(executable_path=os.environ.get("GECKODRIVER"), log_output=cls.log)
        cls.driver = webdriver.Firefox(service=service, options=options)
        cls.addClassCleanup(cls.driver.quit)
        cls.driver.set_window_size(1280, 900)

    def prepare(self, path):
        self.driver.get(self.base + path)
        if path.startswith("yaga/"):
            time.sleep(1.1)  # The game's audio warning opens after one second.
            self.driver.find_element(By.ID, "ambienceWarningClose").click()
        self.driver.execute_script("document.querySelector('#wordMenu').style.display='none'")

    def check_targets(self):
        driver = self.driver
        driver.execute_script("""
            window.auditHits = [];
            document.querySelectorAll('map area').forEach((area, index) =>
              area.addEventListener('click', () => window.auditHits.push(index)));
        """)
        total = len(driver.find_elements(By.CSS_SELECTOR, "map area"))
        self.assertGreater(total, 0)
        self.assertEqual(total, len(driver.find_elements(By.CSS_SELECTOR, ".image-map-targets > *")))
        self.assertTrue(driver.execute_script("""
            const image = document.querySelector('.image-map-targets').previousElementSibling;
            return image.complete && image.naturalWidth > 0;
        """), "The puzzle image must load")
        for zoom in (0.7, 1.4):
            driver.execute_script("document.querySelector('.container').style.zoom=arguments[0]", zoom)
            for index in range(total):
                with self.subTest(zoom=zoom, area=index):
                    point = driver.execute_script(PROBE, index)
                    self.assertIsNotNone(point)
                    driver.execute_script(POSITION, point, True)
                    time.sleep(0.025)
                    position = driver.execute_script(POSITION, point, False)
                    actions = ActionChains(driver, duration=0)
                    actions.w3c_actions.pointer_action.move_to_location(position["x"], position["y"])
                    # Mark and unmark: do not let the completion dialog obscure later clicks.
                    for _ in range(2):
                        actions.click().perform()
                        self.assertEqual(driver.execute_script("return window.auditHits.splice(0)"),
                                         [point["expected"]])

    def test_all_puzzles(self):
        paths = sorted(path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*.html")
                       if "../shared/image-map-targets.js" in path.read_text())
        self.assertGreaterEqual(len(paths), 15)
        for path in paths:
            with self.subTest(puzzle=path):
                self.prepare(path)
                self.check_targets()

    def test_celtic_rebuilds_map_for_second_level(self):
        self.prepare("celtic/index.html")
        first_count = len(self.driver.find_elements(By.CSS_SELECTOR, "map area"))
        self.driver.execute_script("unlockLevel('nivel2');setCurrentLevel('nivel2')")
        self.assertNotEqual(first_count, len(self.driver.find_elements(By.CSS_SELECTOR, "map area")))
        self.check_targets()

    def test_keyboard_and_saved_progress(self):
        self.prepare("losgatos/index.html")
        self.driver.execute_script("localStorage.removeItem('losgatosPuzzleProgress')")
        self.prepare("losgatos/index.html")
        selector = '.image-map-targets [aria-label="Elemento escondido 1"]'
        self.driver.find_element(By.CSS_SELECTOR, selector).send_keys(Keys.ENTER)
        self.assertEqual(self.driver.find_element(By.ID, "counter").get_attribute("textContent"), "1 / 26")
        self.driver.refresh()
        self.assertEqual(self.driver.find_element(By.ID, "counter").get_attribute("textContent"), "1 / 26")
        self.driver.find_element(By.CSS_SELECTOR, selector).send_keys(Keys.SPACE)
        self.assertEqual(self.driver.find_element(By.ID, "counter").get_attribute("textContent"), "0 / 26")


if __name__ == "__main__":
    unittest.main(verbosity=2)
