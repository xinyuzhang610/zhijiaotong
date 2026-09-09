import httpx
from config import settings


class AIConfigurationError(RuntimeError):
    """Raised when the selected AI provider cannot be used safely."""


class DeepSeekRequestError(RuntimeError):
    """A safe, user-facing description of an upstream DeepSeek failure."""

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


def _request_error(response: httpx.Response) -> DeepSeekRequestError:
    """Convert an upstream response into a message that never exposes credentials."""
    status_code = response.status_code
    try:
        detail = response.json().get("error", {}).get("message", "")
    except (ValueError, AttributeError):
        detail = ""

    if status_code == 400:
        message = "DeepSeek 模型或请求参数无效"
    elif status_code == 401:
        message = "DeepSeek API Key 无效或已失效"
    elif status_code == 429:
        message = "DeepSeek 请求过于频繁，请稍后重试"
    elif 500 <= status_code <= 599:
        message = "DeepSeek 服务暂时不可用，请稍后重试"
    else:
        message = "DeepSeek 请求失败"

    # The provider diagnostic is useful for operations, but is deliberately
    # bounded and never includes request headers or environment values.
    if detail:
        message = f"{message}（{detail[:240]}）"
    return DeepSeekRequestError(message, status_code)

async def chat_with_deepseek(message: str, system_prompt: str = None, history: list[dict] | None = None) -> str:
    if settings.AI_PROVIDER == "mock":
        return mock_reply(message, system_prompt)
    if not settings.DEEPSEEK_API_KEY or settings.DEEPSEEK_API_KEY == "your_api_key_here":
        raise AIConfigurationError("DeepSeek 已启用，但未配置有效的 DEEPSEEK_API_KEY")

    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    for h in (history or []):
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_URL}/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            if response.is_error:
                raise _request_error(response)
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.TimeoutException as error:
        raise DeepSeekRequestError("DeepSeek 请求超时，请稍后重试", 504) from error
    except httpx.RequestError as error:
        raise DeepSeekRequestError("无法连接 DeepSeek 服务，请稍后重试", 503) from error


async def stream_with_deepseek(message: str, system_prompt: str = None, history: list[dict] | None = None):
    """Yield provider text deltas as {'kind': 'content'|'reasoning', 'text': ...} items.

    Reasoning is streamed for display only and is never persisted.
    """
    if settings.AI_PROVIDER == "mock":
        reply = mock_reply(message, system_prompt)
        for start in range(0, len(reply), 40):
            yield {"kind": "content", "text": reply[start:start + 40]}
        return
    if not settings.DEEPSEEK_API_KEY or settings.DEEPSEEK_API_KEY == "your_api_key_here":
        raise AIConfigurationError("DeepSeek API Key is not configured")
    import json
    messages = ([{"role": "system", "content": system_prompt}] if system_prompt else []) + (history or []) + [{"role": "user", "content": message}]
    headers = {"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": settings.DEEPSEEK_MODEL, "messages": messages, "stream": True, "temperature": 0.7, "max_tokens": 2000}
    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream("POST", f"{settings.DEEPSEEK_API_URL}/v1/chat/completions", headers=headers, json=payload) as response:
            if response.is_error:
                body = await response.aread(); response._content = body
                raise _request_error(response)
            async for line in response.aiter_lines():
                if not line.startswith("data: ") or line == "data: [DONE]":
                    continue
                try:
                    delta = json.loads(line[6:])["choices"][0].get("delta", {})
                except (ValueError, KeyError, IndexError):
                    continue
                content = delta.get("content")
                if content:
                    yield {"kind": "content", "text": content}
                reasoning = delta.get("reasoning_content")
                if reasoning:
                    yield {"kind": "reasoning", "text": reasoning}


def mock_reply(message: str, system_prompt: str = None) -> str:
    """模拟AI回复，用于开发测试"""
    if system_prompt:
        # 根据提示词判断工具类型
        if "古诗词" in system_prompt:
            return f"""【模拟回复】古诗词赏析

您输入的是：{message}

📖 诗句解读：
这首诗表达了诗人对故乡的思念之情，意境深远，语言质朴。

🎯 创作背景：
诗人在外漂泊，看到明月，触发了思乡之情。

💡 趣味知识：
"床"在古代有多种含义，可指坐具、卧具，也可指井栏。

⚠️ 提示：当前为模拟回复，请配置 DeepSeek API Key 后即可获得真实AI回复。"""

        elif "作文" in system_prompt:
            return f"""【模拟回复】作文灵感助手

您输入的是：{message}

✍️ 写作角度：
1. 从个人经历出发，讲述真实故事
2. 从社会现象切入，引发思考
3. 从未来展望，描绘美好愿景

📝 素材建议：
- 名人事例
- 经典名言
- 生活细节

⚠️ 提示：当前为模拟回复，请配置 DeepSeek API Key 后即可获得真实AI回复。"""

        elif "公式" in system_prompt:
            return f"""【模拟回复】公式推导助手

您输入的是：{message}

🧮 公式内容：
这是一个重要的数学公式，广泛应用于几何和代数中。

📐 推导过程：
1. 从基本定义出发
2. 逐步推导
3. 得出最终结论

🔍 几何解释：
可以用图形直观理解这个公式的含义。

⚠️ 提示：当前为模拟回复，请配置 DeepSeek API Key 后即可获得真实AI回复。"""

    # 通用回复
    return f"""【模拟回复】AI 学习助手

您问的是：{message}

💡 回答：
这是一个很好的问题！让我来为您解答。

这个问题涉及到多个知识点，我会从基础概念开始，逐步为您分析。

📚 相关知识：
- 基础概念
- 应用场景
- 学习建议

⚠️ 提示：当前为模拟回复，请配置 DeepSeek API Key 后即可获得真实AI回复。
配置方法：编辑 source/backend/.env 文件，将 DEEPSEEK_API_KEY 设置为您的真实API Key。"""
