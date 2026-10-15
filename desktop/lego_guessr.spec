# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — LEGO Guessr desktop (double-clic)."""

from pathlib import Path

from PyInstaller.utils.hooks import collect_all

block_cipher = None
ROOT = Path(SPECPATH).resolve().parent

datas = [
    (str(ROOT / "frontend" / "dist"), "frontend/dist"),
    (str(ROOT / "frontend" / "public"), "frontend/public"),
]

# Backend package files
backend = ROOT / "backend"
for name in (
    "main.py",
    "db.py",
    "catalog.py",
    "game.py",
    "nobg.py",
    "rebrickable.py",
    "storage.py",
    "pdf_export.py",
):
    datas.append((str(backend / name), "backend"))

fonts = backend / "fonts"
if fonts.is_dir():
    datas.append((str(fonts), "backend/fonts"))

hiddenimports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "starlette",
    "httpx",
    "openpyxl",
    "pydantic",
    "multipart",
    "python_multipart",
    "dotenv",
    "webview",
    "main",
    "db",
    "catalog",
    "game",
    "nobg",
    "rebrickable",
    "storage",
    "pdf_export",
    "fpdf",
    "fontTools",
]

tmp_ret = collect_all("uvicorn")
datas += tmp_ret[0]
hiddenimports += tmp_ret[1]
hiddenimports += tmp_ret[2]

tmp_ret = collect_all("fastapi")
datas += tmp_ret[0]
hiddenimports += tmp_ret[1]
hiddenimports += tmp_ret[2]

a = Analysis(
    [str(ROOT / "desktop" / "run_desktop.py")],
    pathex=[str(backend)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["rembg", "torch", "onnxruntime", "cv2", "numpy.tests"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="LEGO Guessr",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # pas de console noire — comme un jeu
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
