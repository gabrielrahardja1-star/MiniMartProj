function normalize(s) {
  return (s || '').toLowerCase()
}

// Higher score = better match. null = no match at all.
function scoreMatch(query, target) {
  const q = normalize(query)
  const t = normalize(target)
  if (!q) return null
  if (t === q) return 1000
  if (t.startsWith(q)) return 800
  const idx = t.indexOf(q)
  if (idx !== -1) return 600 - idx

  // Loose subsequence match: every query char appears in target, in order,
  // possibly with gaps (catches typos/partial names). Tighter spread wins.
  let ti = 0
  let firstIdx = -1
  let lastIdx = -1
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null
    if (firstIdx === -1) firstIdx = found
    lastIdx = found
    ti = found + 1
  }
  return 200 - (lastIdx - firstIdx)
}

// Searches both employee_id (Login ID) and name, returns the workers
// ranked best-match-first, capped at `limit`.
export function fuzzySearchWorkers(workers, query, limit = 8) {
  const q = (query || '').trim()
  if (!q) return []
  const scored = []
  for (const w of workers) {
    const idScore = scoreMatch(q, w.employee_id)
    const nameScore = scoreMatch(q, w.name)
    if (idScore === null && nameScore === null) continue
    scored.push({ worker: w, score: Math.max(idScore ?? -1, nameScore ?? -1) })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.worker)
}
