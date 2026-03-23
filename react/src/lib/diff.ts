export type DiffOp = { type: 'equal' | 'insert' | 'delete'; value: string }

// Myers diff on word tokens
function tokenize(text: string): string[] {
  return text.split(/(\s+)/)
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp
}

function backtrack(dp: number[][], a: string[], b: string[], i: number, j: number, out: DiffOp[]) {
  if (i === 0 && j === 0) return
  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    backtrack(dp, a, b, i - 1, j - 1, out)
    out.push({ type: 'equal', value: a[i - 1] })
  } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    backtrack(dp, a, b, i, j - 1, out)
    out.push({ type: 'insert', value: b[j - 1] })
  } else {
    backtrack(dp, a, b, i - 1, j, out)
    out.push({ type: 'delete', value: a[i - 1] })
  }
}

export function diffWords(a: string, b: string): DiffOp[] {
  const ta = tokenize(a), tb = tokenize(b)
  const dp = lcs(ta, tb)
  const ops: DiffOp[] = []
  backtrack(dp, ta, tb, ta.length, tb.length, ops)
  // Merge consecutive same-type ops
  return ops.reduce<DiffOp[]>((acc, op) => {
    if (acc.length && acc[acc.length - 1].type === op.type) {
      acc[acc.length - 1].value += op.value
    } else {
      acc.push({ ...op })
    }
    return acc
  }, [])
}

export function diffLines(a: string, b: string): DiffOp[] {
  const la = a.split('\n'), lb = b.split('\n')
  const dp = lcs(la, lb)
  const ops: DiffOp[] = []
  backtrack(dp, la, lb, la.length, lb.length, ops)
  return ops
}
