"""
cli-anything-webpomodoro — WebPomodoro macOS app CLI interface.

Commands:
  timer status    Show current timer state
  timer start     Start focus session
  timer pause     Pause timer
  timer stop      Stop/reset timer
  timer break     Start break session
  timer ui        Show all UI elements (debug)

  task current    Show currently tracked task
  task list       List recent tasks from IndexedDB

  session today   Show today's session summary
  session history List recent Pomodoro records

  data settings   Show app settings and user info
  data goals      Show daily goals

  repl            Interactive REPL mode (default)
"""
import click
import json
import sys


def _out(data, json_mode: bool) -> None:
    if json_mode:
        click.echo(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    click.echo(f"  {k}:")
                    click.echo(f"    {json.dumps(v, ensure_ascii=False)}")
                else:
                    click.echo(f"  {k}: {v}")
        elif isinstance(data, list):
            for item in data:
                click.echo(f"  - {json.dumps(item, ensure_ascii=False)}")
        else:
            click.echo(str(data))


# ── Root group ─────────────────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.option("--json", "json_mode", is_flag=True, help="Output as JSON")
@click.pass_context
def cli(ctx, json_mode):
    """WebPomodoro CLI — control your Pomodoro timer from the command line.

    Run without subcommand to enter interactive REPL mode.
    """
    ctx.ensure_object(dict)
    ctx.obj["json"] = json_mode
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


# ── timer group ────────────────────────────────────────────────────────────

@cli.group()
def timer():
    """Timer control commands."""
    pass


@timer.command("status")
@click.option("--json", "json_mode", is_flag=True)
def timer_status(json_mode):
    """Show current timer state (label + tracked task ID)."""
    from cli_anything.webpomodoro.utils.webpomodoro_backend import get_timer_state, is_running
    running = is_running()
    if not running:
        data = {"running": False, "message": "WebPomodoro is not running"}
    else:
        data = get_timer_state()
        data["running"] = True
    _out(data, json_mode)


@timer.command("start")
@click.option("--json", "json_mode", is_flag=True)
def timer_start(json_mode):
    """Start a focus/work session."""
    from cli_anything.webpomodoro.core.timer import start_work
    result = start_work()
    _out(result, json_mode)
    if not json_mode:
        label = __import__("cli_anything.webpomodoro.core.timer",
                           fromlist=["get_status_label"]).get_status_label()
        click.echo(f"  ▶ Timer: {label}")


@timer.command("pause")
@click.option("--json", "json_mode", is_flag=True)
def timer_pause(json_mode):
    """Pause the current timer."""
    from cli_anything.webpomodoro.core.timer import pause_timer
    result = pause_timer()
    _out(result, json_mode)


@timer.command("stop")
@click.option("--json", "json_mode", is_flag=True)
def timer_stop(json_mode):
    """Stop and reset the current timer."""
    from cli_anything.webpomodoro.core.timer import stop_timer
    result = stop_timer()
    _out(result, json_mode)


@timer.command("break")
@click.option("--json", "json_mode", is_flag=True)
def timer_break(json_mode):
    """Start a break session."""
    from cli_anything.webpomodoro.core.timer import start_break
    result = start_break()
    _out(result, json_mode)


@timer.command("ui")
def timer_ui():
    """[Debug] List all UI elements in the main window."""
    from cli_anything.webpomodoro.core.timer import list_ui_elements
    click.echo(list_ui_elements())


# ── task group ─────────────────────────────────────────────────────────────

@cli.group()
def task():
    """Task management commands."""
    pass


@task.command("current")
@click.option("--json", "json_mode", is_flag=True)
def task_current(json_mode):
    """Show the currently tracked task."""
    from cli_anything.webpomodoro.core.data import get_current_task_info
    data = get_current_task_info()
    _out(data, json_mode)


@task.command("list")
@click.option("--limit", default=20, help="Number of tasks to show")
@click.option("--json", "json_mode", is_flag=True)
def task_list(limit, json_mode):
    """List recent tasks from local database."""
    from cli_anything.webpomodoro.utils.webpomodoro_backend import read_tasks
    tasks = read_tasks(limit=limit)
    if json_mode:
        click.echo(json.dumps(tasks, ensure_ascii=False, indent=2))
    else:
        click.echo(f"  Recent tasks ({len(tasks)}):")
        for i, t in enumerate(tasks, 1):
            task_id = t.get("id", "")[:36]
            words = t.get("data", {}).get("_raw_words", [])
            name_hint = " ".join(words[:4]) if words else "(binary data)"
            click.echo(f"  {i:2}. [{task_id}] {name_hint}")


# ── session group ──────────────────────────────────────────────────────────

@cli.group()
def session():
    """Session statistics commands."""
    pass


@session.command("today")
@click.option("--json", "json_mode", is_flag=True)
def session_today(json_mode):
    """Show today's focus session summary."""
    from cli_anything.webpomodoro.core.data import get_full_status
    data = get_full_status()
    if not json_mode:
        click.echo(f"\n  🍅 WebPomodoro 状态")
        click.echo(f"  ─────────────────────────────")
        timer_info = data.get("timer", {})
        click.echo(f"  计时器:   {timer_info.get('label', 'unknown')}")
        task_id = timer_info.get("timingTaskId", "")
        click.echo(f"  当前任务: {task_id[:16]}..." if task_id else "  当前任务: 无")
        user = data.get("user", {})
        click.echo(f"  用户:     {user.get('name', '')} <{user.get('email', '')}>")
        click.echo(f"  总番茄数: {data.get('totalPomodoros', 0)}")
        goals = data.get("goals", [])
        for g in goals:
            click.echo(f"  每日目标: {g.get('display', '')}")
        click.echo(f"  最后同步: {data.get('lastSync', '')}")
        click.echo()
    else:
        click.echo(json.dumps(data, ensure_ascii=False, indent=2))


@session.command("history")
@click.option("--limit", default=10, help="Number of records")
@click.option("--json", "json_mode", is_flag=True)
def session_history(limit, json_mode):
    """Show recent Pomodoro session records."""
    from cli_anything.webpomodoro.core.data import get_recent_pomodoros
    records = get_recent_pomodoros(limit=limit)
    if json_mode:
        click.echo(json.dumps(records, ensure_ascii=False, indent=2))
    else:
        click.echo(f"  Recent Pomodoro records ({len(records)}):")
        for i, r in enumerate(records, 1):
            rid = r.get("id", "")[:24]
            click.echo(f"  {i:2}. {rid}")


# ── data group ─────────────────────────────────────────────────────────────

@cli.group()
def data():
    """Raw data access commands."""
    pass


@data.command("settings")
@click.option("--json", "json_mode", is_flag=True)
def data_settings(json_mode):
    """Show app settings and logged-in user info."""
    from cli_anything.webpomodoro.core.data import get_user_info
    info = get_user_info()
    _out(info, json_mode)


@data.command("goals")
@click.option("--json", "json_mode", is_flag=True)
def data_goals(json_mode):
    """Show daily goals configuration."""
    from cli_anything.webpomodoro.core.data import get_goals
    goals = get_goals()
    _out(goals, json_mode)


@data.command("localstorage")
@click.option("--json", "json_mode", is_flag=True)
def data_localstorage(json_mode):
    """Dump all LocalStorage key-value pairs."""
    from cli_anything.webpomodoro.utils.webpomodoro_backend import read_localstorage
    ls = read_localstorage()
    _out(ls, json_mode)


# ── REPL ───────────────────────────────────────────────────────────────────

@cli.command("repl")
def repl():
    """Start interactive REPL session."""
    try:
        from cli_anything.webpomodoro.utils.repl_skin import ReplSkin
        skin = ReplSkin("webpomodoro", version="1.0.0")
    except Exception:
        skin = None

    commands = {
        "timer status": "Show current timer state",
        "timer start": "Start focus session",
        "timer pause": "Pause timer",
        "timer stop": "Stop timer",
        "timer break": "Start break",
        "task current": "Show current task",
        "task list": "List recent tasks",
        "session today": "Today's summary",
        "session history": "Recent records",
        "data settings": "User & app info",
        "data goals": "Daily goals",
        "help": "Show this help",
        "exit": "Exit REPL",
    }

    if skin:
        skin.print_banner()
        skin.info("输入 'help' 查看所有命令，'exit' 退出")
    else:
        click.echo("🍅 WebPomodoro REPL — type 'help' or 'exit'")

    while True:
        try:
            if skin:
                try:
                    from prompt_toolkit import PromptSession
                    pt = PromptSession()
                    line = pt.prompt("webpomodoro> ").strip()
                except Exception:
                    line = input("webpomodoro> ").strip()
            else:
                line = input("webpomodoro> ").strip()
        except (EOFError, KeyboardInterrupt):
            click.echo("\nBye!")
            break

        if not line:
            continue
        if line in ("exit", "quit", "q"):
            click.echo("Bye!")
            break
        if line == "help":
            for cmd, desc in commands.items():
                click.echo(f"  {cmd:<20} {desc}")
            continue

        # Map REPL commands to Click subcommands
        args = line.split()
        try:
            cli.main(args, standalone_mode=False)
        except SystemExit:
            pass
        except Exception as e:
            if skin:
                skin.error(str(e))
            else:
                click.echo(f"Error: {e}")
