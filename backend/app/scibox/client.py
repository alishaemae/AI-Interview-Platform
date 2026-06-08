"""LLM client — DeepSeek API.

DeepSeek uses OpenAI-compatible API format.
Setup: set DEEPSEEK_KEY in .env
"""

import asyncio, logging, time, re, os
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

DEEPSEEK_KEY = os.getenv("DEEPSEEK_KEY", "")


class RateLimiter:
    def __init__(self, rps=2.0):
        self.min_interval = 1.0 / rps
        self.last_call = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            wait = self.min_interval - (now - self.last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self.last_call = time.monotonic()


class SciboxClient:
    """DeepSeek LLM client."""

    def __init__(self):
        self.limiter = RateLimiter(rps=2.0)
        self._active_provider = "DeepSeek"

    async def chat(self, messages: list, system_prompt: str = "",
                   temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        """Send chat request to DeepSeek."""
        await self.limiter.acquire()

        if not DEEPSEEK_KEY:
            logger.error("DEEPSEEK_KEY not configured! Set it in .env")
            return None

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_KEY}",
            "Content-Type": "application/json",
        }

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        body = {
            "model": "deepseek-chat",
            "messages": all_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        max_retries = 3
        for attempt in range(max_retries):
          try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                start = time.monotonic()
                resp = await client.post(
                    "https://api.deepseek.com/chat/completions",
                    headers=headers, json=body
                )
                elapsed = time.monotonic() - start

                if resp.status_code != 200:
                    logger.warning(f"DeepSeek error ({resp.status_code}): {resp.text[:300]}")
                    return None

                data = resp.json()
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                    # Strip <think>...</think> reasoning tags
                    if "<think>" in content:
                        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                    if content.strip():
                        logger.info(f"DeepSeek OK ({elapsed:.1f}s): {content[:60]}...")
                        return content

                logger.warning("DeepSeek: empty response")
                return None

          except httpx.ConnectError as e:
            logger.warning(f"DeepSeek: connection failed (attempt {attempt+1}/{max_retries}) — {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            return None
          except httpx.TimeoutException:
            logger.warning(f"DeepSeek: timeout (attempt {attempt+1}/{max_retries})")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
                continue
            return None
          except Exception as e:
            logger.warning(f"DeepSeek: {type(e).__name__}: {e}")
            return None

    async def get_embedding(self, text: str) -> Optional[list]:
        return None


scibox_client = SciboxClient()
