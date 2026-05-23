# Event Analytics
description: Count and summarize DeepStream runtime events from the runtime event log.
triggers: event, events, count, bao nhieu, thong ke, ket qua, result, capture, person, vehicle, xe, nguoi, camera

Use this skill for questions about how many detections, captures, vehicles, people, plates, or other labels appeared.

Rules:
- Always use `count_runtime_events` for quantity/statistics questions.
- Use exact filters when the user names a camera, object label, event type, date, or date range.
- If the user asks "hom nay" or "hom qua", resolve the date first and report the timezone.
- Include the filters used in the answer so the user can verify what was counted.
- If the count is zero, say which filter combination produced zero.
- Use `get_runtime_results` only when the user asks for saved images/results, not for event totals.
