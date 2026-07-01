"""
News_Pond — Automation entry point
==================================

Run by GitHub Actions daily (and locally). Orchestrates two pipelines:

  1. tools_pipeline       — tracks languages, frameworks & AI models. Targeted feeds
                            for the always-on tools PLUS broad "discovery" feeds where
                            an LLM auto-detects brand-new tools (e.g. a fresh model
                            from ZhipuAI) and creates them with no hardcoding.

  2. opportunities_pipeline — hackathons, competitions, conferences, internships &
                            jobs for freshers. Curated JSON + Devpost + Unstop.

Everything is idempotent (dedupe on unique source_url), so re-running is safe.

Run locally:
    pip install -r requirements.txt
    cp .env.example .env   # fill in values
    python scraper.py
"""

from __future__ import annotations

import common
import opportunities_pipeline
import tools_pipeline


def run() -> None:
    db = common.get_db()

    tools_n = tools_pipeline.run(db)
    opps_n = opportunities_pipeline.run(db)

    print(f"\nDone. Tools: {tools_n} updates · Opportunities: {opps_n} upserted.")


if __name__ == "__main__":
    run()
