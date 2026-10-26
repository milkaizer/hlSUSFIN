# P9 adversarial security review (Vita Language)

Scope: middleware.ts, app/auth, app/api, server actions, pages, lib/, components/, supabase/migrations 0001 and 0002.
DB tests ran on my own database `vita_p9` (stub without `create role`, both migrations, seed, attacker/victim fixtures), which I dropped afterwards.
Routing tests ran on a scratch copy of the `.next-p1` build (Supabase not connected) with `next start` on port 3917. That server and the copy were removed afterwards.
I did not modify any project files except this report.

Test users: A = admin. S = approved student, basic tier in es-conversation. V = victim, approved, premium in es-conversation. P = pending. E = former student whose premium entitlement expired yesterday.

---

## Confirmed findings

### 1. [High] A student can turn their own Q&A post into a site-wide official notice
- **Where:** `supabase/migrations/0001_init.sql:658-659` (`posts_update`), together with the full-table `grant update on board_posts to authenticated` (line 652).
- **Who: