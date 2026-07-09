import re
import nh3


ALLOWED_TAGS = {'p', 'b', 'i', 'u', 's', 'em', 'strong', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'br'}


def sanitize_memory_text(text: str) -> str:
    return nh3.clean(text, tags=ALLOWED_TAGS)


def extract_plain_title(html_text: str, provided_title: str = "") -> str:
    if provided_title:
        return provided_title
    plain = re.sub(r'<[^>]*>', '', html_text)
    return plain[:100]


def detect_visibility_status(visibility: str) -> str:
    return "approved" if visibility == "private" else "pending"