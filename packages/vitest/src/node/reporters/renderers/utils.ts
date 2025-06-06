import type { Task } from '@vitest/runner'
import type { SnapshotSummary } from '@vitest/snapshot'
import type { Formatter } from 'tinyrainbow'
import { stripVTControlCharacters } from 'node:util'
import { slash } from '@vitest/utils'
import { basename, dirname, isAbsolute, relative } from 'pathe'
import c from 'tinyrainbow'
import {
  F_CHECK,
  F_CROSS,
  F_DOT,
  F_DOWN,
  F_DOWN_RIGHT,
  F_LONG_DASH,
  F_POINTER,
} from './figures'

export const pointer: string = c.yellow(F_POINTER)
export const skipped: string = c.dim(c.gray(F_DOWN))
export const benchmarkPass: string = c.green(F_DOT)
export const testPass: string = c.green(F_CHECK)
export const taskFail: string = c.red(F_CROSS)
export const suiteFail: string = c.red(F_POINTER)
export const pending: string = c.gray('·')

function getCols(delta = 0) {
  let length = process.stdout?.columns
  if (!length || Number.isNaN(length)) {
    length = 30
  }
  return Math.max(length + delta, 0)
}

export function errorBanner(message: string): string {
  return divider(c.bold(c.bgRed(` ${message} `)), null, null, c.red)
}

export function divider(
  text?: string,
  left?: number | null,
  right?: number | null,
  color?: Formatter,
): string {
  const cols = getCols()
  const c = color || ((text: string) => text)

  if (text) {
    const textLength = stripVTControlCharacters(text).length
    if (left == null && right != null) {
      left = cols - textLength - right
    }
    else {
      left = left ?? Math.floor((cols - textLength) / 2)
      right = cols - textLength - left
    }
    left = Math.max(0, left)
    right = Math.max(0, right)
    return `${c(F_LONG_DASH.repeat(left))}${text}${c(F_LONG_DASH.repeat(right))}`
  }
  return F_LONG_DASH.repeat(cols)
}

export function formatTestPath(root: string, path: string): string {
  if (isAbsolute(path)) {
    path = relative(root, path)
  }

  const dir = dirname(path)
  const ext = path.match(/(\.(spec|test)\.[cm]?[tj]sx?)$/)?.[0] || ''
  const base = basename(path, ext)

  return slash(c.dim(`${dir}/`) + c.bold(base)) + c.dim(ext)
}

export function renderSnapshotSummary(
  rootDir: string,
  snapshots: SnapshotSummary,
): string[] {
  const summary: string[] = []

  if (snapshots.added) {
    summary.push(c.bold(c.green(`${snapshots.added} written`)))
  }
  if (snapshots.unmatched) {
    summary.push(c.bold(c.red(`${snapshots.unmatched} failed`)))
  }
  if (snapshots.updated) {
    summary.push(c.bold(c.green(`${snapshots.updated} updated `)))
  }

  if (snapshots.filesRemoved) {
    if (snapshots.didUpdate) {
      summary.push(c.bold(c.green(`${snapshots.filesRemoved} files removed `)))
    }
    else {
      summary.push(
        c.bold(c.yellow(`${snapshots.filesRemoved} files obsolete `)),
      )
    }
  }

  if (snapshots.filesRemovedList && snapshots.filesRemovedList.length) {
    const [head, ...tail] = snapshots.filesRemovedList
    summary.push(`${c.gray(F_DOWN_RIGHT)} ${formatTestPath(rootDir, head)}`)

    tail.forEach((key) => {
      summary.push(`  ${c.gray(F_DOT)} ${formatTestPath(rootDir, key)}`)
    })
  }

  if (snapshots.unchecked) {
    if (snapshots.didUpdate) {
      summary.push(c.bold(c.green(`${snapshots.unchecked} removed`)))
    }
    else {
      summary.push(c.bold(c.yellow(`${snapshots.unchecked} obsolete`)))
    }

    snapshots.uncheckedKeysByFile.forEach((uncheckedFile) => {
      summary.push(
        `${c.gray(F_DOWN_RIGHT)} ${formatTestPath(
          rootDir,
          uncheckedFile.filePath,
        )}`,
      )
      uncheckedFile.keys.forEach(key =>
        summary.push(`  ${c.gray(F_DOT)} ${key}`),
      )
    })
  }

  return summary
}

export function countTestErrors(tasks: Task[]): number {
  return tasks.reduce((c, i) => c + (i.result?.errors?.length || 0), 0)
}

export function getStateString(
  tasks: Task[],
  name = 'tests',
  showTotal = true,
): string {
  if (tasks.length === 0) {
    return c.dim(`no ${name}`)
  }

  const passed = tasks.filter(i => i.result?.state === 'pass')
  const failed = tasks.filter(i => i.result?.state === 'fail')
  const skipped = tasks.filter(i => i.mode === 'skip')
  const todo = tasks.filter(i => i.mode === 'todo')

  return (
    [
      failed.length ? c.bold(c.red(`${failed.length} failed`)) : null,
      passed.length ? c.bold(c.green(`${passed.length} passed`)) : null,
      skipped.length ? c.yellow(`${skipped.length} skipped`) : null,
      todo.length ? c.gray(`${todo.length} todo`) : null,
    ]
      .filter(Boolean)
      .join(c.dim(' | ')) + (showTotal ? c.gray(` (${tasks.length})`) : '')
  )
}

export function getStateSymbol(task: Task): string {
  if (task.mode === 'skip' || task.mode === 'todo') {
    return skipped
  }

  if (!task.result) {
    return pending
  }

  if (task.result.state === 'run' || task.result.state === 'queued') {
    if (task.type === 'suite') {
      return pointer
    }
  }

  if (task.result.state === 'pass') {
    return task.meta?.benchmark ? benchmarkPass : testPass
  }

  if (task.result.state === 'fail') {
    return task.type === 'suite' ? suiteFail : taskFail
  }

  return ' '
}

export function duration(time: number, locale = 'en-us'): string {
  if (time < 1) {
    return `${Number((time * 1e3).toFixed(2)).toLocaleString(locale)} ps`
  }

  if (time < 1e3) {
    return `${Number(time.toFixed(2)).toLocaleString(locale)} ns`
  }
  if (time < 1e6) {
    return `${Number((time / 1e3).toFixed(2)).toLocaleString(locale)} µs`
  }
  if (time < 1e9) {
    return `${Number((time / 1e6).toFixed(2)).toLocaleString(locale)} ms`
  }
  if (time < 1e12) {
    return `${Number((time / 1e9).toFixed(2)).toLocaleString(locale)} s`
  }
  if (time < 36e11) {
    return `${Number((time / 60e9).toFixed(2)).toLocaleString(locale)} m`
  }

  return `${Number((time / 36e11).toFixed(2)).toLocaleString(locale)} h`
}

export function formatTimeString(date: Date): string {
  return date.toTimeString().split(' ')[0]
}

export function formatTime(time: number): string {
  if (time > 1000) {
    return `${(time / 1000).toFixed(2)}s`
  }
  return `${Math.round(time)}ms`
}

export function formatProjectName(name: string | undefined, suffix = ' '): string {
  if (!name) {
    return ''
  }
  if (!c.isColorSupported) {
    return `|${name}|${suffix}`
  }
  const index = name
    .split('')
    .reduce((acc, v, idx) => acc + v.charCodeAt(0) + idx, 0)

  const colors = [c.bgYellow, c.bgCyan, c.bgGreen, c.bgMagenta]

  return c.black(colors[index % colors.length](` ${name} `)) + suffix
}

export function withLabel(color: 'red' | 'green' | 'blue' | 'cyan' | 'yellow', label: string, message?: string) {
  const bgColor = `bg${color.charAt(0).toUpperCase()}${color.slice(1)}` as `bg${Capitalize<typeof color>}`
  return `${c.bold(c[bgColor](` ${label} `))} ${message ? c[color](message) : ''}`
}

export function padSummaryTitle(str: string): string {
  return c.dim(`${str.padStart(11)} `)
}

export function truncateString(text: string, maxLength: number): string {
  const plainText = stripVTControlCharacters(text)

  if (plainText.length <= maxLength) {
    return text
  }

  return `${plainText.slice(0, maxLength - 1)}…`
}
