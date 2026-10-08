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


def get_logger(name: str) -> logging.Logger:
    """Get a structured logger instance."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)

    logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
    return logger
