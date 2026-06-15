from __future__ import annotations

import os
import time
from dataclasses import dataclass
from urllib import robotparser
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class PipelineFetchError(RuntimeError):
    pass


@dataclass(frozen=True)
class HttpFetchResult:
    content: bytes
    content_type: str
    final_url: str
    metadata: dict


class SafeHttpClient:
    def __init__(self, *, timeout_seconds: int = 15, retries: int = 2, user_agent: str | None = None):
        self.timeout_seconds = timeout_seconds
        self.retries = retries
        self.user_agent = user_agent or os.getenv(
            "PESAROUTE_PIPELINE_USER_AGENT",
            "PesaRouteDataPipeline/0.1 (+https://pesaroute.local; educational data verification)",
        )

    def get(self, url: str) -> HttpFetchResult:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise PipelineFetchError("Only HTTP(S) source URLs are supported.")
        if not self._robots_allows(url):
            raise PipelineFetchError("robots.txt disallows fetching this source URL.")

        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                request = Request(url, headers={"User-Agent": self.user_agent, "Accept": "text/html,text/csv,*/*"})
                with urlopen(request, timeout=self.timeout_seconds) as response:
                    content = response.read()
                    return HttpFetchResult(
                        content=content,
                        content_type=response.headers.get_content_type() or "application/octet-stream",
                        final_url=response.geturl(),
                        metadata={"status_code": response.status, "attempt": attempt + 1},
                    )
            except (HTTPError, URLError, TimeoutError) as exc:
                last_error = exc
                if attempt < self.retries:
                    time.sleep(0.25 * (2**attempt))
        raise PipelineFetchError(f"Failed to fetch source URL safely: {last_error}") from last_error

    def _robots_allows(self, url: str) -> bool:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        parser = robotparser.RobotFileParser()
        parser.set_url(robots_url)
        try:
            parser.read()
        except Exception:
            return True
        return parser.can_fetch(self.user_agent, url)
