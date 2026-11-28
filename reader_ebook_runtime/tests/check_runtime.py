#!/usr/bin/env python3
"""Check shared DOM behavior in a host Chromium. Platform WebViews run separate journeys."""

from pathlib import Path
import argparse
import hashlib
import json
import unicodedata
from xml.etree import ElementTree
from zipfile import ZipFile

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://reader-ui-test.invalid"
ENTRY = "EPUB/text/trail.xhtml"
IMAGE = "EPUB/images/path.png"
CAPTURED_TEXT = "𠀀与Café"


def fixture(core_projection=None):
    archive_path = ROOT / "fixtures" / "m1-window.epub"
    with ZipFile(archive_path) as archive:
        xhtml = archive.read(ENTRY).decode("utf-8")
        image = archive.read(IMAGE)
    document = ElementTree.fromstring(xhtml)
    ns = {"x": "http://www.w3.org/1999/xhtml"}
    chapter_one, chapter_two = document.findall(".//x:body/x:section", ns)

    # This local DOM check supplies a canonical projection fixture. Native
    # journeys use their actual Core descriptor and never synthesize this.
    def text(element):
        return "".join(element.itertext())

    def paragraphs(section):
        rows = []
        for element in section:
            if element.tag.endswith("}figure"):
                rows.extend(("\ufffc", text(element.find("x:figcaption", ns))))
            else:
                rows.append(text(element))
        return "\n\n".join(rows)

    first, second = map(paragraphs, (chapter_one, chapter_two))
    chapter_start = len(first) + 2
    canonical = first + "\n\n" + second
    config = {
        "session": "reader-session",
        "documentId": "chapter-two",
        "layoutGeneration": 1,
        "entryPath": ENTRY,
        "documentCanonicalContent": canonical,
        "chapterStartScalar": chapter_start,
        "chapterEndScalar": len(canonical),
        "content": second,
        "scalarCount": len(second),
        "xhtml": xhtml,
        "anchor": second.index(CAPTURED_TEXT),
        "style": {"fontSize": 18, "lineHeight": 35.28},
    }
    first_config = dict(config, documentId="chapter-one", chapterStartScalar=0,
                        chapterEndScalar=len(first), content=first, scalarCount=len(first), anchor=0)
    if core_projection:
        observed = json.loads(Path(core_projection).read_text(encoding="utf-8"))
        assert observed["epubSha256"] == hashlib.sha256(archive_path.read_bytes()).hexdigest()
        for chapter_index, target in enumerate((first_config, config)):
            projection = observed["chapters"][chapter_index]
            descriptor, chapter = projection["presentation"], projection["chapter"]
            assert descriptor["entryPath"] == ENTRY and descriptor["chapterIndex"] == chapter_index
            for field in ("documentCanonicalContent", "chapterStartScalar", "chapterEndScalar"):
                target[field] = descriptor[field]
            target["content"] = chapter["content"]
            target["scalarCount"] = len(target["content"])
            target["anchor"] = (target["content"].index(CAPTURED_TEXT) if chapter_index else
                                next(index for index, character in enumerate(target["content"]) if not character.isspace()))
        assert first_config["documentCanonicalContent"] == config["documentCanonicalContent"]
    return first_config, config, image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser-executable")
    parser.add_argument("--core-projection", help="optional paired Core ABI capture for this exact EPUB")
    args = parser.parse_args()
    first_config, config, image = fixture(args.core_projection)
    expected_start = config["anchor"]
    expected_end = expected_start + len(CAPTURED_TEXT)
    assert len(unicodedata.normalize("NFC", CAPTURED_TEXT)) < len(CAPTURED_TEXT)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=args.browser_executable)
        try:
            page = browser.new_page(viewport={"width": 390, "height": 844})

            def serve(route):
                url = route.request.url
                if url == ORIGIN + "/shell.html":
                    return route.fulfill(path=ROOT / "shell.html", content_type="text/html")
                if url == ORIGIN + "/publication/" + IMAGE:
                    return route.fulfill(body=image, content_type="image/png")
                return route.abort()

            page.route("**/*", serve)
            page.goto(ORIGIN + "/shell.html")
            page.add_script_tag(path=ROOT / "reader-ebook-dom.js")
            page.add_script_tag(path=ROOT / "reader-ebook-runtime.js")
            page.evaluate("""origin => {
              window.events = [];
              window.adapter = {
                resourceCSPSource: origin,
                resourceURL: path => origin + '/publication/' + path.split('/').map(encodeURIComponent).join('/'),
                postMessage: event => window.events.push(event)
              };
            }""", ORIGIN)
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", first_config)
            first_frame = page.frame_locator("iframe")
            assert first_frame.get_by_role("heading", name="第一章 雨后").count() == 1, page.evaluate("events")
            assert first_frame.get_by_text("第二章 石径", exact=True).count() == 0
            assert page.evaluate("events.at(-1).value.loadedImageCount") == 0
            print("PASS first and second windows share one canonical XHTML document")

            # The paired Core first chapter has a terminal structural newline.
            if first_config["content"].endswith("\n"):
                tail = first_config["scalarCount"] - 1
                assert page.evaluate("scalar => ReaderEbookRuntime.restore(scalar).scalar", tail) == tail - 1
                print("PASS paired Core trailing newline restores its final visible scalar")

            indent_chapter = "\u3000\u3000第一段\n\n第二段\u3000"
            indented = dict(first_config, documentId="indented", content=indent_chapter,
                            documentCanonicalContent=indent_chapter, chapterStartScalar=0,
                            scalarCount=len(indent_chapter), chapterEndScalar=len(indent_chapter), anchor=0,
                            xhtml="<p>\u3000\u3000第一段</p><p>第二段\u3000</p>")
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", indented)
            verify_ready(page.evaluate("events"), 2, 1, image_count=0)
            assert page.evaluate("ReaderEbookRuntime.position().scalar") == 2
            print("PASS opening at scalar 0 before fullwidth indentation reports actual scalar 2")

            assert page.evaluate("ReaderEbookRuntime.restore(5).scalar") == 7
            assert page.evaluate("ReaderEbookRuntime.restore(10).scalar") == 9
            assert page.evaluate("ReaderEbookRuntime.position().scalar") == 9
            assert page.evaluate("ReaderEbookRuntime.restore(11)") is None
            print("PASS paragraph separator restores forward and in-range trailing whitespace restores backward")

            empty_whitespace = dict(indented, documentId="empty-whitespace", xhtml="<p>\u3000</p>",
                                    content="\u3000", documentCanonicalContent="\u3000", scalarCount=1,
                                    chapterEndScalar=1)
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", empty_whitespace)
            assert page.evaluate("events.at(-1).value.code") == "EMPTY_CHAPTER_WINDOW"
            assert page.evaluate("ReaderEbookRuntime.position()") is None
            print("PASS opening an all-whitespace window remains explicitly unavailable")

            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", config)
            events = page.evaluate("events")
            verify_ready(events, expected_start, 1)

            frame = page.frame_locator("iframe")
            assert frame.get_by_text("第一章 雨后", exact=True).count() == 0
            assert frame.get_by_role("heading", name="第二章 石径").count() == 1
            assert frame.locator("img").evaluate("(image) => image.naturalWidth") == 96
            assert 0.73 < frame.locator("img").evaluate("(image) => image.offsetWidth / image.parentElement.clientWidth") < 0.77
            image_scalar = config["content"].index("\ufffc")
            assert config["content"].count("\ufffc") == 1
            assert page.evaluate("scalar => ReaderEbookRuntime.select(scalar, scalar + 1)", image_scalar) == {
                "startScalar": image_scalar, "endScalar": image_scalar + 1}
            print("PASS publication image occupies one selectable scalar with author width")

            selection = page.evaluate("([a, b]) => ReaderEbookRuntime.select(a, b)", [expected_start, expected_end])
            assert selection == {"startScalar": expected_start, "endScalar": expected_end}
            assert frame.locator("body").evaluate("body => body.ownerDocument.getSelection().toString()") == CAPTURED_TEXT
            assert page.evaluate("ReaderEbookRuntime.selection()") == selection
            print("PASS UTF-16 selection endpoints round-trip mixed Chinese, a supplementary scalar and a combining mark")

            page.evaluate("ReaderEbookRuntime.reflow('reader-session', 'chapter-two', 2, {fontSize: 23, lineHeight: 45})")
            verify_ready(page.evaluate("events"), expected_start, 2)
            reading = page.evaluate("ReaderEbookRuntime.position()")
            assert reading["scalar"] == expected_start
            assert reading["text"] == CAPTURED_TEXT[0]
            print("PASS actual font-size reflow retains the same visible nonzero scalar")

            # Retiring the first document leaves the second document and its
            # current generation available through new layout callbacks.
            reopened = dict(config, documentId="cold-open", layoutGeneration=3)
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", reopened)
            page.evaluate("ReaderEbookRuntime.retire('reader-session', 'chapter-two')")
            events = page.evaluate("events")
            verify_ready(events, expected_start, 3)
            assert page.evaluate("ReaderEbookRuntime.position().scalar") == expected_start

            before = page.evaluate("events.length")
            separator = config["content"].index("\n\n")
            page.evaluate("""async separator => {
                const first = ReaderEbookRuntime.reflow('reader-session', 'cold-open', 4, {fontSize: 19});
                const second = ReaderEbookRuntime.reflow('reader-session', 'cold-open', 5, {fontSize: 26}, separator);
                await Promise.all([first, second]);
            }""", separator)
            updates = page.evaluate("before => events.slice(before)", before)
            assert updates and all(event["layoutGeneration"] == 5 for event in updates), updates
            verify_ready(updates, separator + 2, 5)
            assert frame.locator("body").evaluate("body => getComputedStyle(body).fontSize") == "26px"

            before = page.evaluate("events.length")
            page.evaluate("""async input => {
                const stale = ReaderEbookRuntime.open({...input, documentId: 'superseded'}, adapter);
                const current = ReaderEbookRuntime.open({...input, documentId: 'current'}, adapter);
                await Promise.all([stale, current]);
                await ReaderEbookRuntime.reflow('reader-session', 'superseded', 9, {fontSize: 60});
                ReaderEbookRuntime.retire('reader-session', 'superseded');
            }""", config)
            updates = page.evaluate("before => events.slice(before)", before)
            assert updates and all(event["documentId"] == "current" for event in updates), updates
            assert page.evaluate("ReaderEbookRuntime.position().scalar") == expected_start
            print("PASS stale document, asynchronous layout, reflow and retire callbacks cannot update the current page")

            whitespace = config["content"].index("第二章 石径") + len("第二章")
            assert page.evaluate("scalar => ReaderEbookRuntime.restore(scalar).scalar", whitespace) == whitespace + 1
            assert page.evaluate("scalar => ReaderEbookRuntime.restore(scalar)", config["scalarCount"]) is None
            for invalid in (-1, 2.5, config["scalarCount"] + 1):
                assert page.evaluate("""scalar => {
                  try { ReaderEbookRuntime.restore(scalar); } catch (error) { return error.message; }
                }""", invalid) == "INVALID_SCALAR_COORDINATE"
            assert page.evaluate("ReaderEbookRuntime.position().scalar") == whitespace + 1
            print("PASS inline whitespace restores forward and terminal, out-of-range or illegal coordinates are rejected")

            wrong_window = dict(config, documentId="wrong-window", chapterStartScalar=config["chapterStartScalar"] + 1)
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", wrong_window)
            failure = page.evaluate("events.at(-1)")
            assert failure["documentId"] == "wrong-window"
            assert failure["kind"] == "failure"
            assert failure["value"]["code"] == "CORE_PROCESSED_MAPPING_UNPROVEN"
            assert page.evaluate("ReaderEbookRuntime.position()") is None
            print("PASS changed chapter window is explicitly unavailable")

            wrong_original = dict(config, documentId="wrong-original", xhtml=config["xhtml"].replace("第一章 雨后", "第一章 雨前"))
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", wrong_original)
            assert page.evaluate("events.at(-1).value.code") == "DOCUMENT_CANONICAL_MISMATCH"
            wrong_whitespace = dict(config, documentId="wrong-whitespace",
                                    xhtml=config["xhtml"].replace(CAPTURED_TEXT, "𠀀 与Café", 1))
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", wrong_whitespace)
            assert page.evaluate("events.at(-1).value.code") == "DOCUMENT_CANONICAL_MISMATCH"
            assert page.evaluate("ReaderEbookRuntime.position()") is None
            print("PASS changed letters and inserted inline whitespace fail canonical validation")

            scripted_source = dict(config, documentId="scripted-source", xhtml=config["xhtml"].replace(
                "<body>", "<body onload='parent.executed = true'><script>parent.executed = true</script>"
            ))
            page.evaluate("input => ReaderEbookRuntime.open(input, adapter)", scripted_source)
            verify_ready(page.evaluate("events"), expected_start, 1)
            assert page.evaluate("window.executed") is None
            print("PASS source scripts and event attributes remain inert")

            print(json.dumps({
                "scope": "host Chromium shared DOM",
                "projection": "Core C ABI capture" if args.core_projection else "independent synthetic fixture",
                "chapterStartScalar": config["chapterStartScalar"],
                "chapterEndScalar": config["chapterEndScalar"],
                "selection": selection,
                "reflowedPosition": reading,
                "imageIntrinsicWidth": 96,
            }, ensure_ascii=False))
        finally:
            browser.close()


def verify_ready(events, expected_start, generation, image_count=1):
    ready = events[-1]
    assert ready["kind"] == "ready", events
    assert ready["layoutGeneration"] == generation
    assert ready["value"]["loadedImageCount"] == image_count
    assert ready["value"]["scalar"] == expected_start
    assert ready["value"]["rect"]["height"] > 0


if __name__ == "__main__":
    main()
