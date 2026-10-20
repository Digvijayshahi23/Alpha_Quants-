from __future__ import annotations

import structlog
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from ..db.models import ResearchSession
from ..schemas import Out
from .deps import State

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/planner", tags=["planner"])


class SessionIn(BaseModel):
    region: str | None = None
    delay: int | None = None
    universe: str | None = None
    dataset_category: str | None = None
    hypothesis: str | None = None
    strategy_type: str | None = None
    status: str = "IN_PROGRESS"


class SessionOut(Out):
    id: int
    region: str | None = None
    delay: int | None = None
    universe: str | None = None
    dataset_category: str | None = None
    hypothesis: str | None = None
    strategy_type: str | None = None
    status: str


@router.get("/sessions")
async def get_sessions(state: State) -> list[SessionOut]:
    async with state.db.session() as session:
        result = await session.execute(
            select(ResearchSession).order_by(ResearchSession.created_at.desc())
        )
        return [
            SessionOut(
                id=s.id,
                region=s.region,
                delay=s.delay,
                universe=s.universe,
                dataset_category=s.dataset_category,
                hypothesis=s.hypothesis,
                strategy_type=s.strategy_type,
                status=s.status,
            )
            for s in result.scalars()
        ]


@router.post("/sessions")
async def create_session(payload: SessionIn, state: State) -> SessionOut:
    async with state.db.session() as session:
        db_sess = ResearchSession(
            region=payload.region,
            delay=payload.delay,
            universe=payload.universe,
            dataset_category=payload.dataset_category,
            hypothesis=payload.hypothesis,
            strategy_type=payload.strategy_type,
            status=payload.status,
        )
        session.add(db_sess)
        await session.commit()

        return SessionOut(
            id=db_sess.id,
            region=db_sess.region,
            delay=db_sess.delay,
            universe=db_sess.universe,
            dataset_category=db_sess.dataset_category,
            hypothesis=db_sess.hypothesis,
            strategy_type=db_sess.strategy_type,
            status=db_sess.status,
        )
