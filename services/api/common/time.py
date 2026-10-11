"""Indian Standard Time (IST) utilities for Saans business dates."""

from datetime import datetime, timezone, timedelta, date

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    """Return current datetime in Indian Standard Time (UTC+05:30)."""
    return datetime.now(IST)


def today_ist() -> date:
    """Return current date in Indian Standard Time (UTC+05:30)."""
    return now_ist().date()
