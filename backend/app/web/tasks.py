"""Dashboard and task form/action routes."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.task import Task, TaskStatus, TaskType
from app.models.user import User
from app.services.task_application_service import (
    TaskCreateCommand,
    TaskUpdateCommand,
    TaskValidationError,
    cancel_task,
    delete_task,
    complete_task,
    get_preferences,
    get_task,
    create_task,
    update_task,
)
from app.services.reminder_cleanup_service import cleanup_task_reminders_if_closed
from app.services.task_sync_service import normalize_task_overdue_state
from app.web.dependencies import (  # type: ignore[reportMissingImports]
    check_csrf,
    get_web_current_user,
    redirect,
    render,
)

router = APIRouter()


def parsed_deadline(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(f"{value}T23:59:00+00:00")
    except ValueError as exc:
        raise TaskValidationError("deadline_at", "Invalid deadline") from exc


async def user_tasks(
    db: AsyncSession, user: User, view: str = "active", type_filter: str = "all"
) -> list[Task]:
    tasks = list(
        (
            await db.scalars(
                select(Task).where(Task.user_id == user.id, Task.deleted_at.is_(None))
            )
        ).all()
    )
    now = datetime.now(UTC)
    for task in tasks:
        normalize_task_overdue_state(task, now)
    filters = {
        "completed": {TaskStatus.done},
        "cancelled": {TaskStatus.cancelled},
        "overdue": {TaskStatus.overdue},
    }
    if view in filters:
        tasks = [task for task in tasks if task.status in filters[view]]
    elif view == "active":
        tasks = [
            task
            for task in tasks
            if task.status not in {TaskStatus.done, TaskStatus.cancelled}
        ]
    if type_filter in {item.value for item in TaskType}:
        tasks = [task for task in tasks if task.type.value == type_filter]
    return sorted(
        tasks,
        key=lambda task: (
            task.remind_at or task.deadline_at or datetime.max.replace(tzinfo=UTC),
            task.created_at,
        ),
    )


async def task_form_response(
    request: Request,
    user: User,
    db: AsyncSession,
    task: Task | None = None,
    errors: dict[str, str] | None = None,
    values: dict[str, object] | None = None,
) -> HTMLResponse:
    return render(
        request,
        "task_form.html",
        user,
        task=task,
        errors=errors or {},
        values=values or {},
        preferences=await get_preferences(db, user),
    )


@router.get("/")
async def dashboard(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    return render(
        request,
        "dashboard.html",
        user,
        tasks=await user_tasks(db, user),
        preferences=await get_preferences(db, user),
        message=request.query_params.get("message"),
    )


@router.get("/tasks")
async def tasks_page(
    request: Request,
    view: str = "active",
    type: str = "all",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    return render(
        request,
        "tasks.html",
        user,
        tasks=await user_tasks(db, user, view, type),
        view=view,
        type_filter=type,
        preferences=await get_preferences(db, user),
        message=request.query_params.get("message"),
    )


@router.get("/tasks/new")
async def new_task_page(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    return await task_form_response(request, user, db)


def form_values(
    title: str,
    description: str,
    type: str,
    deadline_at: str,
    recurrence_rule: str,
    reminder_mode: str,
    reminder_time_local: str,
    reminder_interval_hours: int,
) -> dict[str, object]:
    return {
        "title": title,
        "description": description,
        "type": type,
        "deadline_at": parsed_deadline(deadline_at),
        "recurrence_rule": recurrence_rule,
        "reminder_mode": reminder_mode,
        "reminder_time_local": reminder_time_local,
        "reminder_interval_hours": reminder_interval_hours,
    }


async def create_from_form(
    request: Request,
    csrf: str,
    command: TaskCreateCommand,
    db: AsyncSession,
    user: User,
):
    try:
        task = await create_task(db, user, command)
        await db.commit()
    except TaskValidationError as exc:
        return None, await task_form_response(
            request,
            user,
            db,
            None,
            {exc.field: str(exc)},
            command.model_dump(mode="json"),
        )
    return task, None


async def update_from_form(
    request: Request,
    csrf: str,
    client_task_id: str,
    command: TaskUpdateCommand,
    db: AsyncSession,
    user: User,
):
    task = await get_task(db, user, client_task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        updated = await update_task(db, user, client_task_id, command)
        if updated is None:
            raise HTTPException(status_code=404, detail="Task not found")
        await db.commit()
    except TaskValidationError as exc:
        return None, await task_form_response(
            request,
            user,
            db,
            task,
            {exc.field: str(exc)},
            command.model_dump(mode="json"),
        )
    return updated, None


@router.post("/tasks/new")
async def new_task(
    request: Request,
    csrf: Annotated[str, Form()] = "",
    title: Annotated[str, Form()] = "",
    description: Annotated[str, Form()] = "",
    type: Annotated[str, Form()] = "quick",
    deadline_at: Annotated[str, Form()] = "",
    recurrence_rule: Annotated[str, Form()] = "",
    reminder_mode: Annotated[str, Form()] = "none",
    reminder_time_local: Annotated[str, Form()] = "",
    reminder_interval_hours: Annotated[int, Form()] = 4,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    check_csrf(request, csrf)
    values = form_values(
        title,
        description,
        type,
        deadline_at,
        recurrence_rule,
        reminder_mode,
        reminder_time_local,
        reminder_interval_hours,
    )
    try:
        command = TaskCreateCommand.model_validate(values)
    except ValidationError as exc:
        field = str(exc.errors()[0]["loc"][0])
        return await task_form_response(
            request, user, db, None, {field: str(exc)}, values
        )
    task, response = await create_from_form(request, csrf, command, db, user)
    if response is not None:
        return response
    assert task is not None
    return redirect(f"/tasks/{task.client_task_id}", "Task saved")


@router.get("/tasks/{client_task_id}")
async def task_detail(
    request: Request,
    client_task_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    task = await get_task(db, user, client_task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return render(
        request,
        "task_detail.html",
        user,
        task=task,
        preferences=await get_preferences(db, user),
        message=request.query_params.get("message"),
    )


@router.get("/tasks/{client_task_id}/edit")
async def edit_task_page(
    request: Request,
    client_task_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    task = await get_task(db, user, client_task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return await task_form_response(request, user, db, task)


@router.post("/tasks/{client_task_id}/edit")
async def edit_task(
    request: Request,
    client_task_id: str,
    csrf: Annotated[str, Form()] = "",
    title: Annotated[str, Form()] = "",
    description: Annotated[str, Form()] = "",
    type: Annotated[str, Form()] = "quick",
    deadline_at: Annotated[str, Form()] = "",
    recurrence_rule: Annotated[str, Form()] = "",
    reminder_mode: Annotated[str, Form()] = "none",
    reminder_time_local: Annotated[str, Form()] = "",
    reminder_interval_hours: Annotated[int, Form()] = 4,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    check_csrf(request, csrf)
    values = form_values(
        title,
        description,
        type,
        deadline_at,
        recurrence_rule,
        reminder_mode,
        reminder_time_local,
        reminder_interval_hours,
    )
    try:
        command = TaskUpdateCommand.model_validate(values)
    except ValidationError as exc:
        task = await get_task(db, user, client_task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        field = str(exc.errors()[0]["loc"][0])
        return await task_form_response(
            request, user, db, task, {field: str(exc)}, values
        )
    saved, response = await update_from_form(
        request, csrf, client_task_id, command, db, user
    )
    if response is not None:
        return response
    assert saved is not None
    return redirect(f"/tasks/{saved.client_task_id}", "Task saved")


@router.post("/tasks/{client_task_id}/{action}")
async def task_action(
    request: Request,
    client_task_id: str,
    action: str,
    csrf: Annotated[str, Form()] = "",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    check_csrf(request, csrf)
    if action == "complete":
        task = await complete_task(db, user, client_task_id)
    elif action == "cancel":
        task = await cancel_task(db, user, client_task_id)
    elif action == "delete":
        task = await delete_task(db, user, client_task_id)
    else:
        raise HTTPException(status_code=404)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.commit()
    # Once the task is done/cancelled/deleted, its already-sent reminder
    # messages (Snooze/Open cards) are no longer actionable; delete them.
    # Runs after the state commit so a Telegram outage can't roll back the
    # task transition.
    await cleanup_task_reminders_if_closed(db, task)
    return redirect("/tasks", "Task updated")
