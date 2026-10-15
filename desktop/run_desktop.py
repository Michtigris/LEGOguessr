"""
Lanceur desktop LEGO Guessr — une fenêtre, listes sauvegardées en local.
Double-clic sur LEGO Guessr.exe (après build).
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
from pathlib import Path


def _prepare_env() -> None:
    os.environ["LEGO_GUESSR_DESKTOP"] = "1"
    os.environ.setdefault("ENABLE_NOBG", "0")
    # Backend modules live next to this file in source, or in the bundle
    if getattr(sys, "frozen", False):
        root = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        backend = root / "backend"
    else:
        root = Path(__file__).resolve().parent.parent
        backend = root / "backend"
    if str(backend) not in sys.path:
        sys.path.insert(0, str(backend))


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_ready(url: str, timeout: float = 30.0) -> bool:
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:  # noqa: BLE001
            time.sleep(0.15)
    return False


def main() -> int:
    _prepare_env()

    import uvicorn
    from storage import data_root

    # Force persistent save dir early
    saves = data_root()
    print(f"Sauvegardes: {saves}")

    port = _free_port()
    host = "127.0.0.1"
    base = f"http://{host}:{port}"

    config = uvicorn.Config(
        "main:app",
        host=host,
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    if not _wait_ready(f"{base}/api/health"):
        print("Le serveur n'a pas démarré.")
        return 1

    try:
        import webview

        window = webview.create_window(
            "LEGO Guessr",
            base,
            width=1280,
            height=800,
            min_size=(900, 600),
        )
        webview.start()
        # Window closed
        server.should_exit = True
    except Exception as exc:  # noqa: BLE001
        # Fallback navigateur si WebView2 indisponible
        print(f"Fenêtre native indisponible ({exc}), ouverture du navigateur…")
        import webbrowser

        webbrowser.open(base)
        try:
            while thread.is_alive():
                time.sleep(0.5)
        except KeyboardInterrupt:
            server.should_exit = True

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
