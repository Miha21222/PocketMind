from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskOut,
    TaskRescheduleRequest,
    TaskSnoozeRequest,
    TaskUpdate,
)
from app.services.reminder_cleanup_service import cleanup_task_reminder_messages
from app.services.reminder_planning_service import next_recurrence_reminder, next_strategy_reminder
from app.services.task_actions import cancel_task as apply_cancel
from app.services.task_actions import complete_task as apply_complete
from app.services.task_actions import snooze_task as apply_snooze
from app.services.user_settings_service import (
    clamp_int,
    normalize_hhmm,
    normalize_reminder_mode,
    normalize_timezone,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _apply_view_filters(query, view: str | None, now: datetime):
    if view == "active":
        query = query.where(Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]))
    elif view == "today":
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        query = query.where(
            Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]),
            or_(
                and_(Task.deadline_at.is_not(None), Task.deadline_at >= day_start, Task.deadline_at < day_end),
                and_(Task.remind_at.is_not(None), Task.remind_at >= day_start, Task.remind_at < day_end),
            ),
        )
    elif view == "overdue":
        query = query.where(
            Task.deadline_at.is_not(None),
            Task.deadline_at < now,
            Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]),
        )
    elif view == "waiting":
        query = query.where(
            Task.type == TaskType.waiting,
            Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]),
        )
    elif view == "completed":
        query = query.where(Task.status == TaskStatus.done)
    elif view == "cancelled":
        query = query.where(Task.status == TaskStatus.cancelled)
    elif view == "no_deadline":
        query = query.where(
            Task.deadline_at.is_(None),
            Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]),
        )
    elif view == "upcoming":
        query = query.where(
            Task.remind_at.is_not(None),
            Task.remind_at > now,
            Task.status.notin_([TaskStatus.done, TaskStatus.cancelled]),
        )
    return query


def _apply_timing_by_type(task: Task, current_user: User, now: datetime, reset_quick_timer: bool = False) -> None:
    timezone = normalize_timezone(current_user.preferred_timezone)

    if task.type == TaskType.quick:
        task.reminder_mode = ReminderMode.none
        task.reminder_time_local = None
        task.reminder_interval_hours = None
        task.deadline_at = None
        task.recurrence_rule = None
        if reset_quick_timer or task.remind_at is None:
            quick_delay = clamp_int(current_user.default_quick_delay_minutes, 10, 5, 240)
            task.remind_at = now + timedelta(minutes=quick_delay)
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned
        return

    if task.type == TaskType.deadline:
        mode = normalize_reminder_mode(task.reminder_mode.value if task.reminder_mode else None, current_user.default_deadline_reminder_mode)
        task.reminder_mode = ReminderMode(mode)
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, current_user.default_deadline_reminder_time_local)
        task.reminder_interval_hours = clamp_int(
            task.reminder_interval_hours,
            current_user.default_deadline_reminder_interval_hours,
            1,
            24,
        )
        task.remind_at = next_strategy_reminder(
            now_utc=now,
            timezone=timezone,
            mode=task.reminder_mode,
            hhmm=task.reminder_time_local,
            interval_hours=task.reminder_interval_hours,
            deadline_at=task.deadline_at,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    if task.type == TaskType.waiting:
        mode = normalize_reminder_mode(task.reminder_mode.value if task.reminder_mode else None, current_user.default_waiting_reminder_mode)
        task.reminder_mode = ReminderMode(mode)
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, current_user.default_waiting_reminder_time_local)
        task.reminder_interval_hours = clamp_int(
            task.reminder_interval_hours,
            current_user.default_waiting_reminder_interval_hours,
            1,
            24,
        )
        task.remind_at = next_strategy_reminder(
            now_utc=now,
            timezone=timezone,
            mode=task.reminder_mode,
            hhmm=task.reminder_time_local,
            interval_hours=task.reminder_interval_hours,
            deadline_at=task.deadline_at,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    if task.type == TaskType.recurring:
        task.reminder_mode = ReminderMode.none
        task.reminder_interval_hours = None
        task.deadline_at = None
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, current_user.default_recurring_reminder_time_local)
        task.remind_at = next_recurrence_reminder(
            now_utc=now,
            timezone=timezone,
            recurrence_rule=task.recurrence_rule,
            hhmm=task.reminder_time_local,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    # no_deadline
    task.reminder_mode = ReminderMode.none
    task.reminder_time_local = None
    task.reminder_interval_hours = None
    if task.status not in {TaskStatus.done, TaskStatus.cancelled} and task.remind_at:
        task.status = TaskStatus.planned
    elif task.status not in {TaskStatus.done, TaskStatus.cancelled}:
        task.status = TaskStatus.new


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    type_filter: TaskType | None = Query(default=None, alias="type"),
    view: str | None = Query(default="active"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskListResponse:
    now = datetime.now(UTC)
    query = select(Task).where(Task.user_id == current_user.id)

    if status_filter:
        query = query.where(Task.status == status_filter)
    if type_filter:
        query = query.where(Task.type == type_filter)
    if date_from:
        query = query.where(or_(Task.deadline_at >= date_from, Task.remind_at >= date_from))
    if date_to:
        query = query.where(or_(Task.deadline_at <= date_to, Task.remind_at <= date_to))

    query = _apply_view_filters(query, view, now)
    query = query.order_by(Task.remind_at.asc().nullslast(), Task.deadline_at.asc().nullslast(), Task.created_at.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    items = (await db.scalars(query)).all()
    return TaskListResponse(items=[TaskOut.model_validate(item) for item in items], total=total)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    now = datetime.now(UTC)
    task = Task(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        type=payload.type,
        deadline_at=payload.deadline_at,
        remind_at=payload.remind_at,
        reminder_mode=payload.reminder_mode or ReminderMode.none,
        reminder_time_local=payload.reminder_time_local,
        reminder_interval_hours=payload.reminder_interval_hours,
        recurrence_rule=payload.recurrence_rule,
        status=TaskStatus.new,
    )
    _apply_timing_by_type(task, current_user=current_user, now=now, reset_quick_timer=True)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    updates = payload.model_dump(exclude_unset=True)
    original_type = task.type

    for key, value in updates.items():
        setattr(task, key, value)

    now = datetime.now(UTC)
    _apply_timing_by_type(
        task,
        current_user=current_user,
        now=now,
        reset_quick_timer=(task.type == TaskType.quick and original_type != TaskType.quick),
    )

    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", response_model=TaskOut)
async def soft_cancel_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status == TaskStatus.done:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid state transition: done task cannot be cancelled",
        )

    apply_cancel(task)
    await db.commit()
    await db.refresh(task)
    await cleanup_task_reminder_messages(db, task.id)
    return TaskOut.model_validate(task)


@router.post("/{task_id}/done", response_model=TaskOut)
async def mark_done(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status == TaskStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid state transition: cancelled task cannot be marked done",
        )

    apply_complete(task, timezone=normalize_timezone(current_user.preferred_timezone))
    await db.commit()
    await db.refresh(task)
    await cleanup_task_reminder_messages(db, task.id)
    return TaskOut.model_validate(task)


@router.post("/{task_id}/cancel", response_model=TaskOut)
async def cancel_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status == TaskStatus.done:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid state transition: done task cannot be cancelled",
        )

    apply_cancel(task)
    await db.commit()
    await db.refresh(task)
    await cleanup_task_reminder_messages(db, task.id)
    return TaskOut.model_validate(task)


@router.post("/{task_id}/snooze", response_model=TaskOut)
async def snooze_task(
    task_id: int,
    payload: TaskSnoozeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    apply_snooze(task, payload.minutes)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.post("/{task_id}/reschedule", response_model=TaskOut)
async def reschedule_task(
    task_id: int,
    payload: TaskRescheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.remind_at = payload.remind_at
    task.deadline_at = payload.deadline_at
    task.snoozed_until = None
    if task.status not in {TaskStatus.done, TaskStatus.cancelled} and payload.remind_at:
        task.status = TaskStatus.planned
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)
