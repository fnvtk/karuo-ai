from setuptools import setup, find_namespace_packages

setup(
    name="cli-anything-webpomodoro",
    version="1.0.0",
    description="CLI interface for WebPomodoro macOS app — Agent-native Pomodoro control",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    install_requires=[
        "click>=8.0",
        "prompt_toolkit>=3.0",
    ],
    entry_points={
        "console_scripts": [
            "cli-anything-webpomodoro=cli_anything.webpomodoro.webpomodoro_cli:cli",
        ]
    },
    python_requires=">=3.10",
)
