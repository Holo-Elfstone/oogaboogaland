# Contributor activity

Character status uses real contribution times: **working** for less than one hour,
**chilling** from one to 24 hours, then **sleeping**. Activity in any tracked
OogaBoogaX repository can make an Ooga work; each project keeps its own timestamp so
work routes can choose the corresponding cave. The existing static roster remains a
historical fallback and does not pretend that its old commits just happened.
With `?debug=1`, an explicit fixture instead starts three Oogas working, three
chilling, and three sleeping so the routines can be previewed without a live feed.
`seedDebugActivity()` is called only on that debug path.

Roster activity labels use yellow **workin**, orange **chillin**, and gray **sleepin**.
A separate dot before the name is green when `cave.humanControlled` is true and gray
when offline. The tooltip dot keeps its existing behavior: green for human presence,
otherwise the activity color. Local possession and release update the flag and both
roster readouts immediately, including while sleeping.
A future global presence adapter can update the same flag and call
`crew.refreshRosterRow(cave)`; tooltip status follows it each frame. Presence does
not replace the character's activity state or contribution timestamps.

The pending Oogatron integration exports `BL.jumbotronData`, an Oogatron schema 1
snapshot. The activity adapter accepts that snapshot or an array of snapshots:

```js
BL.contributors.applySnapshot({
  meta: { schema_version: 1, repo: "OogaBoogaX/entropylab" },
  contributors: [
    { login: "public-handle", last_seen_at: "2026-09-17T12:34:56Z" }
  ]
});
```

Oogatron already returns `last_seen_at`: the latest event time for a contributor's
commits, pull requests, reviews, and comments. When its PR merges, preserve that
field in `scripts/jumbotron-data.mjs` alongside `login`, `counts`, and `weekly`:

```js
last_seen_at: c.last_seen_at,
```

The pending generator currently drops this field. Weekly counts and the snapshot's
`generated_at` cannot establish whether someone contributed within the past hour,
so the adapter ignores rows without a valid activity timestamp. Profile names,
email addresses, and avatars are not needed or imported.

Repository names normalize to lowercase. Any `OogaBoogaX/<repo>` is accepted, with
`w-s-bitcoin/entropylab` as the historical alias. GitHub handles match without case;
the existing public alias `ottoz0r` maps to the `bc1gui` character. Unknown handles
do not create new characters. Each character stores at most 64 repositories.
Malformed, future, repeated, and older timestamps do not replace newer activity.

`BL.contributors.hasRecentActivity(contributor, "oogaboogax/entropylab")` is the
allocation-free work-route query; pass the canonical lowercase repository key.
`stateFor(contributor)` and `ageLabel(contributor)` use the newest timestamp across
projects. `subscribe(callback)` reports accepted activity batches and returns an
unsubscribe function. These updates supplement the existing minute status refresh,
which lets working status expire without receiving a new event.

The lower-level adapter accepts millisecond timestamps when an upstream provider
has already normalized its data:

```js
BL.contributors.applyActivity([
  { name: "public-handle", repo: "OogaBoogaX/entropylab", lastCommitAt: 1789648496000 }
]);
```

`lastCommitAt` is retained for compatibility and represents the latest supported
contribution, including non-commit events. An omitted `repo` defaults to EntropyLab.

The page remains network-free. Oogatron's worker syncs every ten minutes, but a
fresh worker does not refresh an already bundled page. The snapshot refresh and
site build must run often enough for the one-hour activity window; a daily stats
refresh is insufficient. Until that refresh is connected, the UI uses the newest
actual timestamp it has rather than manufacturing a recent contribution.

Sources: [Oogatron stats contract](https://github.com/rules-without-rulers/oogatron/blob/rock/worker/src/api/stats.ts),
[event timestamp tracking](https://github.com/rules-without-rulers/oogatron/blob/rock/worker/src/sync/identity.ts),
[integration PR](https://github.com/rules-without-rulers/oogaboogaland/pull/1).
