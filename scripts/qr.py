import socket
import sys

import segno

BLACK, WHITE, END = "\x1b[40m", "\x1b[107m", "\x1b[0m"


# ---- LAN ----
def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# ---- QR ----
def grid(url):
    rows = [list(r) for r in segno.make(url, error="m").matrix]
    side = [0] * 4
    blank = [0] * (len(rows[0]) + 8)
    return [blank] * 4 + [side + r + side for r in rows] + [blank] * 4


def show(url):
    print(f"\nOpen on your phone: {url}\n")
    for row in grid(url):
        print("".join((BLACK if v else WHITE) + "  " for v in row) + END)
    print()


if __name__ == "__main__":
    custom, port = sys.argv[1], sys.argv[2]
    show(custom or f"http://{lan_ip()}:{port}")
