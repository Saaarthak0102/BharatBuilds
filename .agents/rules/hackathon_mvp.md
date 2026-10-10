---
name: Hackathon MVP Mode
description: Focus on end-to-end working flow, skip polish and non-essential features.
---

# Hackathon MVP Mode

The goal is a working end-to-end flow today, not polish.

## Skip (Do NOT implement):
- Rate-limit module
- SNS alerts/subscriptions
- Monitor agent
- EXIF stripping
- Report deletion
- Bookings list endpoint
- Extra edge-case tests

## Keep (MUST implement):
- Role checks
- Input validation
- Step caps
- Deterministic fallbacks when the model fails
- `is_sample` badges
- Tests for the main path plus one failure path

Always prioritize speed and working core paths over edge cases and polish.
