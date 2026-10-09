"""
Structured JSON logging with correlation IDs.

All log entries include:
- correlation_id: for tracing across API, agent, and tool calls
- timestamp: ISO 8601
- level: info, warn, error
- No personal data in logs
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured CloudWatch logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "function": record.funcName,
        }

        # Add extra fields (correlation_id, etc.)
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName", "exc_info", "exc_text",
                "message", "taskName",
            ):
                log_entry[key] = value

        return json.dumps(log_entry, default=str)


class StructuredLoggerAdapter:
    """Wraps logging.Logger so arbitrary kwargs (like correlation_id) are moved to extra."""

    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def _log_with_extra(self, log_method, msg: str, *args, **kwargs):
        standard_keys = {"exc_info", "stack_info", "stacklevel", "extra"}
        extra = kwargs.setdefault("extra", {})
        custom_keys = [k for k in list(kwargs.keys()) if k not in standard_keys]
        for k in custom_keys:
            extra[k] = kwargs.pop(k)
        return log_method(msg, *args, **kwargs)

    def info(self, msg: str, *args, **kwargs):
        return self._log_with_extra(self._logger.info, msg, *args, **kwargs)

    def error(self, msg: str, *args, **kwargs):
        return self._log_with_extra(self._logger.error, msg, *args, **kwargs)

    def warning(self, msg: str, *args, **kwargs):
        return self._log_with_extra(self._logger.warning, msg, *args, **kwargs)

    def debug(self, msg: str, *args, **kwargs):
        return self._log_with_extra(self._logger.debug, msg, *args, **kwargs)

    def exception(self, msg: str, *args, **kwargs):
        return self._log_with_extra(self._logger.exception, msg, *args, **kwargs)

    def setLevel(self, level):
        return self._logger.setLevel(level)

    def __getattr__(self, name: str):
        return getattr(self._logger, name)


def get_logger(name: str) -> StructuredLoggerAdapter:
    """Get a structured logger instance."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)

    logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
    return StructuredLoggerAdapter(logger)
