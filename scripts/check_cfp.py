#!/usr/bin/env python3
"""Monitor CFP-related text on official pages. Stdlib only, never edits deadlines.

First run seeds a baseline. Later runs report changed CFP snippets. A review issue
must be opened before the new baseline is committed by the GitHub workflow.
"""
from __future__ import annotations
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/data/conferences.json'
STATE = ROOT / 'data/cfp-snapshots.json'
REPORT = ROOT / 'data/cfp-check-report.json'
KEYWORDS = re.compile(r'call for (papers|submissions|abstracts|proposals)|deadline|submission|submit (your|an|a|by)|abstract|征稿|截稿|投稿|截止', re.I)
SPACE = re.compile(r'\s+')

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.fragments = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript', 'svg'):
            self.skip += 1
        elif tag in ('p', 'h1', 'h2', 'h3', 'h4', 'li', 'tr', 'td', 'br', 'div', 'section', 'article'):
            self.fragments.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg'):
            self.skip = max(0, self.skip - 1)
        elif tag in ('p', 'h1', 'h2', 'h3', 'h4', 'li', 'tr', 'div', 'section', 'article'):
            self.fragments.append('\n')
    def handle_data(self, data):
        if not self.skip:
            self.fragments.append(data)

def relevant_text(raw: bytes) -> list[str]:
    parser = PageText()
    parser.feed(raw.decode('utf-8', errors='replace'))
    text = html.unescape(''.join(parser.fragments))
    lines = [SPACE.sub(' ', line).strip() for line in text.splitlines()]
    lines = [line[:400] for line in lines if line.strip()]
    # Only track submission-related extracts; page menus & unrelated news do not matter.
    hits = []
    for i, line in enumerate(lines):
        if KEYWORDS.search(line):
            context = ' | '.join(lines[max(0, i-1):min(len(lines), i+2)])[:550]
            hits.append(context)
    return sorted(set(hits))[:100]

def fetch(url: str, timeout: int) -> list[str]:
    req = Request(url, headers={'User-Agent': 'ManagementDeadlinesCFPMonitor/0.3 (+academic deadline auditing; one request weekly)', 'Accept': 'text/html,application/xhtml+xml'})
    with urlopen(req, timeout=timeout) as resp:
        ct = resp.headers.get('Content-Type', '').lower()
        if 'text/html' not in ct and 'application/xhtml' not in ct:
            raise ValueError(f'Unsupported Content-Type: {ct}')
        raw = resp.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError('Page exceeded 1 MB fetch limit')
    return relevant_text(raw)

def digest(lines):
    return hashlib.sha256('\n'.join(lines).encode()).hexdigest()[:16]

def run():
    ap = argparse.ArgumentParser()
    ap.add_argument('--timeout', type=int, default=12)
    ap.add_argument('--sleep', type=float, default=1.0)
    ap.add_argument('--limit', type=int, default=0, help='Debug: check only N conferences; do not overwrite baseline.')
    args = ap.parse_args()
    conferences = json.loads(DATA.read_text(encoding='utf-8'))
    old = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    new = dict(old)
    changes, errors, initialized = [], [], []
    # URLs may appear multiple times: avoid redundant requests.
    cache = {}
    for c in conferences[:args.limit or None]:
        url = c['officialUrl']; ident = c['id']
        try:
            if url not in cache:
                cache[url] = fetch(url, args.timeout)
                if args.sleep: time.sleep(args.sleep)
            lines = cache[url]
            if not lines:
                errors.append({'id': ident, 'url': url, 'reason': 'No submission-related text found; manual inspection needed'})
                continue  # Never replace a useful baseline with empty text
            current = {'url': url, 'digest': digest(lines), 'snippets': lines}
            previous = old.get(ident)
            if previous and (previous['url'] != url or previous['digest'] != current['digest']):
                before = set(previous.get('snippets', [])); after = set(lines)
                changes.append({'id': ident, 'name': c['name'], 'url': url,
                                'oldDigest': previous['digest'], 'newDigest': current['digest'],
                                'added': sorted(after-before)[:12], 'removed': sorted(before-after)[:12]})
            elif previous is None:
                initialized.append(ident)
            new[ident] = current
        except (HTTPError, URLError, TimeoutError, ValueError, OSError) as e:
            errors.append({'id': ident, 'url': url, 'reason': str(e)[:300]})
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps({'changes': changes, 'errors': errors, 'initialized': initialized,
                                  'checked': len(conferences[:args.limit or None])}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    if not args.limit:
        STATE.parent.mkdir(exist_ok=True)
        STATE.write_text(json.dumps(dict(sorted(new.items())), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'Checked: {len(conferences[:args.limit or None])}; changes: {len(changes)}; seeded: {len(initialized)}; errors: {len(errors)}')
    for e in errors: print(f"WARNING {e['id']}: {e['reason']}")
    return 0

if __name__ == '__main__':
    raise SystemExit(run())
