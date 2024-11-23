import type { CollectionOperations, LazyCollectionOperations, LazyGenerator } from './types'
import { collect } from './collect'

/**
 * Creates a new lazy collection operation chain
 */
export function createLazyOperations<T>(generator: LazyGenerator<T>): LazyCollectionOperations<T> {
  const operations: Array<(value: any) => any> = []
  let cached: T[] | null = null
  let batchSize: number | null = null

  async function* executeChain(): AsyncGenerator<T, void, undefined> {
    if (cached) {
      for (const item of cached) {
        yield item
      }
      return
    }

    let batch: T[] = []

    for await (let value of generator) {
      // Apply all operations in the chain
      for (const operation of operations) {
        value = operation(value)
        if (value === undefined)
          break
      }

      if (value !== undefined) {
        if (batchSize) {
          batch.push(value)
          if (batch.length >= batchSize) {
            for (const item of batch) {
              yield item
            }
            batch = []
          }
        }
        else {
          yield value
        }
      }
    }

    // Yield any remaining batch items
    if (batch.length > 0) {
      for (const item of batch) {
        yield item
      }
    }
  }

  return {
    map<U>(callback: (item: T, index: number) => U): LazyCollectionOperations<U> {
      let currentIndex = 0
      operations.push((value: T) => callback(value, currentIndex++))
      return createLazyOperations(executeChain() as any)
    },

    filter(predicate: (item: T, index: number) => boolean): LazyCollectionOperations<T> {
      let currentIndex = 0
      operations.push((value: T) => predicate(value, currentIndex++) ? value : undefined)
      return createLazyOperations(executeChain())
    },

    flatMap<U>(callback: (item: T, index: number) => U[]): LazyCollectionOperations<U> {
      let currentIndex = 0
      operations.push((value: T) => callback(value, currentIndex++))
      return createLazyOperations(executeChain() as any)
    },

    take(count: number): LazyCollectionOperations<T> {
      let taken = 0
      operations.push((value: T) => taken++ < count ? value : undefined)
      return createLazyOperations(executeChain())
    },

    skip(count: number): LazyCollectionOperations<T> {
      let skipped = 0
      operations.push((value: T) => skipped++ < count ? undefined : value)
      return createLazyOperations(executeChain())
    },

    chunk(size: number): LazyCollectionOperations<T[]> {
      let chunk: T[] = []
      operations.push((value: T) => {
        chunk.push(value)
        if (chunk.length === size) {
          const result = chunk
          chunk = []
          return result
        }
        return undefined
      })
      return createLazyOperations(executeChain() as any)
    },

    async toArray(): Promise<T[]> {
      if (cached)
        return cached

      const results: T[] = []
      for await (const item of executeChain()) {
        results.push(item)
      }
      return results
    },

    async toCollection(): Promise<CollectionOperations<T>> {
      const array = await this.toArray()
      return collect(array)
    },

    async forEach(callback: (item: T) => void): Promise<void> {
      for await (const item of executeChain()) {
        callback(item)
      }
    },

    async reduce<U>(callback: (accumulator: U, current: T) => U, initial: U): Promise<U> {
      let result = initial
      for await (const item of executeChain()) {
        result = callback(result, item)
      }
      return result
    },

    async count(): Promise<number> {
      let counter = 0
      for await (const _item of executeChain()) {
        counter++
      }
      return counter
    },

    async first(): Promise<T | undefined> {
      const iterator = executeChain()
      const result = await iterator.next()
      return result.done ? undefined : result.value
    },

    async last(): Promise<T | undefined> {
      let lastItem: T | undefined
      for await (const item of executeChain()) {
        lastItem = item
      }
      return lastItem
    },

    async nth(n: number): Promise<T | undefined> {
      let currentIndex = 0
      for await (const item of executeChain()) {
        if (currentIndex === n)
          return item
        currentIndex++
      }
      return undefined
    },

    cache(): LazyCollectionOperations<T> {
      this.toArray().then((array) => {
        cached = array
      })
      return this
    },

    batch(size: number): LazyCollectionOperations<T> {
      batchSize = size
      return this
    },

    pipe<U>(callback: (lazy: LazyCollectionOperations<T>) => LazyCollectionOperations<U>): LazyCollectionOperations<U> {
      return callback(this)
    },
  }
}
