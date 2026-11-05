# Firefox image-map regression checks

Requires Python 3, Selenium 4, Firefox, and geckodriver. Install Selenium in a separate virtual environment; the site itself has no package dependencies:

```sh
python3 -m venv /tmp/mandalapuzzle-tests
/tmp/mandalapuzzle-tests/bin/pip install 'selenium>=4,<5'
/tmp/mandalapuzzle-tests/bin/python tests/test_firefox_image_maps.py
```

If Firefox or geckodriver are outside the normal search path, set `FIREFOX_BINARY` and `GECKODRIVER` to their executable paths for the test command.

The suite starts a temporary local HTTP server and uses a disposable browser profile. It checks actual pointer hit testing for every area at 70% and 140% CSS zoom, verifies the puzzle images load, changes Celtic levels, and exercises keyboard selection and saved progress. Overlapping areas retain the original image map's first-area priority.
