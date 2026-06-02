
# Collective Intelligence Design — MVP Plan (v2)

## Product shape

A multi-tenant analytics platform. Each **company** has its own private workspace ("access"). Employees register inside their company, complete a structured profile + two assessments (DISC + Cognitive Styles), and admins see aggregated Collective Intelligence analytics across the company → departments → teams.

The core dashboard view:
1. **CI Score gauge (0–100%)** for the selected entity.
2. **CI distribution visualization** — heatmap/treemap showing where collective intelligence is strongest and weakest across departments and teams.
3. **Customizable Insights panel** — user toggles which lenses to display (skills, DISC mix, cognitive styles, collaboration, innovation, role balance, automation risk).
4. **Collective Blindness** — scaffolded as a "Layer 2 — Coming soon" tab (computation deferred per your direction).

## Multi-tenant access model

- Each company = one `organization` row = isolated workspace.
- Roles in a separate `user_roles` table: `org_admin`, `employee`.
- First signup for a new company creates the org and makes that user `org_admin`.
- Admins invite employees by email (invite tokens). Invitees join the existing org as `employee`.
- RLS: every row is scoped by `org_id`. Employees see only their own profile + aggregated dashboards (no individual peer data). Admins see everything inside their company. No cross-company access ever.

## Employee data captured at registration

**Personal**
- full_name, age, gender, religion (optional), sexual_orientation (optional)

**Background**
- education_level, field_of_study, languages (multi-select)

**Professional**
- job_title, department (HR, Finance, Engineering, Sales, Marketing, Operations, Other), team, role_type (individual_contributor | manager | executive)
- core_skills (multi-select tags from seeded taxonomy + free-add)
- work_style sliders (0–100): collaboration, independent_work, task_repetition, idea_generation/innovation

**Assessment 1 — DISC personality (12-question forced-choice)**
- Produces D, I, S, C sub-scores + dominant type.

**Assessment 2 — Cognitive Thinking Styles (10-question)**
- Based on the **Herrmann-style four-quadrant model** (Analytical, Practical, Relational, Experimental) — public framework, fast to complete, reveals dominant thinking mode.
- Produces 4 sub-scores + dominant style.

Onboarding flow: Profile → Background → Professional → DISC → Cognitive Styles → Done. Re-takeable anytime from Settings.

## CI Engine (deterministic MVP)

Per entity (company / department / team):

```text
skill_diversity_score        = normalized Shannon entropy over skill tags
disc_diversity_score         = normalized Shannon entropy over DISC dominant types
cognitive_diversity_score    = normalized Shannon entropy over thinking-style dominants
collaboration_balance_score  = 100 - normalized stdev(collaboration slider)
innovation_score             = mean(idea_generation slider)
role_distribution_score      = coverage of {IC, manager, executive} + dept archetypes

CI_SCORE = 0.20 * skill_diversity
         + 0.15 * disc_diversity
         + 0.15 * cognitive_diversity
         + 0.15 * collaboration_balance
         + 0.20 * innovation_score
         + 0.15 * role_distribution
```

Computed via server function on profile change; cached in `ci_scores`. Weights stored in `ci_weights` (per-org, tunable later).

## Insights panel (customizable)

Grid of toggleable lenses; selection persists per user.

- Skill coverage radar (entity vs. company mean)
- DISC mix pie
- Cognitive styles pie
- Collaboration vs. Innovation scatter
- Department CI heatmap
- Role distribution bar
- Automation risk badge per dept (high task_repetition + low innovation → high risk)

"Collective Blindness" tab: visible, marked **Layer 2 — Coming soon** with explainer.

## AI Assistant (Lovable AI Gateway, `google/gemini-3-flash-preview`)

Server function sends only **aggregated** metrics + skill/role/cognitive distributions for the selected entity (never personal rows). Returns:
- Hiring suggestion (role + skills + cognitive profile gap)
- Team optimization (rebalancing moves)
- Automation risk narrative

## Visualizations

Recharts: radar, bar, pie, scatter. Custom SVG arc gauge + CSS-grid heatmap for the CI distribution view.

## Routes

```text
/                              Marketing landing
/login, /signup                (signup = create new company OR accept invite token)
/onboarding                    Profile + Background + Professional + DISC + Cognitive
/_authenticated/
  dashboard                    Company overview (gauge + distribution + insights)
  entities/$entityId           Drilldown into department or team
  team                         Member list (admins only)
  assistant                    Full AI conversation, entity-scoped
  settings/profile             Edit profile + re-take either assessment
  settings/org                 Admins: invite employees, manage departments/teams
```

## Database (Lovable Cloud)

- `organizations` (id, name, created_by, created_at)
- `org_invites` (id, org_id, email, token, role, expires_at, accepted_at)
- `entities` (id, org_id, parent_id nullable, name, type: company|department|team)
- `profiles` (id → auth.users, org_id, full_name, age, gender, religion?, sexual_orientation?, education_level, field_of_study, job_title, role_type, department_entity_id, team_entity_id)
- `user_roles` (user_id, org_id, role)
- `skills` (id, name) + `profile_skills` (profile_id, skill_id)
- `languages` + `profile_languages`
- `work_style` (profile_id, collaboration, independent_work, task_repetition, idea_generation)
- `disc_results` (profile_id, d, i, s, c, dominant_type, completed_at)
- `cognitive_results` (profile_id, analytical, practical, relational, experimental, dominant_style, completed_at)
- `ci_scores` (entity_id, score, sub_scores jsonb, computed_at)
- `ci_weights` (org_id, jsonb)
- `insights_preferences` (user_id, jsonb)
- `ai_suggestions` (entity_id, kind, content, created_at)

All public tables: `GRANT`s + RLS scoped by `org_id` via a security-definer `current_org()` + `has_role()` helper. Roles enforced server-side only.

## In scope

Multi-tenant auth + invites, full schema with RLS, full onboarding (profile + DISC + cognitive), CI engine, dashboards (company/department/team), customizable insights, AI assistant, admin invite + entity management, demo-seed button for empty orgs.

## Out of scope (future)

- Computed Collective Blindness math (placeholder only)
- CSV / HRIS import
- Billing, multi-org per user, audit log
- Validated psychometrics beyond DISC + Herrmann-style
- In-UI weight editor

## Build order

1. Enable Lovable Cloud; schema + RLS + roles + `current_org()`.
2. Auth + signup (create org or accept invite) + onboarding flow (profile, background, professional, DISC, cognitive).
3. Seed skills/languages taxonomy.
4. CI engine server functions + recompute on profile change.
5. Dashboard shell, entity selector, CI gauge, distribution heatmap.
6. Customizable insights panel + Recharts charts.
7. AI assistant server function + UI panel.
8. Admin: invite employees, manage departments/teams, demo-seed.
9. Polish, empty states, SEO metadata, landing page.

Approve and I'll start at step 1.
