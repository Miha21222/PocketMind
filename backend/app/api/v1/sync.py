from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.sync import SyncBatchRequest, SyncTaskListResponse, SyncTaskUpsert, SyncTaskUpsertResponse
from app.services.reminder_log_service import reconcile_pending_reminder_log
from app.services.task_sync_service import (
    apply_sync_payload,
    ensure_client_task_id,
    ensure_utc_datetime,
    mark_sync_task_deleted,
    to_sync_record,
)

router = APIRouter(prefix="/sync", tags=["sync"])


async def _get_task_by_client_id(db: AsyncSession, user_id: int, client_task_id: str) -> Task | None:
    return await db.scalar(select(Task).where(Task.user_id == user_id, Task.client_task_id == client_task_id))


@router.get("/bootstrap", response_model=SyncTaskListResponse)
async def bootstrap_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncTaskListResponse:
    items = (
        await db.scalars(
            select(Task)
            .where(Task.user_id == current_user.id, Task.client_task_id.is_not(None))
            .order_by(Task.updated_at.desc())
        )
    ).all()
    return SyncTaskListResponse(items=[to_sync_record(task) for task in items], server_time=datetime.now(UTC))


@router.get("/changes", response_model=SyncTaskListResponse)
async def list_sync_changes(
    since: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncTaskListResponse:
    items = (
        await db.scalars(
            select(Task)
            .where(
                Task.user_id == current_user.id,
                Task.client_task_id.is_not(None),
                or_(Task.updated_at > since, Task.deleted_at > since),
            )
            .order_by(Task.updated_at.desc())
        )
    ).all()
    return SyncTaskListResponse(items=[to_sync_record(task) for task in items], server_time=datetime.now(UTC))


@router.put("/tasks/{client_task_id}", response_model=SyncTaskUpsertResponse)
async def upsert_sync_task(
    client_task_id: str,
    payload: SyncTaskUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncTaskUpsertResponse:
    task = await _get_task_by_client_id(db, current_user.id, client_task_id)
    task_updated_at = ensure_utc_datetime(task.updated_at) if task is not None else None
    if task is not None and task_updated_at is not None and task_updated_at >= ensure_utc_datetime(payload.updated_at):
        ensure_client_task_id(task)
        return SyncTaskUpsertResponse(applied=False, task=to_sync_record(task))

    if task is None:
        task = Task(
            user_id=current_user.id,
            client_task_id=client_task_id,
            title=payload.title,
            description=payload.description,
            type=payload.type,
            status=payload.status,
        )
        db.add(task)

    apply_sync_payload(task, payload=payload)
    await reconcile_pending_reminder_log(db, task)
    await db.commit()
    await db.refresh(task)
    return SyncTaskUpsertResponse(applied=True, task=to_sync_record(task))


@router.delete("/tasks/{client_task_id}", response_model=SyncTaskUpsertResponse)
async def delete_sync_task(
    client_task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncTaskUpsertResponse:
    task = await _get_task_by_client_id(db, current_user.id, client_task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    mark_sync_task_deleted(task)
    await reconcile_pending_reminder_log(db, task)
    await db.commit()
    await db.refresh(task)
    return SyncTaskUpsertResponse(applied=True, task=to_sync_record(task))


@router.post("/batch", response_model=SyncTaskListResponse)
async def sync_batch(
    payload: SyncBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncTaskListResponse:
    for item in payload.tasks:
        existing = await _get_task_by_client_id(db, current_user.id, item.client_task_id)
        existing_updated_at = ensure_utc_datetime(existing.updated_at) if existing is not None else None
        if existing is not None and existing_updated_at is not None and existing_updated_at >= ensure_utc_datetime(item.updated_at):
            continue
        if existing is None:
            existing = Task(
                user_id=current_user.id,
                client_task_id=item.client_task_id,
                title=item.title,
                description=item.description,
                type=item.type,
                status=item.status,
            )
            db.add(existing)
        apply_sync_payload(existing, payload=SyncTaskUpsert(**item.model_dump(exclude={"client_task_id"})))
        await reconcile_pending_reminder_log(db, existing)

    await db.commit()
    return await bootstrap_sync(db=db, current_user=current_user)
