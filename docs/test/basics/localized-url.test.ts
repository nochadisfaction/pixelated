import { describe, expect, it } from 'vitest'
import { localizedUrl } from '../../src/utils/localized-url'

describe('with `build.output: "directory"`', () => {
  it('it has no effect in a monolingual project', () => {
    const url = new URL('https://example.com/en/guide/')
    expect(localizedUrl(url, undefined).href).toBe(url.href)
  })

  it('has no effect on index route in a monolingual project', () => {
    const url = new URL('https://example.com/')
    expect(localizedUrl(url, undefined).href).toBe(url.href)
  })
})

describe('with `build.output: "file"`', () => {
  it('it has no effect in a monolingual project', () => {
    const url = new URL('https://example.com/en/guide.html')
    expect(localizedUrl(url, undefined).href).toBe(url.href)
  })

  it('has no effect on index route in a monolingual project', () => {
    const url = new URL('https://example.com/index.html')
    expect(localizedUrl(url, undefined).href).toBe(url.href)
  })
})
