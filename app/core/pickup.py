from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

STORE_TZ = ZoneInfo("Asia/Makassar")

SLOTS = {
    "12:00": time(12, 0),
    "17:00": time(17, 0),
}
CUTOFF_OFFSET = timedelta(hours=1)


def now_in_store_tz() -> datetime:
    return datetime.now(STORE_TZ)


def slot_datetime(pickup_date: date, slot: str) -> datetime:
    """Aware datetime of the slot itself, in Asia/Makassar."""
    return datetime.combine(pickup_date, SLOTS[slot], tzinfo=STORE_TZ)


def cutoff_datetime(pickup_date: date, slot: str) -> datetime:
    return slot_datetime(pickup_date, slot) - CUTOFF_OFFSET


def is_slot_available(pickup_date: date, slot: str) -> bool:
    """True if the cutoff for this date+slot has not yet passed, evaluated now."""
    if slot not in SLOTS:
        return False
    return now_in_store_tz() < cutoff_datetime(pickup_date, slot)


def validate_pickup_choice(pickup_date: date, slot: str) -> str | None:
    """Returns an error message if invalid, else None."""
    if slot not in SLOTS:
        return f"Invalid pickup slot '{slot}'. Must be one of {list(SLOTS.keys())}."
    if pickup_date < now_in_store_tz().date():
        return "Pickup date cannot be in the past."
    if not is_slot_available(pickup_date, slot):
        cutoff = cutoff_datetime(pickup_date, slot)
        return f"Cutoff for this slot has passed (cutoff was {cutoff.strftime('%Y-%m-%d %H:%M')} WITA)."
    return None
