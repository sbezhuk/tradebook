from datetime import datetime, timezone
from typing import Annotated, Optional
from pydantic import AfterValidator

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure naive datetimes from DB/ORM are treated as UTC so they serialize with 'Z'."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

UtcDateTime = Annotated[datetime, AfterValidator(ensure_utc)]
OptionalUtcDateTime = Annotated[Optional[datetime], AfterValidator(ensure_utc)]
