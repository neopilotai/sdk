import { describe, it, expect } from 'vitest'
import { createRepoLensClient } from '../index'

describe('RepoLens SDK', () => {
  it('should create a client', () => {
    const client = createRepoLensClient({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    })
    expect(client).toBeDefined()
  })
})