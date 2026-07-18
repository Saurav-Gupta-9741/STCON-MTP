export function* stconAlgorithm(graph, s, t) {
  yield { type: 'step', line: 2, description: 'Initialize algorithm parameters.' };
  const n = graph.nodes.length;
  if (n <= 1) {
    yield { type: 'done', result: s === t, line: 4 };
    return;
  }

  const log_n = Math.max(1, Math.log2(n));
  const sqrt_log_n = Math.sqrt(log_n);
  const r = Math.max(1, Math.ceil(sqrt_log_n));
  const k = Math.max(1, Math.ceil(Math.pow(2, sqrt_log_n)));
  const L = 2;
  const lambd = Math.pow(L, r);

  const levels_to_check = Math.floor(n / lambd) + 1;

  for (let j = 0; j < lambd; j++) {
    let S = new Set([s]);
    let valid_j = true;

    yield { type: 'step', S: Array.from(S), current_j: j, description: `Trying level offset j=${j}. Starting S={${s}}`, line: 21 };

    for (let level_idx = 1; level_idx <= levels_to_check; level_idx++) {
      let S_prime = new Set();
      yield { type: 'substep', line: 24, description: `Computing next level (distance ${lambd})` };

      for (let i1 = 0; i1 < k; i1++) {
        let P = new Set();

        for (let i2 = 0; i2 < k; i2++) {
          const Q = new Set(Array.from(S).filter((v) => v % k === i2));
          if (Q.size === 0) continue;

          yield { type: 'substep', line: 33, S: Array.from(S), S_prime: Array.from(S_prime), Q: Array.from(Q), description: `Checking paths from mod ${i2} to mod ${i1}` };

          // A = SPR(graph, k, L, r, i2, i1, Q)
          const A = SPR(graph, k, L, r, i2, i1, Q);
          A.forEach(v => P.add(v));
          
          if (A.size > 0) {
            yield { type: 'substep', line: 37, S: Array.from(new Set([...S, ...S_prime, ...P])), description: `Found ${A.size} paths from mod ${i2} to mod ${i1}` };
          }
        }

        // Limit check (Strictly enforcing Sublinear Space bound)
        const limit = Math.max(Math.ceil(n / lambd) + 2, 10); 
        if (S.size + new Set([...S_prime, ...P]).size > limit) {
          valid_j = false;
          break;
        } else {
          P.forEach(v => S_prime.add(v));
        }
      }

      if (!valid_j) {
        yield { type: 'failed', description: `Memory limit exceeded for j=${j}.`, line: 51 };
        break;
      }

      S_prime.forEach(v => S.add(v));
      yield { type: 'step', S: Array.from(S), description: `Level ${level_idx} completed. New S=` + Array.from(S).join(','), line: 56 };

      if (S.has(t)) {
        yield { type: 'done', result: true, S: Array.from(S), line: 59 };
        return;
      }
    }

    if (!valid_j) continue;

    if (S.has(t)) {
      yield { type: 'done', result: true, S: Array.from(S), line: 68 };
      return;
    }
  }

  yield { type: 'done', result: false, line: 72 };
}

function SPR(graph, k, L, r, ds, dt, Vs) {
  let Vt = new Set();

  if (r === 0) {
    for (let u of Vs) {
      if (u % k === ds) {
        const outEdges = graph.edges.filter(e => e.source === u || e.source === u.toString()).map(e => parseInt(e.target));
        for (let v of outEdges) {
          if (v % k === dt) {
            Vt.add(v);
          }
        }
      }
    }
  } else {
    for (let i = 0; i < Math.pow(k, L - 1); i++) {
      let num = i;
      let digits = [];
      for (let j = 0; j < L - 1; j++) {
        digits.push(num % k);
        num = Math.floor(num / k);
      }
      
      let sequence = [ds, ...digits, dt];
      let current_V = new Set(Vs);

      for (let step = 1; step <= L; step++) {
        let prev_d = sequence[step - 1];
        let curr_d = sequence[step];

        const next_V = SPR(graph, k, L, r - 1, prev_d, curr_d, current_V);
        current_V = next_V;
      }
      current_V.forEach(v => Vt.add(v));
    }
  }
  return Vt;
}

export function* standardBFSAlgorithm(graph, s, t) {
  yield { type: 'step', line: 116, description: 'Standard BFS initialized. S={s}' };
  let S = new Set([s]); // Explored nodes
  let frontier = [s]; // Queue

  yield { type: 'step', S: Array.from(S), description: `Starting BFS from node ${s}`, line: 120 };

  while (frontier.length > 0) {
    let current = frontier.shift();
    yield { type: 'substep', S: Array.from(S), description: `Exploring node ${current}`, line: 124 };

    if (current === t) {
      yield { type: 'done', result: true, S: Array.from(S), line: 127 };
      return;
    }

    const outEdges = graph.edges.filter(e => e.source === current || e.source === current.toString()).map(e => parseInt(e.target));
    for (let neighbor of outEdges) {
      if (!S.has(neighbor)) {
        S.add(neighbor);
        frontier.push(neighbor);
        yield { type: 'substep', S: Array.from(S), description: `Discovered node ${neighbor}`, line: 134 };
      }
    }
  }

  yield { type: 'done', result: false, S: Array.from(S), line: 140 };
}

export const stconCodeString = `export function* stconAlgorithm(graph, s, t) {
  const n = graph.nodes.length;
  if (n <= 1) {
    return s === t;
  }

  const log_n = Math.max(1, Math.log2(n));
  const sqrt_log_n = Math.sqrt(log_n);
  const r = Math.max(1, Math.ceil(sqrt_log_n));
  const k = Math.max(1, Math.ceil(Math.pow(2, sqrt_log_n)));
  const L = 2;
  const lambd = Math.pow(L, r);

  const levels_to_check = Math.floor(n / lambd) + 1;

  for (let j = 0; j < lambd; j++) {
    let S = new Set([s]);
    let valid_j = true;

    for (let level_idx = 1; level_idx <= levels_to_check; level_idx++) {
      let S_prime = new Set();

      for (let i1 = 0; i1 < k; i1++) {
        let P = new Set();

        for (let i2 = 0; i2 < k; i2++) {
          const Q = new Set(Array.from(S).filter((v) => v % k === i2));
          if (Q.size === 0) continue;

          // A = SPR(graph, k, L, r, i2, i1, Q)
          const A = SPR(graph, k, L, r, i2, i1, Q);
          A.forEach(v => P.add(v));
        }

        // Limit check (Strictly enforcing Sublinear Space bound)
        const limit = Math.max(Math.ceil(n / lambd) + 2, 10); 
        if (S.size + new Set([...S_prime, ...P]).size > limit) {
          valid_j = false;
          break;
        } else {
          P.forEach(v => S_prime.add(v));
        }
      }

      if (!valid_j) {
        break;
      }

      S_prime.forEach(v => S.add(v));

      if (S.has(t)) {
        return true;
      }
    }

    if (!valid_j) continue;

    if (S.has(t)) {
      return true;
    }
  }

  return false;
}

function* SPR(graph, k, L, r, ds, dt, Vs) {
  let Vt = new Set();

  if (r === 0) {
    for (let u of Vs) {
      if (u % k === ds) {
        const outEdges = graph.edges.filter(e => e.source === u).map(e => e.target);
        for (let v of outEdges) {
          if (v % k === dt) {
            Vt.add(v);
          }
        }
      }
    }
  } else {
    for (let i = 0; i < Math.pow(k, L - 1); i++) {
      let num = i;
      let digits = [];
      for (let j = 0; j < L - 1; j++) {
        digits.push(num % k);
        num = Math.floor(num / k);
      }
      
      let sequence = [ds, ...digits, dt];
      let current_V = new Set(Vs);

      for (let step = 1; step <= L; step++) {
        let prev_d = sequence[step - 1];
        let curr_d = sequence[step];

        const next_V = SPR(graph, k, L, r - 1, prev_d, curr_d, current_V);
        current_V = next_V;
      }
      current_V.forEach(v => Vt.add(v));
    }
  }
  return Vt;
}`;

export const bfsCodeString = `export function* standardBFSAlgorithm(graph, s, t) {
  let S = new Set([s]); // Explored nodes
  let frontier = [s]; // Queue

  while (frontier.length > 0) {
    let current = frontier.shift();

    if (current === t) {
      return true;
    }

    const outEdges = graph.edges.filter(e => e.source === current).map(e => e.target);
    for (let neighbor of outEdges) {
      if (!S.has(neighbor)) {
        S.add(neighbor);
        frontier.push(neighbor);
      }
    }
  }

  return false;
}`;
