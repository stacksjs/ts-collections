/**
 * Type for any function that takes a value and returns a string/number key
 */
type KeySelector<T> = (item: T) => string | number

/**
 * Represents a collection of items with type safety and chainable methods
 */
interface Collection<T> {
  readonly items: T[]
  readonly length: number
}

/**
 * All available collection operations
 */
interface CollectionOperations<T> extends Collection<T> {
  // Transformations
  map: <U>(callback: (item: T, index: number) => U) => CollectionOperations<U>
  filter: (predicate: (item: T, index: number) => boolean) => CollectionOperations<T>
  reduce: <U>(callback: (accumulator: U, current: T, index: number) => U, initialValue: U) => U

  // Accessing Elements
  first: <K extends keyof T>(key?: K) => T | T[K] | undefined
  last: <K extends keyof T>(key?: K) => T | T[K] | undefined
  nth: (index: number) => T | undefined

  // Aggregations
  sum: (key?: keyof T) => number
  avg: (key?: keyof T) => number
  min: (key?: keyof T) => T | undefined
  max: (key?: keyof T) => T | undefined

  // Grouping & Chunking
  chunk: (size: number) => CollectionOperations<T[]>
  groupBy: (<K extends keyof T>(key: K) => Map<T[K], CollectionOperations<T>>) & ((callback: KeySelector<T>) => Map<string | number, CollectionOperations<T>>)

  // Filtering & Searching
  where: <K extends keyof T>(key: K, value: T[K]) => CollectionOperations<T>
  whereIn: <K extends keyof T>(key: K, values: T[K][]) => CollectionOperations<T>
  unique: <K extends keyof T>(key?: K) => CollectionOperations<T>

  // Data Extraction
  pluck: <K extends keyof T>(key: K) => CollectionOperations<T[K]>
  values: () => CollectionOperations<T>

  // Utilities
  tap: (callback: (collection: CollectionOperations<T>) => void) => CollectionOperations<T>
  isEmpty: () => boolean
  isNotEmpty: () => boolean
  count: () => number
  toArray: () => T[]
  toMap: <K extends keyof T>(key: K) => Map<T[K], T>
}

/**
 * Creates a new collection with optimized performance
 * @param items - Array of items or iterable
 */
export function collect<T>(items: T[] | Iterable<T>): CollectionOperations<T> {
  const array = Array.isArray(items) ? items : Array.from(items)
  return createCollectionOperations({
    items: array,
    length: array.length,
  })
}

/**
 * @internal
 */
function createCollectionOperations<T>(collection: Collection<T>): CollectionOperations<T> {
  // Cache array methods for performance
  const { map, filter, reduce } = Array.prototype

  return {
    ...collection,

    // Use native array methods with proper this binding for better performance
    map<U>(callback: (item: T, index: number) => U): CollectionOperations<U> {
      return collect(map.call(collection.items, callback))
    },

    filter(predicate: (item: T, index: number) => boolean): CollectionOperations<T> {
      return collect(filter.call(collection.items, predicate))
    },

    reduce<U>(callback: (accumulator: U, current: T, index: number) => U, initialValue: U): U {
      return reduce.call(collection.items, callback, initialValue)
    },

    // Optimized element access
    first<K extends keyof T>(key?: K): T | T[K] | undefined {
      const item = collection.items[0]
      return key && item ? item[key] : item
    },

    last<K extends keyof T>(key?: K): T | T[K] | undefined {
      const item = collection.items[collection.length - 1]
      return key && item ? item[key] : item
    },

    nth(index: number): T | undefined {
      return collection.items[index]
    },

    // Optimized aggregations
    sum(key?: keyof T): number {
      if (collection.length === 0)
        return 0

      return collection.items.reduce((sum, item) => {
        const value = key ? Number(item[key]) : Number(item)
        return sum + (Number.isNaN(value) ? 0 : value)
      }, 0)
    },

    avg(key?: keyof T): number {
      return collection.length ? this.sum(key) / collection.length : 0
    },

    min(key?: keyof T): T | undefined {
      if (collection.length === 0)
        return undefined

      return collection.items.reduce((min, item) => {
        const value = key ? item[key] : item
        return value < (key ? min[key] : min) ? item : min
      })
    },

    max(key?: keyof T): T | undefined {
      if (collection.length === 0)
        return undefined

      return collection.items.reduce((max, item) => {
        const value = key ? item[key] : item
        return value > (key ? max[key] : max) ? item : max
      })
    },

    // Optimized grouping operations
    chunk(size: number): CollectionOperations<T[]> {
      if (size < 1)
        throw new Error('Chunk size must be greater than 0')

      const chunks: T[][] = []
      for (let i = 0; i < collection.length; i += size) {
        chunks.push(collection.items.slice(i, i + size))
      }
      return collect(chunks)
    },

    groupBy<K extends keyof T>(keyOrCallback: K | KeySelector<T>): Map<any, CollectionOperations<T>> {
      const groups = new Map<any, T[]>()

      for (const item of collection.items) {
        const key = typeof keyOrCallback === 'function'
          ? keyOrCallback(item)
          : item[keyOrCallback]

        if (!groups.has(key))
          groups.set(key, [])
        groups.get(key)!.push(item)
      }

      return new Map(
        Array.from(groups.entries()).map(
          ([key, items]) => [key, collect(items)],
        ),
      )
    },

    // Optimized filtering
    where<K extends keyof T>(key: K, value: T[K]): CollectionOperations<T> {
      return collect(collection.items.filter(item => item[key] === value))
    },

    whereIn<K extends keyof T>(key: K, values: T[K][]): CollectionOperations<T> {
      const valueSet = new Set(values)
      return collect(collection.items.filter(item => valueSet.has(item[key])))
    },

    unique<K extends keyof T>(key?: K): CollectionOperations<T> {
      if (!key)
        return collect([...new Set(collection.items)])

      const seen = new Set<T[K]>()
      return collect(
        collection.items.filter((item) => {
          const value = item[key]
          if (seen.has(value))
            return false
          seen.add(value)
          return true
        }),
      )
    },

    // Data extraction
    pluck<K extends keyof T>(key: K): CollectionOperations<T[K]> {
      return collect(collection.items.map(item => item[key]))
    },

    values(): CollectionOperations<T> {
      return collect([...collection.items])
    },

    // Utilities
    tap(callback: (collection: CollectionOperations<T>) => void): CollectionOperations<T> {
      callback(this)
      return this
    },

    isEmpty(): boolean {
      return collection.length === 0
    },

    isNotEmpty(): boolean {
      return collection.length > 0
    },

    count(): number {
      return collection.length
    },

    toArray(): T[] {
      return [...collection.items]
    },

    toMap<K extends keyof T>(key: K): Map<T[K], T> {
      return new Map(
        collection.items.map(item => [item[key], item]),
      )
    },
  }
}
