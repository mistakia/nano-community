---
title: Labeling standards
description: Nano Community issue & discussion labeling standards
tags: labels, nano, community, management, organization, open
---

# Labeling standards

All new issues should default to `need/triage`, and this label should be removed once all other relevant labels are assigned.

Priority and status live on the [community task board](/roadmap), not in labels. See the [task board protocol](/design/task-board-protocol).

## Mandatory labels

All issues should have a kind and a need label.

### Kind

Overarching type of issue or PR. For an additional layer of specificity, use the `area` label.

| Label               | Description                                                             | Color     |
| ------------------- | ----------------------------------------------------------------------- | --------- |
| `kind/architecture` | Core architecture of project                                            | `#c7def8` |
| `kind/bug`          | A bug in existing code (including security flaws)                       | `#fc2929` |
| `kind/discussion`   | Topical discussion; usually not changes to codebase                     | `#c7def8` |
| `kind/enhancement`  | A net-new feature or improvement to an existing feature                 | `#c7def8` |
| `kind/maintenance`  | Work required to avoid breaking changes or harm to project's status quo | `#c7def8` |
| `kind/support`      | A question or request for support                                       | `#c7def8` |
| `kind/test`         | Testing work                                                            | `#c7def8` |

### Need

These labels indicate needs that must be met in order for the issue or PR to be completed and closed.

| Label                   | Description                                | Color     |
| ----------------------- | ------------------------------------------ | --------- |
| `need/analysis`         | Needs further analysis before proceeding   | `#ededed` |
| `need/author-input`     | Needs input from the original author       | `#ededed` |
| `need/community-input`  | Needs input from the wider community       | `#ededed` |
| `need/maintainer-input` | Needs input from the current maintainer(s) | `#ededed` |
| `need/triage`           | Needs initial labeling and prioritization  | `#ededed` |

## Optional (but helpful) labels

### Global

These labels exist for continuity with global GitHub practices for new contributors.

| Label              | Description                               | Color     |
| ------------------ | ----------------------------------------- | --------- |
| `bounty`           | Has bounty                                | `#1cfc60` |
| `good first issue` | Good issue for new contributors           | `#7057ff` |
| `help wanted`      | Seeking public contribution on this issue | `#0e8a16` |

### Difficulty

Estimate of an issue's difficulty; note that this is different than `effort`, below.

| Label         | Description                                                | Color     |
| ------------- | ---------------------------------------------------------- | --------- |
| `dif/trivial` | Can be confidently tackled by newcomers                    | `#bfe5bf` |
| `dif/easy`    | Someone with a little familiarity can pick up              | `#bfe5bf` |
| `dif/medium`  | Prior experience is likely helpful                         | `#bfe5bf` |
| `dif/hard`    | Having worked on the specific codebase is important        | `#bfe5bf` |
| `dif/expert`  | Extensive knowledge (implications, ramifications) required | `#bfe5bf` |

### Effort

Similar to T-shirt sizing, this estimates the _amount_ of work. This can be different than `difficulty`, e.g. something can be easy but require a lot of time to complete, or vice versa.

| Label          | Description                                           | Color     |
| -------------- | ----------------------------------------------------- | --------- |
| `effort/hours` | Estimated to take one or several hours                | `#fef2c0` |
| `effort/days`  | Estimated to take multiple days, but less than a week | `#fef2c0` |
| `effort/weeks` | Estimated to take multiple weeks                      | `#fef2c0` |

### Status

Only `status/duplicate` remains, to close a duplicate issue or PR.

| Label              | Description                               | Color     |
| ------------------ | ----------------------------------------- | --------- |
| `status/duplicate` | This issue or pull request already exists | `#e9dfeb` |

### Topics

Topics will vary according to the particular project, but will often have commonalities that overlay across multiple projects. Design is one prominent example of this, particularly since the following design labels are used to generate a common design tracking board:

| Label                    | Description                                        | Color     |
| ------------------------ | -------------------------------------------------- | --------- |
| `topic/design-content`   | Content design, writing, information architecture  | `#3f4b56` |
| `topic/design-front-end` | Front-end implementation of UX/UI work             | `#3f4b56` |
| `topic/design-ux`        | UX strategy, research, not solely visual design    | `#3f4b56` |
| `topic/design-video`     | Video and/or motion design                         | `#3f4b56` |
| `topic/design-visual`    | Visual design ONLY, not part of a larger UX effort | `#3f4b56` |
