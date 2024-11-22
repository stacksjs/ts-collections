/**
 * Type for any function that takes a value and returns a string/number key
 */
type KeySelector<T> = (item: T) => string | number

/**
 * Type for comparison function
 */
type CompareFunction<T> = (a: T, b: T) => number

/**
 * Type for when/unless callback
 */
type ConditionalCallback<T> = (collection: CollectionOperations<T>) => boolean

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
  flatMap: <U>(callback: (item: T, index: number) => U[]) => CollectionOperations<U>

  // Accessing Elements
  first: <K extends keyof T>(key?: K) => T | T[K] | undefined
  last: <K extends keyof T>(key?: K) => T | T[K] | undefined
  nth: (index: number) => T | undefined
  take: (count: number) => CollectionOperations<T>
  skip: (count: number) => CollectionOperations<T>

  // Aggregations
  sum: (key?: keyof T) => number
  avg: (key?: keyof T) => number
  min: (key?: keyof T) => T | undefined
  max: (key?: keyof T) => T | undefined
  median: (key?: keyof T) => number | undefined
  mode: (key?: keyof T) => T | undefined

  // Grouping & Chunking
  chunk: (size: number) => CollectionOperations<T[]>
  groupBy: (<K extends keyof T>(key: K) => Map<T[K], CollectionOperations<T>>) & ((callback: KeySelector<T>) => Map<string | number, CollectionOperations<T>>)
  partition: (predicate: (item: T) => boolean) => [CollectionOperations<T>, CollectionOperations<T>]

  // Filtering & Searching
  where: <K extends keyof T>(key: K, value: T[K]) => CollectionOperations<T>
  whereIn: <K extends keyof T>(key: K, values: T[K][]) => CollectionOperations<T>
  whereNotIn: <K extends keyof T>(key: K, values: T[K][]) => CollectionOperations<T>
  whereBetween: <K extends keyof T>(key: K, min: T[K], max: T[K]) => CollectionOperations<T>
  whereNotBetween: <K extends keyof T>(key: K, min: T[K], max: T[K]) => CollectionOperations<T>
  unique: <K extends keyof T>(key?: K) => CollectionOperations<T>
  when: (condition: boolean | ConditionalCallback<T>, callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  unless: (condition: boolean | ConditionalCallback<T>, callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>

  // Sorting
  sort: (compareFunction?: CompareFunction<T>) => CollectionOperations<T>
  sortBy: <K extends keyof T>(key: K, direction?: 'asc' | 'desc') => CollectionOperations<T>
  sortByDesc: <K extends keyof T>(key: K) => CollectionOperations<T>

  // Data Extraction
  pluck: <K extends keyof T>(key: K) => CollectionOperations<T[K]>
  values: () => CollectionOperations<T>
  keys: <K extends keyof T>(key: K) => CollectionOperations<T[K]>

  // Set Operations
  diff: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  intersect: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  union: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>

  // Utilities
  tap: (callback: (collection: CollectionOperations<T>) => void) => CollectionOperations<T>
  pipe: <U>(callback: (collection: CollectionOperations<T>) => U) => U
  isEmpty: () => boolean
  isNotEmpty: () => boolean
  count: () => number
  toArray: () => T[]
  toMap: <K extends keyof T>(key: K) => Map<T[K], T>
  toSet: () => Set<T>
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
  return {
    ...collection,

    map<U>(callback: (item: T, index: number) => U): CollectionOperations<U> {
      return collect(collection.items.map(callback))
    },

    filter(predicate: (item: T, index: number) => boolean): CollectionOperations<T> {
      return collect(collection.items.filter(predicate))
    },

    reduce<U>(callback: (accumulator: U, current: T, index: number) => U, initialValue: U): U {
      return collection.items.reduce(callback, initialValue)
    },

    flatMap<U>(callback: (item: T, index: number) => U[]): CollectionOperations<U> {
      return collect(collection.items.flatMap(callback))
    },

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

    take(count: number): CollectionOperations<T> {
      return collect(collection.items.slice(0, count))
    },

    skip(count: number): CollectionOperations<T> {
      return collect(collection.items.slice(count))
    },

    sum(key?: keyof T): number {
      if (collection.length === 0) return 0

      return collection.items.reduce((sum, item) => {
        const value = key ? Number(item[key]) : Number(item)
        return sum + (Number.isNaN(value) ? 0 : value)
      }, 0)
    },

    avg(key?: keyof T): number {
      return collection.length ? this.sum(key) / collection.length : 0
    },

    median(key?: keyof T): number | undefined {
      if (collection.length === 0) return undefined

      const values = key
        ? collection.items.map(item => Number(item[key])).sort((a, b) => a - b)
        : collection.items.map(item => Number(item)).sort((a, b) => a - b)

      const mid = Math.floor(values.length / 2)
      return values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid]
    },

    mode(key?: keyof T): T | undefined {
      if (collection.length === 0) return undefined

      const frequency = new Map<any, number>()
      let maxFreq = 0
      let mode: T | undefined

      for (const item of collection.items) {
        const value = key ? item[key] : item
        const freq = (frequency.get(value) || 0) + 1
        frequency.set(value, freq)

        if (freq > maxFreq) {
          maxFreq = freq
          mode = item
        }
      }

      return mode
    },

    min(key?: keyof T): T | undefined {
      if (collection.length === 0) return undefined

      return collection.items.reduce((min, item) => {
        const value = key ? item[key] : item
        return value < (key ? min[key] : min) ? item : min
      })
    },

    max(key?: keyof T): T | undefined {
      if (collection.length === 0) return undefined

      return collection.items.reduce((max, item) => {
        const value = key ? item[key] : item
        return value > (key ? max[key] : max) ? item : max
      })
    },

    chunk(size: number): CollectionOperations<T[]> {
      if (size < 1) throw new Error('Chunk size must be greater than 0')

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

        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(item)
      }

      return new Map(
        Array.from(groups.entries()).map(
          ([key, items]) => [key, collect(items)],
        ),
      )
    },

    partition(predicate: (item: T) => boolean): [CollectionOperations<T>, CollectionOperations<T>] {
      const pass: T[] = []
      const fail: T[] = []

      for (const item of collection.items) {
        if (predicate(item)) {
          pass.push(item)
        } else {
          fail.push(item)
        }
      }

      return [collect(pass), collect(fail)]
    },

    where<K extends keyof T>(key: K, value: T[K]): CollectionOperations<T> {
      return collect(collection.items.filter(item => item[key] === value))
    },

    whereIn<K extends keyof T>(key: K, values: T[K][]): CollectionOperations<T> {
      const valueSet = new Set(values)
      return collect(collection.items.filter(item => valueSet.has(item[key])))
    },

    whereNotIn<K extends keyof T>(key: K, values: T[K][]): CollectionOperations<T> {
      const valueSet = new Set(values)
      return collect(collection.items.filter(item => !valueSet.has(item[key])))
    },

    whereBetween<K extends keyof T>(key: K, min: T[K], max: T[K]): CollectionOperations<T> {
      return collect(collection.items.filter(item => {
        const value = item[key]
        return value >= min && value <= max
      }))
    },

    whereNotBetween<K extends keyof T>(key: K, min: T[K], max: T[K]): CollectionOperations<T> {
      return collect(collection.items.filter(item => {
        const value = item[key]
        return value < min || value > max
      }))
    },

    unique<K extends keyof T>(key?: K): CollectionOperations<T> {
      if (!key) return collect([...new Set(collection.items)])

      const seen = new Set<T[K]>()
      return collect(
        collection.items.filter((item) => {
          const value = item[key]
          if (seen.has(value)) return false
          seen.add(value)
          return true
        }),
      )
    },

    when(
      condition: boolean | ConditionalCallback<T>,
      callback: (collection: CollectionOperations<T>) => CollectionOperations<T>
    ): CollectionOperations<T> {
      const shouldRun = typeof condition === 'function' ? condition(this) : condition
      return shouldRun ? callback(this) : this
    },

    unless(
      condition: boolean | ConditionalCallback<T>,
      callback: (collection: CollectionOperations<T>) => CollectionOperations<T>
    ): CollectionOperations<T> {
      const shouldRun = typeof condition === 'function' ? condition(this) : condition
      return shouldRun ? this : callback(this)
    },

    sort(compareFunction?: CompareFunction<T>): CollectionOperations<T> {
      return collect([...collection.items].sort(compareFunction))
    },

    sortBy<K extends keyof T>(key: K, direction: 'asc' | 'desc' = 'asc'): CollectionOperations<T> {
      return collect([...collection.items].sort((a, b) => {
        const multiplier = direction === 'asc' ? 1 : -1
        return multiplier * (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0)
      }))
    },

    sortByDesc<K extends keyof T>(key: K): CollectionOperations<T> {
      return this.sortBy(key, 'desc')
    },

    pluck<K extends keyof T>(key: K): CollectionOperations<T[K]> {
      return collect(collection.items.map(item => item[key]))
    },

    values(): CollectionOperations<T> {
      return collect([...collection.items])
    },

    keys<K extends keyof T>(key: K): CollectionOperations<T[K]> {
      return collect(Array.from(new Set(collection.items.map(item => item[key]))))
    },

    diff(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherSet = new Set(Array.isArray(other) ? other : other.items)
      return collect(collection.items.filter(item => !otherSet.has(item)))
    },

    intersect(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherSet = new Set(Array.isArray(other) ? other : other.items)
      return collect(collection.items.filter(item => otherSet.has(item)))
    },

    union(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherArray = Array.isArray(other) ? other : other.items
      return collect([...new Set([...collection.items, ...otherArray])])
    },

    tap(callback: (collection: CollectionOperations<T>) => void): CollectionOperations<T> {
      callback(this)
      return this
    },

    pipe<U>(callback: (collection: CollectionOperations<T>) => U): U {
      return callback(this)
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

    toSet(): Set<T> {
      return new Set(collection.items)
    },
  }
}

/**
  * Helper function to create an empty collection
  */
export function emptyCollection<T>(): CollectionOperations<T> {
  return collect([])
}

/**
  * Helper function to create a collection from a range of numbers
  */
export function range(start: number, end: number, step: number = 1): CollectionOperations<number> {
  const items: number[] = []
  for (let i = start; i <= end; i += step) {
    items.push(i)
  }
  return collect(items)
}

/**
  * Helper function to create a collection from a specific value repeated n times
  */
export function times<T>(n: number, callback: (index: number) => T): CollectionOperations<T> {
  return collect(Array.from({ length: n }, (_, index) => callback(index)))
}

/**
  * Type guard to check if a value is a Collection
  */
export function isCollection<T>(value: any): value is CollectionOperations<T> {
  return value &&
    typeof value === 'object' &&
    Array.isArray(value.items) &&
    typeof value.length === 'number' &&
    typeof value.map === 'function' &&
    typeof value.filter === 'function'
}
