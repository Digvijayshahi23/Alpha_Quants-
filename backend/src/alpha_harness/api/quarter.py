"""The quarter BRAIN judges a consultant on.

Levels are evaluated quarterly against three criteria, two of which are countable here
(``docs/learn/consultant-information/brain-genius``): signals submitted in the quarter, and
pyramids formulated in it. The third, combined Alpha performance, is BRAIN's own arithmetic
and is not guessed at.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import structlog
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from ..catalog.pyramids import LIT_AT, next_quarter_start, quarter_start
from ..db.models import QuarterConfig
from ..schemas import Out
from .deps import State

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/quarter", tags=["quarter"])


class QuarterTargets(Out):
    min_signals: int = 20
    min_pyramids: int = 10
    primary_signals: int = 120
    primary_pyramids: int = 30
    stretch_signals: int = 220
    stretch_pyramids: int = 60
    buffer_signals_pct: float = 1.1
    buffer_pyramids_pct: float = 1.1

class QuarterConfigSchema(BaseModel):
    year: int
    quarter: int
    start_date: str
    end_date: str
    min_signals: int
    min_pyramids: int
    primary_signals: int
    primary_pyramids: int
    stretch_signals: int
    stretch_pyramids: int
    buffer_signals_pct: float
    buffer_pyramids_pct: float


class QuarterPacing(Out):
    days_elapsed: int
    days_remaining: int
    completion_pct: float

    # Based on primary goals
    remaining_signals: int
    remaining_pyramids: int

    # Internal targets with buffer
    buffer_signals_target: int
    buffer_pyramids_target: int

    required_daily_signals: float
    required_daily_pyramids: float
    required_weekly_signals: float
    required_weekly_pyramids: float


class QuarterStanding(Out):
    #: ``2026-Q3``, for a label that needs no explaining.
    label: str
    start: str
    end: str
    #: Alphas submitted inside the quarter, summed from BRAIN's own daily counts.
    submitted: int
    #: Pyramids with at least :data:`LIT_AT` submitted Alphas in them.
    pyramids_formulated: int
    #: Pyramids with at least one submitted Alpha but not yet enough to count.
    pyramids_started: int
    #: How many Alphas a pyramid needs, so the UI can say it without repeating the rule.
    alphas_per_pyramid: int
    #: User-configured targets (Phase 3 & Phase 5)
    targets: QuarterTargets
    #: Pace and gap math (Phase 4)
    pacing: QuarterPacing


async def get_or_create_current_quarter(state: State) -> QuarterConfig:
    today = datetime.now(UTC).date()
    start_dt, end_dt = quarter_start(today), next_quarter_start(today) - timedelta(days=1)
    year = start_dt.year
    q_num = (start_dt.month - 1) // 3 + 1

    async with state.db.session() as session:
        stmt = select(QuarterConfig).where(
            QuarterConfig.year == year, QuarterConfig.quarter == q_num
        )
        row = (await session.execute(stmt)).scalar_one_or_none()

        if not row:
            row = QuarterConfig(
                year=year,
                quarter=q_num,
                start_date=start_dt.isoformat(),
                end_date=end_dt.isoformat()
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)

        return row


@router.get("")
async def standing(state: State) -> QuarterStanding:
    """Submitted Alphas and formulated pyramids for the quarter in progress.

    Two reads, run together. Neither is derivable from the other: an Alpha belongs to as
    many pyramids as it has data categories, so the pyramid counts sum to more than the
    number of Alphas and cannot stand in for it.
    """
    config = await get_or_create_current_quarter(state)
    start_str, end_str = config.start_date, config.end_date

    days, pyramids = await asyncio.gather(
        state.endpoints.submission_activity(),
        state.endpoints.pyramid_alphas(start_str, end_str),
        return_exceptions=True,
    )
    if isinstance(days, BaseException):
        log.warning("quarter.submissions_failed", exc_info=days)
        days = []
    if isinstance(pyramids, BaseException):
        log.warning("quarter.pyramids_failed", exc_info=pyramids)
        pyramids = []

    submitted = sum(count for day, count in days if start_str <= day <= end_str)
    counts = [int(p.get("alphaCount") or 0) for p in pyramids]

    pyramids_formulated = sum(1 for n in counts if n >= LIT_AT)
    pyramids_started = sum(1 for n in counts if 0 < n < LIT_AT)

    # Phase 4 Pacing Math
    today = datetime.now(UTC).date()
    start_dt = datetime.fromisoformat(start_str).date()
    end_dt = datetime.fromisoformat(end_str).date()

    total_days = (end_dt - start_dt).days + 1
    days_elapsed = max(0, min((today - start_dt).days + 1, total_days))
    days_remaining = max(0, total_days - days_elapsed)

    completion_pct = round((days_elapsed / total_days) * 100, 2) if total_days > 0 else 100.0

    buffer_sig_target = int(config.primary_signals * config.buffer_signals_pct)
    buffer_pyr_target = int(config.primary_pyramids * config.buffer_pyramids_pct)

    remaining_signals = max(0, config.primary_signals - submitted)
    remaining_pyramids = max(0, config.primary_pyramids - pyramids_formulated)

    req_daily_sig = (max(0, buffer_sig_target - submitted) / days_remaining) if days_remaining > 0 else 0
    req_daily_pyr = (max(0, buffer_pyr_target - pyramids_formulated) / days_remaining) if days_remaining > 0 else 0

    pacing = QuarterPacing(
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        completion_pct=completion_pct,
        remaining_signals=remaining_signals,
        remaining_pyramids=remaining_pyramids,
        buffer_signals_target=buffer_sig_target,
        buffer_pyramids_target=buffer_pyr_target,
        required_daily_signals=round(req_daily_sig, 2),
        required_daily_pyramids=round(req_daily_pyr, 2),
        required_weekly_signals=round(req_daily_sig * 7, 2),
        required_weekly_pyramids=round(req_daily_pyr * 7, 2)
    )

    return QuarterStanding(
        label=f"{config.year}-Q{config.quarter}",
        start=start_str,
        end=end_str,
        submitted=submitted,
        pyramids_formulated=pyramids_formulated,
        pyramids_started=pyramids_started,
        alphas_per_pyramid=LIT_AT,
        targets=QuarterTargets(
            min_signals=config.min_signals,
            min_pyramids=config.min_pyramids,
            primary_signals=config.primary_signals,
            primary_pyramids=config.primary_pyramids,
            stretch_signals=config.stretch_signals,
            stretch_pyramids=config.stretch_pyramids,
            buffer_signals_pct=config.buffer_signals_pct,
            buffer_pyramids_pct=config.buffer_pyramids_pct,
        ),
        pacing=pacing
    )

@router.put("/config")
async def update_config(payload: QuarterConfigSchema, state: State) -> QuarterTargets:
    """Update the configuration for a specific quarter."""
    async with state.db.session() as session:
        stmt = select(QuarterConfig).where(
            QuarterConfig.year == payload.year, QuarterConfig.quarter == payload.quarter
        )
        row = (await session.execute(stmt)).scalar_one_or_none()

        if not row:
            row = QuarterConfig()
            session.add(row)

        row.year = payload.year
        row.quarter = payload.quarter
        row.start_date = payload.start_date
        row.end_date = payload.end_date
        row.min_signals = payload.min_signals
        row.min_pyramids = payload.min_pyramids
        row.primary_signals = payload.primary_signals
        row.primary_pyramids = payload.primary_pyramids
        row.stretch_signals = payload.stretch_signals
        row.stretch_pyramids = payload.stretch_pyramids
        row.buffer_signals_pct = payload.buffer_signals_pct
        row.buffer_pyramids_pct = payload.buffer_pyramids_pct

        await session.commit()
        await session.refresh(row)

        return QuarterTargets(
            min_signals=row.min_signals,
            min_pyramids=row.min_pyramids,
            primary_signals=row.primary_signals,
            primary_pyramids=row.primary_pyramids,
            stretch_signals=row.stretch_signals,
            stretch_pyramids=row.stretch_pyramids,
            buffer_signals_pct=row.buffer_signals_pct,
            buffer_pyramids_pct=row.buffer_pyramids_pct,
        )

class PyramidMatrixCell(Out):
    region: str
    delay: int
    category: str
    alpha_count: int
    status: str


@router.get("/matrix")
async def matrix(state: State) -> list[PyramidMatrixCell]:
    """Phase 6: Real Pyramid Matrix tracking."""
    config = await get_or_create_current_quarter(state)
    start_str, end_str = config.start_date, config.end_date

    try:
        pyramids = await state.endpoints.pyramid_alphas(start_str, end_str)
    except BaseException as e:
        log.warning("quarter.matrix_failed", exc_info=e)
        pyramids = []

    cells = []
    for p in pyramids:
        region = p.get("region", "UNKNOWN")
        delay = int(p.get("delay", 1))
        category = p.get("category", "UNKNOWN")
        count = int(p.get("alphaCount") or 0)

        status = "UNSTARTED"
        if count >= LIT_AT:
            status = "COMPLETED"
        elif count == LIT_AT - 1:
            status = "NEAR_COMPLETION"
        elif count > 0:
            status = "IN_PROGRESS"

        cells.append(PyramidMatrixCell(
            region=region,
            delay=delay,
            category=category,
            alpha_count=count,
            status=status
        ))

    return cells

