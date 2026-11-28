#!/usr/bin/env python3
"""Generate the deterministic, author-owned M1 illustrated EPUB fixture."""

import argparse
import io
from pathlib import Path
import struct
from zipfile import ZipFile, ZipInfo
import zlib


CHAPTER_TITLES = ("第一章 雨后", "第二章 石径")
SELECTION = "𠀀与Café"
XHTML = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh">
<head><title>山径读本</title><style>.illustration { width: 75%%; }</style></head>
<body><section id="chapter-one"><h1>第一章 雨后</h1>
<p>晨雨过后，石阶的缝里留着细小的水珠。山门外有一棵梧桐，叶间仍然滴水。</p>
<p>她把行囊放在廊下，听完一阵鸟鸣才起身。</p></section>
<section id="chapter-two"><h1>第二章 石径</h1>
<p>绕过门前的旧井，石径向北。她在纸上记下<em>𠀀与Café</em>两个标记。</p>
<figure><img class="illustration" src="../images/path.png" alt="山径与松林" />
<figcaption>一条穿过松林的石径</figcaption></figure>
%s
</section></body></html>
"""
PARAGRAPHS = (
    "山腰响起了午钟。石径的背面有光，贴近岩石时还能感到一阵湿凉。",
    "转过干涸的水沟就能看见一座小亭，亭顶积着去年的松针。风来时只有一角轻响。",
    "远处炊烟缓缓升起。她沿路记下树的位置，回头时已经看不见入口。",
    "溪水漫过浅处的石块。她横穿过去，把鞋放在阳光下，等到水声远了才继续走。",
    "远处的白墙被云遮住，墙后的灯一盏一盏亮了。她决定今天就在这里停下。",
    "记事本最后一页空着。她捡来一片松针夹在纸里，又把剩下的路画成一条细线。",
) * 4


def chunk(kind, data):
    return (
        struct.pack(">I", len(data)) + kind + data
        + struct.pack(">I", zlib.crc32(kind + data))
    )


def illustration_png():
    width, height = 96, 64
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            horizon = 24 - abs(x - 42) // 5
            if y < horizon:
                color = (219, 232, 207)
            elif y > 25 and abs(x - (68 - (y - 25) // 2)) < 2 + (y - 25) // 6:
                color = (210, 183, 138)
            else:
                color = (35 + y, 73 + (x + y) % 35, 54 + x % 25)
            rows.extend(color)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, level=0))
        + chunk(b"IEND", b"")
    )


def fixture_bytes():
    container = """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
</rootfiles></container>"""
    package = """<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="id">urn:reader:fixture:m1-window</dc:identifier>
<dc:title>山径读本</dc:title><dc:creator>Reader</dc:creator><dc:language>zh</dc:language>
<meta property="dcterms:modified">2026-11-27T00:00:00Z</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>
<item id="trail" href="text/trail.xhtml" media-type="application/xhtml+xml"/>
<item id="path" href="images/path.png" media-type="image/png"/></manifest>
<spine><itemref idref="trail"/></spine></package>"""
    nav = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title></head><body><nav epub:type="toc"><ol>
<li><a href="text/trail.xhtml#chapter-one">第一章 雨后</a></li>
<li><a href="text/trail.xhtml#chapter-two">第二章 石径</a></li>
</ol></nav></body></html>"""
    archive = io.BytesIO()
    with ZipFile(archive, "w") as epub:
        for path, payload in (
            ("mimetype", "application/epub+zip"),
            ("META-INF/container.xml", container),
            ("EPUB/package.opf", package),
            ("EPUB/nav.xhtml", nav),
            ("EPUB/text/trail.xhtml", XHTML % "\n".join(f"<p>{text}</p>" for text in PARAGRAPHS)),
            ("EPUB/images/path.png", illustration_png()),
        ):
            entry = ZipInfo(path, date_time=(2026, 11, 27, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            epub.writestr(entry, payload.encode("utf-8") if isinstance(payload, str) else payload)
    return archive.getvalue()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    destination = Path(__file__).with_name("m1-window.epub")
    expected = fixture_bytes()
    if args.check:
        if not destination.is_file() or destination.read_bytes() != expected:
            raise SystemExit(f"Illustrated EPUB fixture drift: {destination}")
    else:
        destination.write_bytes(expected)
