import hashlib
import hmac
from urllib.parse import parse_qsl

from app.core.config import get_settings


class TelegramAuthError(ValueError):
    pass


def validate_init_data(init_data: str) -> dict[str, str]:
    settings = get_settings()
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", "")
    if not received_hash:
        raise TelegramAuthError("Missing Telegram hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", settings.bot_token.encode("utf-8"), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramAuthError("Invalid Telegram init data hash")

    return data

