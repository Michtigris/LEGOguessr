"""Export d'une liste de sets en PDF : titre centré + grille 2 colonnes."""

from __future__ import annotations

import struct
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from fontTools.ttLib import TTFont
from fpdf import FPDF

from storage import data_root, resource_root

FONT = "DejaVu"
PAGE_W = 210.0
PAGE_H = 297.0
MARGIN_X = 10.0
MARGIN_TOP = 12.0
MARGIN_BOTTOM = 10.0
COL_GAP = 5.0
ROW_GAP = 5.0
CARD_W = (PAGE_W - 2 * MARGIN_X - COL_GAP) / 2
CARD_H = 80.0
CARD_PAD = 3.0
CONTENT_W = PAGE_W - 2 * MARGIN_X


def pdf_filename(name: str) -> str:
    cleaned = " ".join(
        "".join(ch if ch.isalnum() or ch in " -_" else " " for ch in name).split()
    )
    return f"{cleaned or 'liste'}.pdf"


def content_disposition(filename: str) -> str:
    ascii_name = "".join(
        ch if ch.isascii() and (ch.isalnum() or ch in "-_.") else "_" for ch in filename
    ).strip("._") or "liste.pdf"
    if not ascii_name.lower().endswith(".pdf"):
        ascii_name += ".pdf"
    return (
        f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(filename)}'
    )


def _font_path(filename: str) -> Path:
    candidates = [
        Path(__file__).resolve().parent / "fonts" / filename,
        resource_root() / "backend" / "fonts" / filename,
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(f"Police introuvable: {filename}")


def _cmap(path: Path) -> set[int]:
    font = TTFont(path)
    try:
        chars: set[int] = set()
        for table in font["cmap"].tables:
            if table.isUnicode():
                chars.update(table.cmap)
        return chars
    finally:
        font.close()


def _sanitize(text: str, cmap: set[int]) -> str:
    cleaned = " ".join(text.replace("\n", " ").replace("\r", " ").split())
    return "".join(ch if ord(ch) in cmap else "?" for ch in cleaned)


def _fit_font_size(
    pdf: FPDF,
    text: str,
    width: float,
    *,
    style: str,
    lo: float,
    hi: float,
) -> float:
    pdf.set_font(FONT, style, hi)
    if pdf.get_string_width(text) <= width:
        return hi
    best = lo
    for _ in range(24):
        mid = (lo + hi) / 2
        pdf.set_font(FONT, style, mid)
        if pdf.get_string_width(text) <= width:
            best = mid
            lo = mid
        else:
            hi = mid
    return best


def _widest_glyph(pdf: FPDF) -> str:
    """Plus large lettre utile : 20 fois cette lettre = largeur max du titre."""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    pdf.set_font(FONT, "B", 40)
    best = "W"
    best_w = -1.0
    for char in alphabet:
        width = pdf.get_string_width(char)
        if width > best_w:
            best, best_w = char, width
    return best


def _title_font_size(pdf: FPDF, title: str) -> float:
    """
    Taille max = 20 caractères les plus larges tiennent pile dans la page.
    Un nom plus court reste à cette taille. Un nom plus long est réduit.
    """
    cap = _widest_glyph(pdf) * 20
    max_size = _fit_font_size(pdf, cap, CONTENT_W, style="B", lo=8, hi=72)
    pdf.set_font(FONT, "B", max_size)
    if pdf.get_string_width(title) <= CONTENT_W:
        return max_size
    return _fit_font_size(pdf, title, CONTENT_W, style="B", lo=5, hi=max_size)


def _image_size(data: bytes) -> tuple[int, int] | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
        if width and height:
            return int(width), int(height)
        return None
    if not data.startswith(b"\xff\xd8"):
        return None
    sof = {
        0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
    }
    index = 2
    while index + 8 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in sof:
            height, width = struct.unpack(">HH", data[index + 5 : index + 9])
            if width and height:
                return int(width), int(height)
            return None
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD9:
            if marker == 0xD9:
                break
            index += 2
            continue
        if index + 4 > len(data):
            break
        segment = struct.unpack(">H", data[index + 2 : index + 4])[0]
        index += 2 + segment
    return None


def _prepare_image(data: bytes) -> bytes | None:
    if not data:
        return None
    try:
        from PIL import Image
    except ImportError:
        return data if _image_size(data) else None
    try:
        image = Image.open(BytesIO(data))
        image.load()
        image.thumbnail((720, 720))
        out = BytesIO()
        if image.mode in ("RGBA", "LA") or (
            image.mode == "P" and "transparency" in image.info
        ):
            image.convert("RGBA").save(out, format="PNG", optimize=True)
        else:
            image.convert("RGB").save(out, format="JPEG", quality=82, optimize=True)
        return out.getvalue()
    except Exception:
        return data if _image_size(data) else None


def _read_image(client: httpx.Client, url: str) -> bytes | None:
    if url.startswith("/media/sets/"):
        path = data_root() / "images" / Path(url).name
        if not path.is_file():
            return None
        return _prepare_image(path.read_bytes())
    if not url.startswith(("http://", "https://")):
        return None
    try:
        response = client.get(url)
    except httpx.HTTPError:
        return None
    if response.status_code != 200 or not response.content:
        return None
    return _prepare_image(response.content)


def _load_images(sets: list[dict[str, Any]]) -> list[bytes | None]:
    urls = [str(item.get("set_img_url") or "") for item in sets]
    unique = list(dict.fromkeys(url for url in urls if url))
    found: dict[str, bytes | None] = {}
    if unique:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            with ThreadPoolExecutor(max_workers=8) as pool:
                futures = {
                    pool.submit(_read_image, client, url): url for url in unique
                }
                for future in as_completed(futures):
                    url = futures[future]
                    try:
                        found[url] = future.result()
                    except Exception:
                        found[url] = None
    return [found.get(url) if url else None for url in urls]


def _cut_to_width(pdf: FPDF, text: str, width: float, ellipsis: str) -> str:
    if pdf.get_string_width(text) <= width:
        return text
    ellipsis_w = pdf.get_string_width(ellipsis)
    if ellipsis_w >= width:
        return ""
    lo, hi = 0, len(text)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if pdf.get_string_width(text[:mid]) + ellipsis_w <= width:
            lo = mid
        else:
            hi = mid - 1
    trimmed = text[:lo].rstrip()
    return f"{trimmed}{ellipsis}" if trimmed else ""


def _wrap_text(pdf: FPDF, text: str, width: float, max_lines: int) -> list[str]:
    words = [word for word in text.split(" ") if word]
    if not words:
        return [""]
    lines: list[str] = []
    index = 0
    while index < len(words) and len(lines) < max_lines:
        if len(lines) == max_lines - 1:
            lines.append(_cut_to_width(pdf, " ".join(words[index:]), width, "…"))
            break
        word = words[index]
        if pdf.get_string_width(word) > width:
            piece = _cut_to_width(pdf, word, width, "")
            if not piece:
                piece = word[0]
            lines.append(piece)
            rest = word[len(piece) :]
            if rest:
                words[index] = rest
            else:
                index += 1
            continue
        line = word
        index += 1
        while index < len(words):
            trial = f"{line} {words[index]}"
            if pdf.get_string_width(trial) <= width:
                line = trial
                index += 1
            else:
                break
        lines.append(line)
    return lines or [""]


def _draw_contained_image(
    pdf: FPDF,
    path: Path,
    box_x: float,
    box_y: float,
    box_w: float,
    box_h: float,
) -> None:
    data = path.read_bytes()
    size = _image_size(data)
    if not size:
        pdf.image(str(path), x=box_x, y=box_y, w=box_w, h=box_h)
        return
    pixel_w, pixel_h = size
    inset = min(box_w, box_h) * 0.04
    avail_w = box_w - 2 * inset
    avail_h = box_h - 2 * inset
    scale = min(avail_w / pixel_w, avail_h / pixel_h)
    draw_w = pixel_w * scale
    draw_h = pixel_h * scale
    pdf.image(
        str(path),
        x=box_x + (box_w - draw_w) / 2,
        y=box_y + (box_h - draw_h) / 2,
        w=draw_w,
        h=draw_h,
    )


def _draw_card(
    pdf: FPDF,
    x: float,
    y: float,
    item: dict[str, Any],
    image_path: Path | None,
) -> None:
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(214, 208, 196)
    pdf.set_line_width(0.25)
    pdf.rect(x, y, CARD_W, CARD_H, style="DF")

    inner_x = x + CARD_PAD
    inner_w = CARD_W - 2 * CARD_PAD
    image_h = 58.0
    image_y = y + CARD_PAD
    pdf.set_fill_color(255, 255, 255)
    pdf.rect(inner_x, image_y, inner_w, image_h, style="F")
    if image_path is not None:
        try:
            _draw_contained_image(pdf, image_path, inner_x, image_y, inner_w, image_h)
        except Exception:
            image_path = None
    if image_path is None:
        pdf.set_fill_color(236, 233, 226)
        mark = 10.0
        pdf.rect(
            inner_x + (inner_w - mark) / 2,
            image_y + (image_h - mark) / 2,
            mark,
            mark,
            style="F",
        )

    set_num = str(item.get("set_num") or "—")
    parts = item.get("num_parts")
    year = item.get("year")
    parts_label = "—" if parts is None else str(int(parts))
    year_label = "—" if year is None else str(int(year))

    meta_top = image_y + image_h + 1.6
    meta_h = 5.2
    meta_size = 8.0
    while meta_size >= 6.0:
        pdf.set_font(FONT, "", meta_size)
        widths = [
            pdf.get_string_width(label) for label in (set_num, parts_label, year_label)
        ]
        if sum(widths) + 3 <= inner_w:
            break
        meta_size -= 0.4
    pdf.set_font(FONT, "", meta_size)
    widths = [pdf.get_string_width(label) for label in (set_num, parts_label, year_label)]
    gap = max(0.8, (inner_w - sum(widths)) / 2)
    positions = [
        inner_x,
        inner_x + widths[0] + gap,
        inner_x + inner_w - widths[2],
    ]
    pdf.set_text_color(48, 44, 38)
    for label, pos, width in zip(
        (set_num, parts_label, year_label), positions, widths, strict=True
    ):
        pdf.set_xy(pos, meta_top)
        pdf.cell(width, meta_h, label, align="L")

    name = str(item.get("name") or set_num)
    pdf.set_font(FONT, "B", 9)
    pdf.set_text_color(18, 16, 14)
    lines = _wrap_text(pdf, name, inner_w, 2)
    line_h = 4.15
    name_y = meta_top + meta_h + 0.4
    for index, line in enumerate(lines):
        pdf.set_xy(inner_x, name_y + index * line_h)
        pdf.cell(inner_w, line_h, line, align="L")


def build_list_pdf(name: str, sets: list[dict[str, Any]]) -> bytes:
    regular = _font_path("DejaVuSans.ttf")
    bold = _font_path("DejaVuSans-Bold.ttf")
    cmap = _cmap(regular)
    title = _sanitize(name, cmap) or "Liste"
    rows = []
    for item in sets:
        rows.append(
            {
                "set_num": _sanitize(str(item.get("set_num") or ""), cmap) or "—",
                "name": _sanitize(str(item.get("name") or item.get("set_num") or ""), cmap),
                "year": item.get("year"),
                "num_parts": item.get("num_parts"),
                "set_img_url": item.get("set_img_url"),
            }
        )

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.set_title(title)
    pdf.set_creator("LEGO Guessr")
    pdf.add_font(FONT, "", str(regular))
    pdf.add_font(FONT, "B", str(bold))

    title_size = _title_font_size(pdf, title)
    title_h = title_size * 0.5
    images = _load_images(rows)

    def start_page(with_title: bool) -> float:
        pdf.add_page()
        if not with_title:
            return MARGIN_TOP
        pdf.set_font(FONT, "B", title_size)
        pdf.set_text_color(18, 16, 14)
        pdf.set_xy(MARGIN_X, MARGIN_TOP)
        pdf.cell(CONTENT_W, title_h, title, align="C")
        return MARGIN_TOP + title_h + 6.0

    with tempfile.TemporaryDirectory(prefix="lego-pdf-") as tmp:
        folder = Path(tmp)
        image_paths: list[Path | None] = []
        for index, blob in enumerate(images):
            if not blob:
                image_paths.append(None)
                continue
            suffix = ".png" if blob.startswith(b"\x89PNG") else ".jpg"
            path = folder / f"{index}{suffix}"
            path.write_bytes(blob)
            image_paths.append(path)

        cursor = start_page(True)
        column = 0
        for item, image_path in zip(rows, image_paths, strict=True):
            if cursor + CARD_H > PAGE_H - MARGIN_BOTTOM:
                cursor = start_page(False)
                column = 0
            x = MARGIN_X + column * (CARD_W + COL_GAP)
            _draw_card(pdf, x, cursor, item, image_path)
            column += 1
            if column >= 2:
                column = 0
                cursor += CARD_H + ROW_GAP

        output = pdf.output()
    return bytes(output)
