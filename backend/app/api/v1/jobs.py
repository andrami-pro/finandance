"""Jobs API router.

Endpoints:
  GET /api/v1/jobs/{job_id}  — poll sync job status
"""

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.jobs.sync_jobs import get_job_status

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job(job_id: str, user: CurrentUser) -> dict[str, Any]:
    """Return the current status of a sync job.

    Returns 404 if the job_id is unknown (e.g., server restarted and
    in-memory registry was cleared).
    """
    job = get_job_status(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job
