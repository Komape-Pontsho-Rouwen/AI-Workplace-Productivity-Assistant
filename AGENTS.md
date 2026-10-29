<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- AI calls go through server functions in src/lib/ai.functions.ts using a server-only helper (src/lib/ai.server.ts); all tool history lives in one per-user `history` table keyed by tool, tasks in `tasks`, both RLS-scoped to auth.uid().
