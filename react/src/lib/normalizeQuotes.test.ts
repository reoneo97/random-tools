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
})
