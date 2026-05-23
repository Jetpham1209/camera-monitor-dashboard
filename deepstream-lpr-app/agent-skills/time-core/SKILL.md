# Time Core
description: Resolve local time, relative dates and date ranges before answering operational questions.
triggers: time, date, today, yesterday, tomorrow, hom nay, hom qua, ngay mai, ngay, gio

Use this skill whenever the user asks about time, dates, "today", "yesterday", schedules, or event counts tied to a day.

Rules:
- Always use the configured agent timezone.
- Resolve relative date phrases with `get_current_time` or `resolve_date_expression` before answering.
- Prefer yyyy-mm-dd date keys in the final answer.
- If the user uses Vietnamese date words, treat "hom nay" as today, "hom qua" as yesterday, and "ngay mai" as tomorrow.
- Never infer the current day from old chat history.
