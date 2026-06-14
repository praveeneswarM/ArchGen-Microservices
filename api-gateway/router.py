import httpx
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.status import HTTP_502_BAD_GATEWAY
from .config import Settings, get_settings
from .utils.correlation import get_correlation_id

router = APIRouter()

# Health endpoints
@router.get("/healthz")
async def healthz():
    return JSONResponse(content={"status": "healthy"})

@router.get("/readyz")
async def readyz():
    return JSONResponse(content={"status": "ready"})

# Proxy endpoint – catches all /api/* routes
@router.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]) 
async def proxy(full_path: str, request: Request):
    settings: Settings = get_settings()
    # Determine target service based on path
    path = f"/api/{full_path}"
    if path.startswith("/api/auth/"):
        base_url = settings.AUTH_SERVICE_URL.rstrip("/")
    elif path.startswith("/api/projects"):
        base_url = settings.PROJECT_SERVICE_URL.rstrip("/")
    else:
        base_url = settings.ARCHITECTURE_SERVICE_URL.rstrip("/")

    # Build the forward URL preserving query parameters
    query = request.url.query
    forward_url = f"{base_url}{path}"
    if query:
        forward_url = f"{forward_url}?{query}"

    # Prepare headers – forward everything except hop‑by‑hop headers
    hop_by_hop = {"host", "connection", "content-length", "transfer-encoding", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "upgrade"}
    headers = {k: v for k, v in request.headers.items() if k.lower() not in hop_by_hop}
    correlation_id = get_correlation_id(request)
    if correlation_id:
        headers["X-Correlation-Id"] = correlation_id

    # Read body (may be empty)
    body = await request.body()

    timeout = settings.GATEWAY_REQUEST_TIMEOUT
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream(
                method=request.method,
                url=forward_url,
                headers=headers,
                content=body,
            ) as resp:
                # Streaming response back to the client, preserving status and headers
                streaming_response = StreamingResponse(
                    resp.aiter_raw(),
                    status_code=resp.status_code,
                    headers=dict(resp.headers),
                )
                if correlation_id:
                    streaming_response.headers["X-Correlation-Id"] = correlation_id
                return streaming_response
        except httpx.RequestError as exc:
            raise HTTPException(status_code=HTTP_502_BAD_GATEWAY, detail=str(exc))
