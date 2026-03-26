import { describe, it, expect } from 'vitest'
import { normalizeQuotes } from './normalizeQuotes'

// Helper: normalize then parse — throws if result isn't valid JSON
function parse(input: string) {
  return JSON.parse(normalizeQuotes(input))
}

describe('normalizeQuotes', () => {
  it('passes through clean double-quoted JSON unchanged', () => {
    const input = '{"name":"Alice","age":30}'
    expect(parse(input)).toEqual({ name: 'Alice', age: 30 })
  })

  it('converts all-single-quoted JSON', () => {
    expect(parse("{'name':'Alice','age':30}")).toEqual({ name: 'Alice', age: 30 })
  })

  it('handles mixed single and double quotes', () => {
    expect(parse(`{"a":1,'b':2}`)).toEqual({ a: 1, b: 2 })
  })

  it('handles nested objects with single quotes', () => {
    expect(parse("{'user':{'id':1,'roles':['admin','viewer']}}"))
      .toEqual({ user: { id: 1, roles: ['admin', 'viewer'] } })
  })

  it('handles a double quote character inside a single-quoted string', () => {
    expect(parse(`{'msg':'say "hi" now'}`)).toEqual({ msg: 'say "hi" now' })
  })

  it('handles escaped single quote inside single-quoted string', () => {
    expect(parse(`{'msg':'it\\'s fine'}`)).toEqual({ msg: "it's fine" })
  })

  it('handles whitespace and newlines between tokens', () => {
    const messy = `{
      'name' :  'Bob'  ,
      'active' : true ,
      'score'  : 9.5
    }`
    expect(parse(messy)).toEqual({ name: 'Bob', active: true, score: 9.5 })
  })

  it('handles an array at the top level', () => {
    expect(parse("['a','b','c']")).toEqual(['a', 'b', 'c'])
  })

  it('handles null, boolean, and numeric values', () => {
    expect(parse("{'x':null,'y':true,'z':42}")).toEqual({ x: null, y: true, z: 42 })
  })

  it('handles trailing commas are not introduced', () => {
    // normalizeQuotes should not corrupt the structure
    const input = "{'a':1}"
    const normalized = normalizeQuotes(input)
    expect(normalized).toBe('{"a":1}')
  })

  it('handles an empty object', () => {
    expect(parse("{}")).toEqual({})
    expect(parse("{ }")).toEqual({})
  })

  it('handles an empty string value', () => {
    expect(parse("{'key':''}")).toEqual({ key: '' })
    expect(parse(`{"key":""}`)).toEqual({ key: '' })
  })

  it('handles a unicode escape sequence inside a double-quoted string', () => {
    const input = '{"emoji":"\\u2764"}'
    expect(parse(input)).toEqual({ emoji: '❤' })
  })

  it('handles deeply messy input with inconsistent spacing and mixed quotes', () => {
    const messy = `{  'first' :"Alice",  "last"  :  'Smith'  , 'age':  30 }`
    expect(parse(messy)).toEqual({ first: 'Alice', last: 'Smith', age: 30 })
  })

  // ── Wrapper format: valid JSON containing a nested JSON string ────────
  it('passes through valid JSON with an embedded JSON string value unchanged', () => {
    // The outer JSON is valid; the \" inside the string value are proper escapes.
    // normalizeQuotes must NOT strip them (bare " still exist as structural delimiters).
    const inner = JSON.stringify({ id: 'chatcmpl-abc', object: 'chat.completion', choices: [] })
    const outer = JSON.stringify({ result: { content: [{ result: inner }], code: 0, des: 'success' } })
    const normalized = normalizeQuotes(outer)
    // Should parse correctly and inner value should itself be parseable
    const parsed = JSON.parse(normalized)
    expect(parsed.result.code).toBe(0)
    expect(JSON.parse(parsed.result.content[0].result).object).toBe('chat.completion')
  })

  it('handles the real-world wrapper format from user test case', () => {
    const realInner = JSON.stringify({
      id: 'chatcmpl-1d1fadef-385c-48b6-9203-d560e74cb201',
      object: 'chat.completion',
      created: 1774491067,
      model: 'Qwen32B-1.0.1',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: '1+1 的结果是 **2**。', reasoning_content: '嗯，用户问的是"1+1是多少"' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 12, total_tokens: 513, completion_tokens: 501 },
    })
    const outer = JSON.stringify({ result: { content: [{ result: realInner }], code: 0, des: 'success' } })
    const parsed = JSON.parse(normalizeQuotes(outer))
    expect(parsed.result.des).toBe('success')
    const llmData = JSON.parse(parsed.result.content[0].result)
    expect(llmData.object).toBe('chat.completion')
    expect(llmData.choices[0].message.role).toBe('assistant')
  })

  // ── Escaped-quote normalisation (\\" → ") ───────────────────────────
  it('normalises escaped-quote delimiters: simple object', () => {
    expect(parse(`{\\"name\\":\\"Alice\\"}`)).toEqual({ name: 'Alice' })
  })

  it('normalises escaped-quote delimiters: nested values', () => {
    expect(parse(`{\\"a\\":{\\"b\\":1}}`)).toEqual({ a: { b: 1 } })
  })

  it('normalises escaped-quote delimiters: array of strings', () => {
    expect(parse(`[\\"foo\\",\\"bar\\"]`)).toEqual(['foo', 'bar'])
  })

  it('does not strip \\\" inside a normally quoted string (legitimate escape)', () => {
    // {"msg":"say \"hi\""} — the \" inside the value must stay
    const input = `{"msg":"say \\"hi\\""}`
    expect(parse(input)).toEqual({ msg: 'say "hi"' })
  })
})
