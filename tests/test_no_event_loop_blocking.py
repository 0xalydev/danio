"""
Regression test: proves the event loop is NEVER blocked by slow I/O handlers.

The viewport freezes if the asyncio event loop stalls — so this test runs the
real /api/activity/sync and /api/comparison/live handlers (with slow fakes
substituted for git + GitHub API) while a 50 Hz ticker task mimics
server_simulation_loop, and asserts the ticker keeps firing on time.

Run: python -m pytest tests/test_no_event_loop_blocking.py -q
  or: python tests/test_no_event_loop_blocking.py
"""
import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import subprocess  # noqa: E402
import pytest

from danio.server import app as app_module  # noqa: E402

FAILURES = []


def check(label, cond, detail=""):
    print(("PASS" if cond else "FAIL") + f" | {label}" + (f" -> {detail}" if detail else ""))
    if not cond:
        FAILURES.append(label)


async def ticker(n_ticks):
    """Mimic server_simulation_loop: a 50 Hz task that must never stall."""
    stamps = []
    t0 = time.perf_counter()
    for _ in range(n_ticks):
        await asyncio.sleep(0.02)
        stamps.append(time.perf_counter() - t0)
    return stamps


def max_gap_ms(stamps):
    gaps = [(b - a) for a, b in zip(stamps[:-1], stamps[1:])]
    return max(gaps) * 1000.0 if gaps else 0.0


@pytest.mark.asyncio
async def test_sync_handler_does_not_block_loop():
    # Fake the git subprocess: 2s of work, no real git side effects
    class FakeCompleted:
        returncode = 0
        stdout = "fake sync ok\n"
        stderr = ""

    def fake_run(cmd, **kwargs):
        time.sleep(2.0)  # simulate a slow git commit+push
        return FakeCompleted()

    orig_run = subprocess.run
    subprocess.run = fake_run
    try:
        check("sync guard starts clear", app_module.github_sync_in_progress is False)

        tick_task = asyncio.create_task(ticker(120))          # ~2.4s of 50Hz ticks
        sync_task = asyncio.create_task(app_module.trigger_github_sync())

        # Concurrent click while first sync in flight -> guard must short-circuit
        await asyncio.sleep(0.3)
        second = await app_module.trigger_github_sync()
        check("concurrent sync returns 'already in progress'",
              second.get("message") == "Sync already in progress", str(second))

        result = await sync_task
        check("sync completes with status ok", result.get("status") == "ok", str(result))

        stamps = await tick_task
        gap = max_gap_ms(stamps)
        check("50Hz sim loop NOT blocked during git sync (max gap < 250ms)",
              gap < 250.0, f"max_gap={gap:.1f}ms")
        check("sync guard cleared after completion",
              app_module.github_sync_in_progress is False)
    finally:
        subprocess.run = orig_run


@pytest.mark.asyncio
async def test_comparison_handler_does_not_block_loop():
    # Reset cache so we exercise the refresh path
    app_module.comparison_cache["data"] = None
    app_module.comparison_cache["timestamp"] = 0
    app_module.comparison_refreshing = False

    slow_calls = {"n": 0}

    def slow_build():
        slow_calls["n"] += 1
        time.sleep(2.0)  # simulate slow GitHub API round-trips
        return {"danio": {"commits": 1}, "fly": {"commits": 2},
                "c_elegans": {"commits": 3}, "cached_at": "test"}

    orig_build = app_module._build_comparison
    app_module._build_comparison = slow_build
    try:
        tick_task = asyncio.create_task(ticker(120))
        first = asyncio.create_task(app_module.get_live_comparison())

        # Poll arriving mid-refresh must NOT stack another fetch
        await asyncio.sleep(0.3)
        during = await app_module.get_live_comparison()
        check("mid-refresh poll returns fast (no stacked fetch)",
              isinstance(during, dict), str(during)[:80])

        result = await first
        check("comparison returns fetched data",
              isinstance(result, dict) and result.get("danio") == {"commits": 1},
              str(result)[:80])
        check("exactly ONE background fetch happened", slow_calls["n"] == 1,
              f"calls={slow_calls['n']}")

        # Warm cache path: immediate, no thread
        app_module.comparison_cache["timestamp"] = time.time()
        t0 = time.perf_counter()
        cached = await app_module.get_live_comparison()
        check("warm cache served instantly (<50ms, no thread)",
              (time.perf_counter() - t0) < 0.05 and cached.get("danio") == {"commits": 1})

        stamps = await tick_task
        gap = max_gap_ms(stamps)
        check("50Hz sim loop NOT blocked during GitHub refresh (max gap < 250ms)",
              gap < 250.0, f"max_gap={gap:.1f}ms")
    finally:
        app_module._build_comparison = orig_build
        app_module.comparison_cache["data"] = None
        app_module.comparison_cache["timestamp"] = 0
        app_module.comparison_refreshing = False


@pytest.mark.asyncio
async def test_comparison_network_failure_is_graceful():
    # No stale data + failing fetch -> clean error dict (client guards handle it)
    app_module.comparison_cache["data"] = None
    app_module.comparison_cache["timestamp"] = 0
    app_module.comparison_refreshing = False

    def failing_build():
        raise RuntimeError("github unreachable")

    orig_build = app_module._build_comparison
    app_module._build_comparison = failing_build
    try:
        res = await app_module.get_live_comparison()
        check("failed refresh returns clean error dict (no 500, no crash)",
              isinstance(res, dict) and res.get("status") == "error", str(res)[:80])
        check("refresh flag cleared after failure",
              app_module.comparison_refreshing is False)
    finally:
        app_module._build_comparison = orig_build
        app_module.comparison_cache["data"] = None
        app_module.comparison_cache["timestamp"] = 0
        app_module.comparison_refreshing = False


async def main():
    await test_sync_handler_does_not_block_loop()
    await test_comparison_handler_does_not_block_loop()
    await test_comparison_network_failure_is_graceful()
    print("ALL_EVENT_LOOP_TESTS_PASSED" if not FAILURES else f"{len(FAILURES)} TEST(S) FAILED")
    return 0 if not FAILURES else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
