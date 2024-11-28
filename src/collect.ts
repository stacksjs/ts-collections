import type { AnomalyDetectionOptions, AsyncCallback, CacheEntry, ClusterResult, Collection, CollectionMetrics, CollectionOperations, CompareFunction, ConditionalCallback, KeySelector, KMeansOptions, KMeansResult, LazyCollectionOperations, MovingAverageOptions, PaginationResult, PluckedCluster, PluckedData, RecordMerge, RegressionResult, SerializationOptions, StandardDeviationResult, TimeSeriesOptions, TimeSeriesPoint, ValidationResult, ValidationRule, ValidationSchema } from './types'
import process from 'node:process'
import { createLazyOperations } from './lazy'
import { getNextTimestamp, isSameDay, validateCoordinates } from './utils'

/**
 * Creates a new collection with optimized performance
 * @param items - Array of items or iterable
 */
export function collect<T>(items: T[] | Iterable<T>): CollectionOperations<T> {
  // Handle empty array case explicitly
  if (Array.isArray(items) && items.length === 0) {
    return createCollectionOperations({
      items: [] as any[],
      length: 0,
    })
  }

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
  // const versionStore: VersionStore<T> = {
  //   currentVersion: 0,
  //   snapshots: new Map(),
  //   changes: [],
  // }

  // Helper function for fuzzy search scoring
  function calculateFuzzyScore(query: string, value: string): number {
    let score = 0
    let lastIndex = -1
    for (const char of query) {
      const index = value.indexOf(char, lastIndex + 1)
      if (index === -1)
        return 0
      score += 1 / (index - lastIndex)
      lastIndex = index
    }
    return score
  }

  return {
    ...collection,

    all() {
      return [...collection.items]
    },

    average(key?: keyof T) {
      return this.avg(key)
    },

    collapse<U>(): CollectionOperations<U> {
      return collect(collection.items.flat() as U[])
    },

    combine<U>(values: U[]): CollectionOperations<Record<string, U | undefined>> {
      const result: Record<string, U | undefined> = {}
      collection.items.forEach((key, index) => {
        result[String(key)] = values[index]
      })
      return collect([result]) as any
    },

    contains(keyOrItem: T | keyof T | undefined, value?: any): boolean {
      if (arguments.length === 1) {
        if (keyOrItem === undefined)
          return false
        return collection.items.includes(keyOrItem as T)
      }
      return collection.items.some(item => item[keyOrItem as keyof T] === value)
    },

    containsOneItem() {
      return collection.length === 1
    },

    containsAll<K extends keyof T>(
      itemsOrKey: Array<T | undefined> | K,
      values?: Array<T[K] | undefined>,
    ): boolean {
      if (arguments.length === 1) {
        // Check direct items
        const items = itemsOrKey as Array<T | undefined>
        return items.every(item =>
          item === undefined
            ? collection.items.includes(undefined as T)
            : collection.items.includes(item),
        )
      }
      // Check by key/values
      const key = itemsOrKey as K
      return (values || []).every(value =>
        collection.items.some(item => item[key] === value),
      )
    },

    countBy<K extends keyof T | string | number>(
      keyOrCallback: K | ((item: T) => K extends keyof T ? T[K] : string | number),
    ): Map<any, number> {
      const counts = new Map<any, number>()

      for (const item of collection.items) {
        const value = typeof keyOrCallback === 'function'
          ? (keyOrCallback as (item: T) => string | number)(item)
          : item[keyOrCallback as keyof T]

        counts.set(value, (counts.get(value) || 0) + 1)
      }

      return counts
    },

    diffAssoc(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherItems = Array.isArray(other) ? other : other.items
      return collect(
        collection.items.filter((item, index) =>
          otherItems[index] === undefined || JSON.stringify(item) !== JSON.stringify(otherItems[index]),
        ),
      )
    },

    diffKeys<K extends keyof T>(other: Record<K, T[K]>[]) {
      return collect(
        collection.items.filter(item =>
          !other.some(otherItem =>
            Object.keys(item as any).every(key =>
              key in otherItem,
            ),
          ),
        ),
      )
    },

    diffUsing(other: T[], callback: (a: T, b: T) => number) {
      return collect(
        collection.items.filter(item =>
          !other.some(otherItem => callback(item, otherItem) === 0),
        ),
      )
    },

    doesntContain(keyOrItem: keyof T | T, value?: any): boolean {
      if (arguments.length === 1) {
        return !collection.items.includes(keyOrItem as T)
      }
      return !collection.items.some(item =>
        item[keyOrItem as keyof T] === value,
      )
    },

    duplicates<K extends keyof T>(key?: K) {
      const counts = new Map<any, number>()
      const items = collection.items
      items.forEach((item) => {
        const value = key ? item[key] : item
        counts.set(value, (counts.get(value) || 0) + 1)
      })
      return collect(
        items.filter((item) => {
          const value = key ? item[key] : item
          return counts.get(value)! > 1
        }),
      )
    },

    each(callback: (item: T) => void): CollectionOperations<T> {
      collection.items.forEach(callback)
      return this
    },

    eachSpread(callback: (...args: any[]) => void): CollectionOperations<T> {
      collection.items.forEach((item) => {
        callback(...(Array.isArray(item) ? item : [item]))
      })
      return this
    },

    except<K extends keyof T>(...keys: K[]): CollectionOperations<Omit<T, K>> {
      return collect(
        collection.items.map((item) => {
          const result = { ...item }
          keys.forEach(key => delete result[key])
          return result
        }),
      ) as unknown as CollectionOperations<Omit<T, K>>
    },

    firstOrFail() {
      const item = this.first()
      if (!item)
        throw new Error('Item not found.')
      return item
    },

    firstWhere<K extends keyof T>(key: K, value: T[K]) {
      return collection.items.find(item => item[key] === value)
    },

    flatten(depth = Infinity) {
      const flat = (arr: any[], d: number): any[] => {
        return d > 0
          ? arr.reduce((acc, val) =>
            acc.concat(Array.isArray(val) ? flat(val, d - 1) : val), [])
          : arr.slice()
      }
      return collect(flat(collection.items, depth))
    },

    flip<R extends Record<string | number, string | number> = {
      [K in Extract<keyof T, string | number> as T[K] extends string | number ? T[K] : never]: K
    }>(): CollectionOperations<R> {
      // Handle empty collection
      if (this.items.length === 0) {
        return collect([] as R[])
      }

      const flipped: Record<string | number, string | number> = {}

      // Type guard to ensure item is an object with string or number values
      function isFlippable(item: any): item is Record<string, string | number> {
        if (typeof item !== 'object' || item === null)
          return false
        return Object.values(item).every(
          value => typeof value === 'string' || typeof value === 'number',
        )
      }

      this.items.forEach((item) => {
        if (isFlippable(item)) {
          Object.entries(item).forEach(([key, value]) => {
            flipped[value] = key
          })
        }
        // If item is not flippable, ignore or handle as needed
      })

      // Return the flipped object as a single-item collection
      return collect([flipped] as R[])
    },

    forget<K extends keyof T>(key: K): CollectionOperations<Omit<T, K>> {
      return collect(
        collection.items.map((item) => {
          const result = { ...item }
          delete result[key]
          return result
        }),
      ) as unknown as CollectionOperations<Omit<T, K>>
    },

    get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | undefined {
      const item = collection.items[0]
      return item ? (item[key] !== undefined ? item[key] : defaultValue) : defaultValue
    },

    has<K extends keyof T>(key: K): boolean {
      return collection.items.some(item => key in (item as Record<string, unknown>))
    },

    keyBy<K extends keyof T>(key: K) {
      return new Map(
        collection.items.map(item => [item[key], item]),
      )
    },

    macro<Args extends any[]>(
      name: string,
      callback: (this: CollectionOperations<T>, ...args: Args) => CollectionOperations<any>,
    ): void {
      Object.defineProperty(this, name, {
        value(this: CollectionOperations<T>, ...args: Args) {
          return callback.apply(this, args)
        },
        enumerable: false,
        configurable: true,
        writable: true,
      })
    },

    make<U>(items: U[]) {
      return collect(items)
    },

    mapInto<U extends Record<string, any>>(constructor: new () => U): CollectionOperations<U> {
      return collect(
        collection.items.map(item => Object.assign(new constructor(), item)),
      ) as unknown as CollectionOperations<U>
    },

    mapToDictionary<K extends string | number | symbol, V>(
      callback: (item: T) => [K, V],
    ): Map<K, V> {
      const map = new Map<K, V>()
      collection.items.forEach((item) => {
        const [key, value] = callback(item)
        map.set(key, value)
      })
      return map
    },

    mapWithKeys<K extends string | number | symbol, V>(
      callback: (item: T) => [K, V],
    ): Map<K, V> {
      const map = new Map<K, V>()
      collection.items.forEach((item) => {
        const [key, value] = callback(item)
        map.set(key, value)
      })
      return map
    },

    merge<U extends T>(other: U[] | CollectionOperations<U>): CollectionOperations<T | U> {
      const otherItems = Array.isArray(other) ? other : other.items
      return collect<T | U>([...collection.items, ...otherItems])
    },

    mergeRecursive<U>(other: U[] | CollectionOperations<U>): CollectionOperations<RecordMerge< T, U >> {
      function mergeRecursiveHelper<A extends object, B extends object>(
        target: A,
        source: B,
      ): RecordMerge<A, B> {
        if (source === undefined || source === null)
          return target as RecordMerge<A, B>

        if (Array.isArray(source))
          return [...source] as RecordMerge<A, B>

        if (typeof source !== 'object')
          return source as RecordMerge<A, B>

        const result: Record<string, any> = Array.isArray(target) ? [...target] : { ...target }

        for (const key of Object.keys(source)) {
          const sourceValue = (source as Record<string, any>)[key]
          if (Array.isArray(sourceValue)) {
            result[key] = [...sourceValue]
          }
          else if (sourceValue && typeof sourceValue === 'object') {
            result[key] = key in result
              ? mergeRecursiveHelper(
                result[key] as object,
                sourceValue as object,
              )
              : { ...sourceValue }
          }
          else {
            result[key] = sourceValue
          }
        }
        return result as RecordMerge<A, B>
      }

      const otherItems = Array.isArray(other) ? other : other.items
      const merged = collection.items.map((item, index) => {
        return index < otherItems.length
          ? mergeRecursiveHelper(
            item as object,
            otherItems[index] as object,
          )
          : { ...item }
      })
      return collect(merged) as CollectionOperations<RecordMerge<T, U>>
    },

    only<K extends string>(...keys: K[]) {
      return this.map((item: T) => {
        const result = {} as { [P in K & keyof T]?: T[P] }
        keys.forEach((key) => {
          // Type guard to ensure item is an object before using 'in'
          if (item && typeof item === 'object' && key in item) {
            const typedKey = key as keyof T & K
            result[typedKey] = item[typedKey]
          }
        })
        return result
      })
    },

    pad<U = T>(size: number, value: U): CollectionOperations<T | U> {
      const result: Array<T | U> = collection.items.map(item => item as T | U)
      const padSize = Math.abs(size)

      while (result.length < padSize) {
        size > 0 ? result.push(value) : result.unshift(value)
      }

      return collect<T | U>(result)
    },

    pop() {
      return collection.items.pop()
    },

    prepend<U = T>(value: U): CollectionOperations<T | U> {
      const result: Array<T | U> = [value, ...collection.items.map(item => item as T | U)]
      return collect<T | U>(result)
    },

    pull<K extends keyof T>(key: K) {
      const item = collection.items[0]
      return item ? item[key] : undefined
    },

    push<U = T>(value: U): CollectionOperations<T | U> {
      const result: Array<T | U> = [...collection.items.map(item => item as T | U), value]
      return collect<T | U>(result)
    },

    put<K extends string, V>(key: K, value: V): CollectionOperations<any> {
      return collect(
        collection.items.map(item => ({ ...item, [key]: value })),
      )
    },

    random(size?: number) {
      const items = [...collection.items]
      if (typeof size === 'undefined') {
        const index = Math.floor(Math.random() * items.length)
        return collect([items[index]])
      }

      const shuffled = items.sort(() => Math.random() - 0.5)
      return collect(shuffled.slice(0, size))
    },

    reject(predicate: (item: T) => boolean) {
      return this.filter(item => !predicate(item))
    },

    replace(items: T[]) {
      return collect(items)
    },

    replaceRecursive<U>(items: U[]): CollectionOperations<U> {
      function replaceDeep(target: any, source: any): any {
        if (!source || typeof source !== 'object')
          return source
        if (Array.isArray(source)) {
          return source.map((item, index) =>
            replaceDeep(Array.isArray(target) ? target[index] : {}, item),
          )
        }
        const result: any = {}
        for (const key in source) {
          result[key] = replaceDeep(target?.[key], source[key])
        }
        return result
      }
      return collect(replaceDeep(collection.items, items))
    },

    reverse() {
      return collect([...collection.items].reverse())
    },

    shift(): T | undefined {
      if (collection.length === 0)
        return undefined
      const value = collection.items[0]
      collection.items.splice(0, 1)
      return value
    },

    shuffle() {
      return collect([...collection.items].sort(() => Math.random() - 0.5))
    },

    skipUntil(value: T | ((item: T) => boolean)): CollectionOperations<T> {
      const predicate = typeof value === 'function'
        ? value as (item: T) => boolean
        : (item: T) => item === value

      const index = collection.items.findIndex(predicate)
      return collect(
        index === -1 ? [] : collection.items.slice(index),
      ) as CollectionOperations<T>
    },

    skipWhile(value: T | ((item: T) => boolean)) {
      const predicate = typeof value === 'function'
        ? value as (item: T) => boolean
        : (item: T) => item === value

      let index = 0
      while (index < collection.items.length && predicate(collection.items[index])) {
        index++
      }
      return collect(collection.items.slice(index))
    },

    slice(start: number, length?: number) {
      return collect(
        length === undefined
          ? collection.items.slice(start)
          : collection.items.slice(start, start + length),
      )
    },

    sole() {
      if (collection.length !== 1) {
        throw new Error('Collection does not contain exactly one item.')
      }
      return collection.items[0]
    },

    sortDesc() {
      return this.sort((a, b) => {
        if (a < b)
          return 1
        if (a > b)
          return -1
        return 0
      })
    },

    sortKeys() {
      return collect(
        collection.items.map((item) => {
          const sorted: any = {}
          Object.keys(item as object)
            .sort()
            .forEach((key) => {
              sorted[key] = (item as any)[key]
            })
          return sorted as T
        }),
      )
    },

    sortKeysDesc() {
      return collect(
        collection.items.map((item) => {
          const sorted: any = {}
          Object.keys(item as object)
            .sort((a, b) => b.localeCompare(a))
            .forEach((key) => {
              sorted[key] = (item as any)[key]
            })
          return sorted as T
        }),
      )
    },

    splice(start: number, deleteCount?: number, ...items: T[]): CollectionOperations<T> {
      const copy = [...collection.items]
      if (start > copy.length) {
        return collect(copy)
      }
      if (deleteCount === undefined) {
        copy.splice(start)
      }
      else {
        copy.splice(start, deleteCount, ...items)
      }
      return collect(copy)
    },

    split(numberOfGroups: number) {
      const result: T[][] = []
      const itemsPerGroup = Math.ceil(collection.length / numberOfGroups)

      for (let i = 0; i < collection.length; i += itemsPerGroup) {
        result.push(collection.items.slice(i, i + itemsPerGroup))
      }

      return collect(result)
    },

    takeUntil(value: T | ((item: T) => boolean)) {
      const predicate = typeof value === 'function'
        ? value as (item: T) => boolean
        : (item: T) => item === value

      const index = collection.items.findIndex(predicate)
      return index === -1
        ? collect(collection.items)
        : collect(collection.items.slice(0, index))
    },

    takeWhile(value: T | ((item: T) => boolean)) {
      const predicate = typeof value === 'function'
        ? value as (item: T) => boolean
        : (item: T) => item === value

      let index = 0
      while (index < collection.items.length && predicate(collection.items[index])) {
        index++
      }
      return collect(collection.items.slice(0, index))
    },

    times<U>(count: number, callback: (index: number) => U) {
      const items: U[] = []
      for (let i = 0; i < count; i++) {
        items.push(callback(i))
      }
      return collect(items)
    },

    undot() {
      const result: Record<string, any> = {}
      collection.items.forEach((item) => {
        Object.entries(item as object).forEach(([key, value]) => {
          key.split('.').reduce((acc: any, part, index, parts) => {
            if (index === parts.length - 1) {
              acc[part] = value
            }
            else {
              acc[part] = acc[part] || {}
            }
            return acc[part]
          }, result)
        })
      })
      return collect([result])
    },

    unlessEmpty<U = T>(callback: (collection: CollectionOperations<T>) => CollectionOperations<U>): CollectionOperations<T | U> {
      return this.isNotEmpty() ? callback(this) as CollectionOperations<T | U> : this as CollectionOperations<T | U>
    },

    unlessNotEmpty<U = T>(callback: (collection: CollectionOperations<T>) => CollectionOperations<U>): CollectionOperations<T | U> {
      return this.isEmpty() ? callback(this) as CollectionOperations<T | U> : this as CollectionOperations<T | U>
    },

    unwrap<U>(value: U | U[] | CollectionOperations<U>): U extends any[] ? U : U[] {
      if (value instanceof Object && 'items' in value) {
        return (value as CollectionOperations<U>).toArray() as U extends any[] ? U : U[]
      }
      return (Array.isArray(value) ? value : [value]) as U extends any[] ? U : U[]
    },

    whenEmpty<U = T>(callback: (collection: CollectionOperations<T>) => CollectionOperations<U>): CollectionOperations<T | U> {
      return this.isEmpty() ? callback(this) as CollectionOperations<T | U> : this as CollectionOperations<T | U>
    },

    whenNotEmpty<U = T>(callback: (collection: CollectionOperations<T>) => CollectionOperations<U>): CollectionOperations<T | U> {
      return this.isNotEmpty() ? callback(this) as CollectionOperations<T | U> : this as CollectionOperations<T | U>
    },

    wrap<U>(value: U | U[]): CollectionOperations<U> {
      if (Array.isArray(value)) {
        return collect(value)
      }
      return collect([value])
    },

    zip<U>(array: U[]): CollectionOperations<[T, U | undefined]> {
      return collect(
        collection.items.map((item, index) => [item, array[index]] as [T, U | undefined]),
      )
    },

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

    first: function <K extends keyof T>(key?: K): T | T[K] | undefined {
      const item = collection.items[0]
      if (arguments.length === 0) {
        return item
      }
      return item ? item[key!] : undefined
    } as {
      (): T | undefined
      <K extends keyof T>(key: K): T[K] | undefined
    },

    last: function <K extends keyof T>(key?: K): T | T[K] | undefined {
      const item = collection.items[collection.length - 1]
      if (arguments.length === 0) {
        return item
      }
      return item ? item[key!] : undefined
    } as {
      (): T | undefined
      <K extends keyof T>(key: K): T[K] | undefined
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

    median(key?: keyof T): number | undefined {
      if (collection.length === 0)
        return undefined

      const values = key
        ? collection.items.map(item => Number(item[key])).sort((a, b) => a - b)
        : collection.items.map(item => Number(item)).sort((a, b) => a - b)

      const mid = Math.floor(values.length / 2)
      return values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid]
    },

    mode(key?: keyof T): T | undefined {
      if (collection.length === 0)
        return undefined

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

    partition(predicate: (item: T) => boolean): [CollectionOperations<T>, CollectionOperations<T>] {
      const pass: T[] = []
      const fail: T[] = []

      for (const item of collection.items) {
        if (predicate(item)) {
          pass.push(item)
        }
        else {
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
      return collect(collection.items.filter((item) => {
        const value = item[key]
        return value >= min && value <= max
      }))
    },

    whereNotBetween<K extends keyof T>(key: K, min: T[K], max: T[K]): CollectionOperations<T> {
      return collect(collection.items.filter((item) => {
        const value = item[key]
        return value < min || value > max
      }))
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

    when(
      condition: boolean | ConditionalCallback<T>,
      callback: (collection: CollectionOperations<T>) => CollectionOperations<T>,
    ): CollectionOperations<T> {
      const shouldRun = typeof condition === 'function' ? condition(this) : condition
      return shouldRun ? callback(this) : this
    },

    unless(
      condition: boolean | ConditionalCallback<T>,
      callback: (collection: CollectionOperations<T>) => CollectionOperations<T>,
    ): CollectionOperations<T> {
      const shouldRun = typeof condition === 'function' ? condition(this) : condition
      return shouldRun ? this : callback(this)
    },

    sort(compareFunction?: CompareFunction<T>): CollectionOperations<T> {
      if (!compareFunction) {
        const sorted = [...collection.items]

        // Separate items by type
        const nulls: T[] = []
        const undefineds: T[] = []
        const values: T[] = []

        for (const item of sorted) {
          if (item === null) {
            nulls.push(item)
          }
          else if (item === undefined) {
            undefineds.push(item)
          }
          else {
            values.push(item)
          }
        }

        // Sort regular values
        values.sort((a: any, b: any) => {
          if (typeof a === 'number' && typeof b === 'number') {
            return a - b
          }
          return String(a).localeCompare(String(b))
        })

        // Combine in desired order: nulls, undefineds, sorted values
        return collect([...nulls, ...undefineds, ...values])
      }
      return collect([...collection.items].sort(compareFunction))
    },

    sortBy<K extends keyof T>(key: K, direction: 'asc' | 'desc' = 'asc'): CollectionOperations<T> {
      const sorted = [...collection.items]

      if (sorted.length === 0) {
        return collect(sorted)
      }

      // Check if any item has a defined value for the key
      const hasDefinedValues = sorted.some(item =>
        item?.[key] !== undefined && item[key] !== null,
      )

      // Return original order if no item has a defined value for the key
      if (!hasDefinedValues) {
        return collect(sorted)
      }

      return collect(sorted.sort((a, b) => {
        const aVal = a?.[key]
        const bVal = b?.[key]

        // Handles undefined/null values
        if (aVal === undefined || aVal === null) {
          return direction === 'asc' ? -1 : 1
        }
        if (bVal === undefined || bVal === null) {
          return direction === 'asc' ? 1 : -1
        }

        // Sort numbers numerically
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal
        }

        // Sort everything else as strings
        const comparison = String(aVal).localeCompare(String(bVal))
        return direction === 'asc' ? comparison : -comparison
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

    // setDiff(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
    //   const otherSet = new Set(Array.isArray(other) ? other : other.items)
    //   return collect(collection.items.filter(item => !otherSet.has(item)))
    // },

    // get currentVersion(): number {
    //   return versionStore.currentVersion
    // },

    // async snapshot(): Promise<number> {
    //   const version = versionStore.currentVersion + 1
    //   versionStore.snapshots.set(version, {
    //     items: [...collection.items],
    //     timestamp: new Date(),
    //   })
    //   versionStore.currentVersion = version
    //   return version
    // },

    // hasVersion(version: number): boolean {
    //   return versionStore.snapshots.has(version)
    // },

    // getVersion(version: number): CollectionOperations<T> | null {
    //   const snapshot = versionStore.snapshots.get(version)
    //   if (!snapshot)
    //     return null
    //   return collect(snapshot.items)
    // },

    // diff(version1: number, version2: number): CollectionOperations<VersionInfo<T>> {
    //   // Ensure both versions exist
    //   const snapshot1 = versionStore.snapshots.get(version1)
    //   const snapshot2 = versionStore.snapshots.get(version2)

    //   if (!snapshot1 || !snapshot2) {
    //     throw new Error('One or both versions do not exist')
    //   }

    //   const changes: Array<{
    //     type: 'add' | 'update' | 'delete'
    //     item: T
    //     previousItem?: T
    //   }> = []

    //   // Create maps for easier lookup
    //   const items1 = new Map(snapshot1.items.map(item => [getItemKey(item), item]))
    //   const items2 = new Map(snapshot2.items.map(item => [getItemKey(item), item]))

    //   // Find deletions (in items1 but not in items2)
    //   for (const [key, item] of items1) {
    //     if (!items2.has(key)) {
    //       changes.push({ type: 'delete', item })
    //     }
    //   }

    //   // Find additions and updates
    //   for (const [key, item] of items2) {
    //     if (!items1.has(key)) {
    //       changes.push({ type: 'add', item })
    //     }
    //     else {
    //       const oldItem = items1.get(key)!
    //       if (!deepEqual(oldItem, item)) {
    //         changes.push({
    //           type: 'update',
    //           item,
    //           previousItem: oldItem,
    //         })
    //       }
    //     }
    //   }

    //   return collect([{
    //     version: version2,
    //     timestamp: new Date(),
    //     changes,
    //   }])
    // },

    // diffSummary(version1: number, version2: number) {
    //   const diff = this.diff(version1, version2)
    //   const changes = diff.first()?.changes || []

    //   const result = {
    //     added: 0,
    //     removed: 0,
    //     updated: 0,
    //     changes: [] as Array<{
    //       type: 'add' | 'update' | 'delete'
    //       field?: keyof T
    //       oldValue?: any
    //       newValue?: any
    //     }>,
    //   }

    //   for (const change of changes) {
    //     switch (change.type) {
    //       case 'add':
    //         result.added++
    //         result.changes.push({ type: 'add' })
    //         break

    //       case 'delete':
    //         result.removed++
    //         result.changes.push({ type: 'delete' })
    //         break

    //       case 'update': {
    //         result.updated++

    //         // Compare fields to generate detailed changes
    //         if (change.previousItem && change.item) {
    //           const oldItem = change.previousItem
    //           const newItem = change.item

    //           for (const key of Object.keys(newItem) as Array<keyof T>) {
    //             if (!deepEqual(oldItem[key], newItem[key])) {
    //               result.changes.push({
    //                 type: 'update',
    //                 field: key,
    //                 oldValue: oldItem[key],
    //                 newValue: newItem[key],
    //               })
    //             }
    //           }
    //         }
    //         break
    //       }
    //     }
    //   }

    //   return result
    // },

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

    product(key?: keyof T): number {
      if (collection.length === 0)
        return 0

      return collection.items.reduce((product, item) => {
        const value = key ? Number(item[key]) : Number(item)
        return product * (Number.isNaN(value) ? 1 : value)
      }, 1)
    },

    standardDeviation(key?: keyof T): StandardDeviationResult {
      if (collection.length <= 1) {
        return { population: 0, sample: 0 }
      }

      const mean = this.avg(key)
      const squaredDiffs = collection.items.map((item) => {
        const value = key ? Number(item[key]) : Number(item)
        const diff = value - mean
        return diff * diff
      })

      const populationVariance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / collection.length
      const sampleVariance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (collection.length - 1)

      return {
        population: Math.sqrt(populationVariance),
        sample: Math.sqrt(sampleVariance),
      }
    },

    percentile(p: number, key?: keyof T): number | undefined {
      if (p < 0 || p > 100 || collection.length === 0)
        return undefined

      const values = key
        ? collection.items.map(item => Number(item[key])).sort((a, b) => a - b)
        : collection.items.map(item => Number(item)).sort((a, b) => a - b)

      const index = Math.ceil((p / 100) * values.length) - 1
      return values[index]
    },

    variance(key?: keyof T): number {
      return this.standardDeviation(key).population ** 2
    },

    frequency(key?: keyof T): Map<any, number> {
      const freq = new Map<any, number>()
      for (const item of collection.items) {
        const value = key ? item[key] : item
        freq.set(value, (freq.get(value) || 0) + 1)
      }
      return freq
    },

    whereNull<K extends keyof T>(key: K): CollectionOperations<T> {
      return collect(collection.items.filter(item => item[key] == null))
    },

    whereNotNull<K extends keyof T>(key: K): CollectionOperations<T> {
      return collect(collection.items.filter(item => item[key] != null))
    },

    whereLike<K extends keyof T>(key: K, pattern: string): CollectionOperations<T> {
      const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i')
      return collect(collection.items.filter(item => regex.test(String(item[key]))))
    },

    whereRegex<K extends keyof T>(key: K, regex: RegExp): CollectionOperations<T> {
      return collect(collection.items.filter(item => regex.test(String(item[key]))))
    },

    whereInstanceOf<U>(constructor: new (...args: any[]) => U): CollectionOperations<T> {
      return collect(collection.items.filter(item => item instanceof constructor))
    },

    async mapAsync<U>(callback: AsyncCallback<T, U>): Promise<CollectionOperations<Awaited<U>>> {
      const results = await Promise.all(
        collection.items.map((item, index) => callback(item, index)),
      )
      return collect(results)
    },

    async filterAsync(callback: AsyncCallback<T, boolean>): Promise<CollectionOperations<T>> {
      const results = await Promise.all(
        collection.items.map(async (item, index) => ({
          item,
          keep: await callback(item, index),
        })),
      )
      return collect(results.filter(({ keep }) => keep).map(({ item }) => item))
    },

    async reduceAsync<U>(
      callback: (acc: U, item: T) => Promise<U>,
      initialValue: U,
    ): Promise<U> {
      let result = initialValue
      for (const item of collection.items) {
        result = await callback(result, item)
      }
      return result
    },

    async everyAsync(callback: AsyncCallback<T, boolean>): Promise<boolean> {
      const results = await Promise.all(
        collection.items.map((item, index) => callback(item, index)),
      )
      return results.every(result => result)
    },

    async someAsync(callback: AsyncCallback<T, boolean>): Promise<boolean> {
      const results = await Promise.all(
        collection.items.map((item, index) => callback(item, index)),
      )
      return results.some(result => result)
    },

    paginate(perPage: number, page: number = 1): PaginationResult<T> {
      const total = collection.length
      const lastPage = Math.ceil(total / perPage)
      const currentPage = Math.min(Math.max(page, 1), lastPage)

      return {
        data: this.forPage(currentPage, perPage),
        total,
        perPage,
        currentPage,
        lastPage,
        hasMorePages: currentPage < lastPage,
      }
    },

    forPage(page: number, perPage: number): CollectionOperations<T> {
      // Validate inputs
      if (page < 1 || perPage <= 0) {
        return collect([] as T[])
      }

      const offset = (page - 1) * perPage

      // Check if offset is outside the collection bounds
      if (offset >= collection.items.length) {
        return collect([] as T[])
      }

      return collect(collection.items.slice(offset, offset + perPage))
    },

    async *cursor(size: number): AsyncGenerator<CollectionOperations<T>, void, unknown> {
      let offset = 0
      while (offset < collection.length) {
        yield collect(collection.items.slice(offset, offset + size))
        offset += size
      }
    },

    symmetricDiff<U = T>(other: U[] | CollectionOperations<U>): CollectionOperations<T | U> {
      const otherItems = Array.isArray(other) ? other : other.items
      const otherSet = new Set(otherItems)
      const thisSet = new Set(collection.items)
      const result = new Set<T | U>()

      // Add items that are in this collection but not in other
      collection.items.forEach((item) => {
        if (!otherSet.has(item as unknown as U)) {
          result.add(item)
        }
      })

      // Add items that are in other but not in this collection
      otherItems.forEach((item) => {
        if (!thisSet.has(item as unknown as T)) {
          result.add(item)
        }
      })

      return collect([...result])
    },

    cartesianProduct<U>(other: U[] | CollectionOperations<U>): CollectionOperations<[T, U]> {
      const otherItems = Array.isArray(other) ? other : other.items
      const result: [T, U][] = []

      for (const item1 of collection.items) {
        for (const item2 of otherItems) {
          result.push([item1, item2])
        }
      }

      return collect(result)
    },

    groupByMultiple<K extends keyof T>(...keys: K[]): Map<string, CollectionOperations<T>> {
      const groups = new Map<string, T[]>()

      for (const item of collection.items) {
        const groupKey = keys.map(key => String(item[key])).join('::')
        if (!groups.has(groupKey)) {
          groups.set(groupKey, [])
        }
        groups.get(groupKey)!.push(item)
      }

      return new Map(
        Array.from(groups.entries()).map(
          ([key, items]) => [key, collect(items)],
        ),
      )
    },

    describe<K extends keyof T>(key?: K): Map<string, number> {
      const stats = new Map<string, number>()
      stats.set('count', this.count())
      stats.set('mean', this.avg(key))
      stats.set('min', Number(this.min(key)))
      stats.set('max', Number(this.max(key)))
      stats.set('sum', this.sum(key))

      const stdDev = this.standardDeviation(key)
      stats.set('stdDev', stdDev.population)
      stats.set('variance', this.variance(key))

      const q1 = this.percentile(25, key)
      const q3 = this.percentile(75, key)
      if (q1 !== undefined && q3 !== undefined) {
        stats.set('q1', q1)
        stats.set('q3', q3)
        stats.set('iqr', q3 - q1)
      }

      return stats
    },

    debug(): CollectionOperations<T> {
      // eslint-disable-next-line no-console
      console.log({
        items: collection.items,
        length: collection.length,
        memory: process.memoryUsage(),
      })
      return this
    },

    dump(): void {
      // eslint-disable-next-line no-console
      console.log(collection.items)
    },

    dd(): never {
      this.dump()
      process.exit(1)
    },

    timeSeries({ dateField, valueField, interval = 'day', fillGaps = true }: TimeSeriesOptions): CollectionOperations<TimeSeriesPoint> {
      // Safely convert values to dates and numbers with proper type checking
      const points: TimeSeriesPoint[] = collection.items.map((item) => {
        const dateValue = item[dateField as keyof T]
        const numValue = item[valueField as keyof T]

        const date = dateValue instanceof Date
          ? dateValue
          : new Date(String(dateValue))

        const value = typeof numValue === 'number'
          ? numValue
          : Number(numValue)

        return { date, value }
      }).filter(point => !Number.isNaN(point.date.getTime())) // Filter out invalid dates

      // Sort points by date
      const sorted = points.sort((a, b) => a.date.getTime() - b.date.getTime())

      if (!fillGaps || sorted.length === 0) {
        return collect(sorted)
      }

      // Find min and max dates using timestamps
      const startTimestamp = Math.min(...sorted.map(point => point.date.getTime()))
      const endTimestamp = Math.max(...sorted.map(point => point.date.getTime()))
      let currentTimestamp = startTimestamp

      const result: TimeSeriesPoint[] = []
      const endTime = endTimestamp + 1 // Add 1ms to include the end date

      while (currentTimestamp < endTime) {
        const currentDate = new Date(currentTimestamp)
        const found = sorted.find(item =>
          isSameDay(item.date, currentDate),
        )

        result.push({
          date: new Date(currentDate),
          value: found ? found.value : 0,
        })

        // Calculate next timestamp based on interval
        currentTimestamp = getNextTimestamp(currentDate, interval)
      }

      return collect(result)
    },

    movingAverage({ window, centered = false }: MovingAverageOptions): CollectionOperations<number> {
      // Handle empty collection first
      if (collection.length === 0) {
        return collect<number>([])
      }

      // Handle invalid window size
      if (window < 1) {
        throw new Error('Invalid window size')
      }

      // Handle window size larger than collection length
      if (window > collection.length) {
        throw new Error('Invalid window size')
      }

      // If window size equals collection length, return the overall average
      if (window === collection.length) {
        const avg = collection.items.reduce((a, b) => Number(a) + Number(b), 0) / window
        return collect<number>([avg])
      }

      const values = collection.items.map(item => Number(item))
      const result: number[] = []
      const offset = centered ? Math.floor(window / 2) : 0

      for (let i = 0; i <= values.length - window; i++) {
        const sum = values.slice(i, i + window).reduce((a, b) => a + b, 0)
        result[i + offset] = sum / window
      }

      // Fill in missing values at the edges when using centered moving average
      if (centered) {
        // Fill start values
        const startOffset = Math.floor(window / 2)
        for (let i = 0; i < startOffset; i++) {
          const slice = values.slice(0, window)
          result[i] = slice.reduce((a, b) => a + b, 0) / slice.length
        }

        // Fill end values
        const endOffset = Math.ceil(window / 2) - 1
        for (let i = 0; i < endOffset; i++) {
          const idx = values.length - endOffset + i
          const slice = values.slice(-window)
          result[idx] = slice.reduce((a, b) => a + b, 0) / slice.length
        }
      }

      return collect<number>(result)
    },

    async validate(schema: ValidationSchema<T>): Promise<ValidationResult> {
      const errors = new Map<string, string[]>()

      // Type-safe entries iteration
      const entries = Object.entries(schema) as Array<[keyof T, ValidationRule<any>[]]>

      for (const [key, rules] of entries) {
        if (!rules || !Array.isArray(rules))
          continue

        for (const item of collection.items) {
          const value = item[key]
          const itemErrors: string[] = []

          for (const rule of rules) {
            try {
              const result = await rule(value)
              if (!result) {
                itemErrors.push(`Validation failed for ${String(key)}`)
              }
            }
            catch (error) {
              itemErrors.push(`Validation error for ${String(key)}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          }

          if (itemErrors.length > 0) {
            errors.set(String(key), itemErrors)
          }
        }
      }

      return {
        isValid: errors.size === 0,
        errors,
      }
    },

    validateSync(schema: ValidationSchema<T>): ValidationResult {
      const errors = new Map<string, string[]>()
      const entries = Object.entries(schema) as Array<[keyof T, ValidationRule<any>[]]>

      for (const [key, rules] of entries) {
        if (!rules || !Array.isArray(rules))
          continue

        for (const item of collection.items) {
          const value = item[key]
          const itemErrors: string[] = []

          for (const rule of rules) {
            try {
              const result = rule(value)
              if (result instanceof Promise) {
                throw new TypeError('Async validation rules are not supported in validateSync')
              }
              if (!result) {
                itemErrors.push(`Validation failed for ${String(key)}`)
              }
            }
            catch (error) {
              itemErrors.push(`Validation error for ${String(key)}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          }

          if (itemErrors.length > 0) {
            errors.set(String(key), itemErrors)
          }
        }
      }

      return {
        isValid: errors.size === 0,
        errors,
      }
    },

    stream(): ReadableStream<T> {
      let index = 0
      return new ReadableStream({
        pull: (controller) => {
          if (index < collection.length) {
            controller.enqueue(collection.items[index++])
          }
          else {
            controller.close()
          }
        },
      })
    },

    async fromStream(stream: ReadableStream<T>): Promise<CollectionOperations<T>> {
      const items: T[] = []
      const reader = stream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done)
            break
          items.push(value)
        }
      }
      finally {
        reader.releaseLock()
      }

      return collect(items)
    },

    fuzzyMatch<K extends keyof T>(key: K, pattern: string, threshold = 0.7): CollectionOperations<T> {
      function levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = []

        for (let i = 0; i <= a.length; i++) {
          matrix[i] = [i]
        }

        for (let j = 0; j <= b.length; j++) {
          matrix[0][j] = j
        }

        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + cost,
            )
          }
        }

        return matrix[a.length][b.length]
      }

      function similarity(a: string, b: string): number {
        const maxLength = Math.max(a.length, b.length)
        return maxLength === 0 ? 1 : 1 - levenshteinDistance(a, b) / maxLength
      }

      return collect(
        collection.items.filter(item =>
          similarity(String(item[key]), pattern) >= threshold,
        ),
      )
    },

    metrics(): CollectionMetrics {
      const metrics: CollectionMetrics = {
        count: this.count(),
        nullCount: 0,
        uniqueCount: this.unique().count(),
        heapUsed: 0,
        heapTotal: 0,
      }

      // Get memory metrics
      const memory = process.memoryUsage()
      metrics.heapUsed = memory.heapUsed
      metrics.heapTotal = memory.heapTotal

      // Handle null counts only if collection is not empty
      if (collection.length > 0) {
        const firstItem = collection.items[0]
        // Now Object.keys will work correctly with T extends object
        const fields = Object.keys(firstItem as object) as Array<keyof T>

        metrics.fieldCount = fields.length

        // Create distribution of null values per field
        const nullFieldsDistribution = new Map<string, number>()

        for (const field of fields) {
          const nullCount = collection.items.filter(item => item[field] === null).length
          nullFieldsDistribution.set(String(field), nullCount)
          metrics.nullCount += nullCount
        }

        metrics.nullFieldsDistribution = nullFieldsDistribution
      }

      return metrics
    },

    async profile(): Promise<{ time: number, memory: number }> {
      const start = process.hrtime()
      const startMemory = process.memoryUsage().heapUsed

      // Force iteration through the collection
      await Promise.resolve([...collection.items])

      const [seconds, nanoseconds] = process.hrtime(start)
      const endMemory = process.memoryUsage().heapUsed

      return {
        time: seconds * 1000 + nanoseconds / 1000000,
        memory: endMemory - startMemory,
      }
    },

    transform<U>(schema: Record<keyof U, (item: T) => U[keyof U]>): CollectionOperations<U> {
      return collect(
        collection.items.map((item) => {
          const result = {} as U
          // Use type assertion to maintain type safety while iterating
          const entries = Object.entries(schema) as Array<[keyof U, (item: T) => U[keyof U]]>
          for (const [key, transform] of entries) {
            result[key] = transform(item)
          }
          return result
        }),
      )
    },

    kmeans({ k, maxIterations = 100, distanceMetric = 'euclidean' }: KMeansOptions): KMeansResult<T> {
      if (collection.length === 0) {
        return createKMeansResult(collect<ClusterResult<T>>([]))
      }

      if (k <= 0 || k > collection.length) {
        throw new Error('Invalid k value')
      }

      // Convert items to numeric arrays
      const data: number[][] = collection.items.map((item) => {
        const values = Object.values(item as Record<string, unknown>)
          .filter(v => typeof v === 'number') as number[]
        return values
      })

      if (data.some(arr => arr.length === 0)) {
        throw new Error('No numeric values found in data')
      }

      // Initialize centroids
      const centroids = data
        .slice(0, k)
        .map(point => [...point])

      // Fixed Array.from typing
      const currentClusters = Array.from({ length: data.length }).fill(0) as number[]
      let iterations = 0
      let hasChanged = true

      while (hasChanged && iterations < maxIterations) {
        hasChanged = false

        // Assign points to nearest centroid
        data.forEach((point, pointIndex) => {
          const clusterDistances = centroids.map((centroid, index) => ({
            index,
            distance: distanceMetric === 'euclidean'
              ? Math.sqrt(point.reduce((sum, val, i) => sum + (val - centroid[i]) ** 2, 0))
              : point.reduce((sum, val, i) => sum + Math.abs(val - centroid[i]), 0),
          }))

          const nearest = clusterDistances.reduce((min, curr) =>
            curr.distance < min.distance ? curr : min,
          )

          if (currentClusters[pointIndex] !== nearest.index) {
            hasChanged = true
            currentClusters[pointIndex] = nearest.index
          }
        })

        // Update centroids
        for (let i = 0; i < k; i++) {
          const clusterPoints = data.filter((_, index) => currentClusters[index] === i)
          if (clusterPoints.length > 0) {
            centroids[i] = clusterPoints[0].map((_, dim) =>
              clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length,
            )
          }
        }

        iterations++
      }

      const results = collection.items.map((item, i) => ({
        cluster: currentClusters[i],
        data: item,
      } as ClusterResult<T>))

      return createKMeansResult(collect(results))
    },

    linearRegression<K extends keyof T>(dependent: K, independents: K[]): RegressionResult {
      if (collection.length <= independents.length) {
        throw new Error('Insufficient data points for regression')
      }

      try {
        // Extract X (independent variables) and y (dependent variable)
        const y = collection.items.map(item => Number(item[dependent]))
        const X = collection.items.map(item => [1, ...independents.map(ind => Number(item[ind]))])

        // Simple matrix operations
        function dot(a: number[], b: number[]): number {
          return a.reduce((sum, val, i) => sum + val * b[i], 0)
        }

        function transpose(matrix: number[][]): number[][] {
          return matrix[0].map((_, i) => matrix.map(row => row[i]))
        }

        // Calculate coefficients using normal equations with added stability
        const Xt = transpose(X)
        const XtX = Xt.map(row => X[0].map((_, j) => dot(row, X.map(r => r[j]))))
        const Xty = Xt.map(row => dot(row, y))

        // Add small regularization term for stability
        const lambda = 1e-10
        for (let i = 0; i < XtX.length; i++) {
          XtX[i][i] += lambda
        }

        // Solve system using Gaussian elimination with pivoting
        const n = XtX.length
        const augmented = XtX.map((row, i) => [...row, Xty[i]])

        for (let i = 0; i < n; i++) {
          let maxRow = i
          for (let j = i + 1; j < n; j++) {
            if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
              maxRow = j
            }
          }

          if (maxRow !== i) {
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]
          }

          const pivot = augmented[i][i]
          if (Math.abs(pivot) < 1e-10) {
            throw new Error('Matrix is nearly singular')
          }

          for (let j = i; j <= n; j++) {
            augmented[i][j] /= pivot
          }

          for (let j = 0; j < n; j++) {
            if (j !== i) {
              const factor = augmented[j][i]
              for (let k = i; k <= n; k++) {
                augmented[j][k] -= factor * augmented[i][k]
              }
            }
          }
        }

        const coefficients = augmented.map(row => row[n])

        // Calculate predictions
        const predictions = X.map(row => dot(row, coefficients))

        // Calculate R-squared with stability checks
        const yMean = y.reduce((a, b) => a + b, 0) / y.length
        const totalSS = y.reduce((ss, val) => ss + (val - yMean) ** 2, 0)
        const residualSS = predictions.reduce((ss, pred, i) => ss + (y[i] - pred) ** 2, 0)
        const rSquared = totalSS === 0 ? 0 : Math.min(1, Math.max(0, 1 - (residualSS / totalSS)))

        // Calculate residuals
        const residuals = y.map((actual, i) => actual - predictions[i])

        return {
          coefficients,
          rSquared: Number.isFinite(rSquared) ? rSquared : 0,
          predictions,
          residuals,
        }
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
      catch (error) {
        // Return default values for error cases
        const n = collection.length
        const y = collection.items.map(item => Number(item[dependent]))
        const yMean = y.reduce((a, b) => a + b, 0) / n

        return {
          coefficients: Array.from({ length: independents.length + 1 }, () => 0),
          rSquared: 0,
          predictions: Array.from({ length: n }, () => yMean),
          residuals: y.map(val => val - yMean),
        }
      }
    },

    async parallel<U>(
      callback: (chunk: CollectionOperations<T>) => Promise<U>,
      options: { chunks?: number, maxConcurrency?: number } = {},
    ): Promise<CollectionOperations<U>> {
      const { chunks = navigator.hardwareConcurrency || 4, maxConcurrency = chunks } = options
      const chunkSize = Math.ceil(collection.length / chunks)
      const batches = this.chunk(chunkSize)

      // Create a semaphore for managing concurrency
      let runningTasks = 0
      const queue: Promise<any>[] = []
      const results: U[] = []

      for (const batch of batches.items) {
        // Wait if we've hit max concurrency
        // eslint-disable-next-line no-unmodified-loop-condition
        while (runningTasks >= maxConcurrency) {
          await Promise.race(queue)
        }

        runningTasks++

        // Create a reference to store the promise
        let removeTask: (() => void) | undefined

        const task = (async () => {
          try {
            const result = await callback(collect(batch))
            results.push(result)
          }
          finally {
            runningTasks--
            removeTask?.()
          }
        })()

        // Set up the removal function after promise is created
        removeTask = () => {
          const index = queue.indexOf(task)
          if (index > -1) {
            queue.splice(index, 1)
          }
        }

        queue.push(task)
      }

      // Wait for all tasks to complete
      await Promise.all(queue)
      return collect(results)
    },

    index<K extends keyof T>(keys: K[]): CollectionOperations<T> {
      const indexes = new Map<K, Map<T[K], T[]>>()

      for (const key of keys) {
        const index = new Map<T[K], T[]>()
        for (const item of collection.items) {
          const value = item[key]
          if (!index.has(value)) {
            index.set(value, [])
          }
          index.get(value)!.push(item)
        }
        indexes.set(key, index)
      }

      // Attach indexes to collection for future use
      ;(this as any).__indexes = indexes
      return this
    },

    explain(): string {
      const pipeline: string[] = []
      // eslint-disable-next-line ts/no-this-alias
      let currentOp = this

      while ((currentOp as any).__previous) {
        pipeline.unshift((currentOp as any).__operation)
        currentOp = (currentOp as any).__previous
      }

      return pipeline
        .map((op, i) => `${i + 1}. ${op}`)
        .join('\n')
    },

    async benchmark(): Promise<{
      timing: Record<string, number>
      memory: Record<string, number>
      complexity: Record<string, string>
    }> {
      const timings: Record<string, number> = {}
      const memory: Record<string, number> = {}
      const complexity: Record<string, string> = {}

      // Measure various operations
      const ops = ['filter', 'map', 'reduce', 'sort']
      for (const op of ops) {
        const start = performance.now()
        const memStart = process.memoryUsage().heapUsed

        // Perform operation
        switch (op) {
          case 'filter':
            this.filter(() => true)
            complexity[op] = 'O(n)'
            break
          case 'map':
            this.map(x => x)
            complexity[op] = 'O(n)'
            break
          case 'reduce':
            this.reduce((acc: any) => acc, null)
            complexity[op] = 'O(n)'
            break
          case 'sort':
            this.sort()
            complexity[op] = 'O(n log n)'
            break
        }

        timings[op] = performance.now() - start
        memory[op] = process.memoryUsage().heapUsed - memStart
      }

      return { timing: timings, memory, complexity }
    },

    // metadata() {
    //   const schema: Record<string, string> = {}
    //   const constraints: Record<string, string[]> = {}
    //   const statistics: Record<string, Record<string, number>> = {}

    //   if (collection.length > 0) {
    //     const sample = collection.items[0]
    //     for (const [key, value] of Object.entries(sample)) {
    //       // Infer schema
    //       schema[key] = typeof value

    //       // Collect constraints
    //       constraints[key] = []
    //       if (value !== null)
    //         constraints[key].push('NOT NULL')
    //       if (typeof value === 'number') {
    //         const values = collection.items.map(item => item[key as keyof T])
    //         const min = Math.min(...values as number[])
    //         const max = Math.max(...values as number[])
    //         constraints[key].push(`MIN(${min})`, `MAX(${max})`)
    //       }

    //       // Calculate statistics
    //       statistics[key] = {
    //         nullCount: collection.items.filter(item => item[key as keyof T] === null).length,
    //         uniqueCount: new Set(collection.items.map(item => item[key as keyof T])).size,
    //       }
    //     }
    //   }

    //   return {
    //     schema,
    //     constraints,
    //     statistics,
    //     quality: this.dataQuality(),
    //   }
    // },

    // dataQuality(): DataQualityMetrics {
    //   if (collection.length === 0) {
    //     return {
    //       completeness: 1,
    //       accuracy: 1,
    //       consistency: 1,
    //       uniqueness: 1,
    //       timeliness: 1,
    //     }
    //   }

    //   const fields = Object.keys(collection.items[0])

    //   // Calculate completeness (% of non-null values)
    //   const completeness = fields.reduce((acc, field) => {
    //     const nullCount = collection.items.filter(item => item[field as keyof T] === null).length
    //     return acc + (1 - nullCount / collection.length)
    //   }, 0) / fields.length

    //   // Calculate uniqueness (% of unique values per field)
    //   const uniqueness = fields.reduce((acc, field) => {
    //     const uniqueCount = new Set(collection.items.map(item => item[field as keyof T])).size
    //     return acc + uniqueCount / collection.length
    //   }, 0) / fields.length

    //   // Other metrics would need specific business rules
    //   return {
    //     completeness,
    //     accuracy: 1, // Would need validation rules
    //     consistency: 1, // Would need business rules
    //     uniqueness,
    //     timeliness: 1, // Would need timestamp analysis
    //   }
    // },

    lazy(): LazyCollectionOperations<T> {
      // Create a generator function for the current collection
      async function* collectionGenerator(items: T[]): AsyncGenerator<T, void, unknown> {
        for (const item of items) {
          yield item
        }
      }

      // Initialize lazy operations with the current collection's items
      return createLazyOperations(collectionGenerator(collection.items))
    },

    mapToGroups<K extends keyof T | string | number, V>(callback: (item: T) => [K, V]): Map<K, CollectionOperations<V>> {
      const groups = new Map<K, V[]>()
      for (const item of collection.items) {
        const [key, value] = callback(item)
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(value)
      }
      return new Map(
        Array.from(groups.entries()).map(
          ([key, items]) => [key, collect(items)],
        ),
      )
    },

    mapSpread<U>(callback: (...args: any[]) => U): CollectionOperations<U> {
      return collect(collection.items.map(item => callback(...(Array.isArray(item) ? item : [item]))))
    },

    mapUntil<U>(callback: (item: T, index: number) => U, predicate: (item: U) => boolean): CollectionOperations<U> {
      const results: U[] = []
      for (let i = 0; i < collection.items.length; i++) {
        const result = callback(collection.items[i], i)
        if (predicate(result))
          break
        results.push(result)
      }
      return collect(results)
    },

    pivot<K extends keyof T, V extends keyof T>(keyField: K, valueField: V): Map<T[K], T[V]> {
      return new Map(
        collection.items.map(item => [item[keyField], item[valueField]]),
      )
    },

    // String operations
    join(this: CollectionOperations<string>, separator?: string): string {
      return collection.items.join(separator)
    },

    implode<K extends keyof T>(key: K, separator: string = ''): string {
      return collection.items.map(item => String(item[key])).join(separator)
    },

    lower(this: CollectionOperations<string>): CollectionOperations<string> {
      return collect(collection.items.map(item => String(item).toLowerCase()))
    },

    upper(this: CollectionOperations<string>): CollectionOperations<string> {
      return collect(collection.items.map(item => String(item).toUpperCase()))
    },

    slug(this: CollectionOperations<string>): CollectionOperations<string> {
      return collect(collection.items.map(item =>
        String(item)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      ))
    },

    // Set operations
    power(): CollectionOperations<CollectionOperations<T>> {
      const powerSet: T[][] = [[]]
      for (const item of collection.items) {
        const len = powerSet.length
        for (let i = 0; i < len; i++) {
          powerSet.push([...powerSet[i], item])
        }
      }
      return collect(powerSet.map(set => collect(set)))
    },

    // Analysis and statistics
    correlate<K extends keyof T>(key1: K, key2: K): number {
      const values1 = collection.items.map(item => Number(item[key1]))
      const values2 = collection.items.map(item => Number(item[key2]))
      const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length
      const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length
      const variance1 = values1.reduce((a, b) => a + (b - mean1) ** 2, 0)
      const variance2 = values2.reduce((a, b) => a + (b - mean2) ** 2, 0)
      const covariance = values1.reduce((a, i, idx) => a + (values1[idx] - mean1) * (values2[idx] - mean2), 0)
      return covariance / Math.sqrt(variance1 * variance2)
    },

    outliers<K extends keyof T>(key: K, threshold = 2): CollectionOperations<T> {
      const values = collection.items.map(item => Number(item[key]))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      return collect(collection.items.filter(item =>
        Math.abs((Number(item[key]) - mean) / std) > threshold,
      ))
    },

    // Type conversion
    cast<U>(constructor: new (...args: any[]) => U): CollectionOperations<U> {
      return collect(collection.items.map(item => new constructor(item)))
    },

    // Advanced statistical operations
    zscore<K extends keyof T>(key?: K): CollectionOperations<number> {
      if (key === undefined) {
        // Handle case where T is number and we're working directly with the values
        const values = this.items as number[]
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
        return collect(values.map(value => (value - mean) / std))
      }

      // Handle case where we're working with a key from an object
      const values = collection.items.map(item => Number(item[key]))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      return collect(values.map(value => (value - mean) / std))
    },

    kurtosis<K extends keyof T>(key?: K): number {
      let values: number[]

      if (key === undefined) {
        // Handle case where T is number
        values = this.items as number[]
      }
      else {
        // Handle case where we're working with a key from an object
        values = collection.items.map(item => Number(item[key]))
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      const m4 = values.reduce((a, b) => a + (b - mean) ** 4, 0) / values.length
      return m4 / (std ** 4) - 3
    },

    skewness<K extends keyof T>(key?: K): number {
      let values: number[]

      if (key === undefined) {
        // Handle case where T is number
        values = this.items as number[]
      }
      else {
        // Handle case where we're working with a key from an object
        values = collection.items.map(item => Number(item[key]))
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      const m3 = values.reduce((a, b) => a + (b - mean) ** 3, 0) / values.length
      return m3 / (std ** 3)
    },

    covariance<K extends keyof T>(key1: K, key2: K): number {
      const values1 = collection.items.map(item => Number(item[key1]))
      const values2 = collection.items.map(item => Number(item[key2]))
      const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length
      const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length
      return values1.reduce((a, _, i) => a + (values1[i] - mean1) * (values2[i] - mean2), 0) / values1.length
    },

    entropy<K extends keyof T>(key?: K): number {
      let values: any[]

      if (key === undefined) {
        // Handle case where T is number
        values = this.items as number[]
      }
      else {
        // Handle case where we're working with a key from an object
        values = collection.items.map(item => item[key])
      }

      const frequencies = new Map<any, number>()
      for (const value of values) {
        frequencies.set(value, (frequencies.get(value) || 0) + 1)
      }

      return -Array.from(frequencies.values())
        .map(freq => freq / values.length)
        .reduce((a, p) => a + p * Math.log2(p), 0)
    },

    // Advanced transformations
    mapOption<U>(callback: (item: T) => U | null | undefined): CollectionOperations<NonNullable<U>> {
      return collect(
        collection.items
          .map(callback)
          .filter((item): item is NonNullable<U> => item != null),
      )
    },

    zipWith<U, R>(other: CollectionOperations<U>, fn: (a: T, b: U) => R): CollectionOperations<R> {
      const length = Math.min(collection.length, other.count())
      const results: R[] = []
      for (let i = 0; i < length; i++) {
        results.push(fn(collection.items[i], other.toArray()[i]))
      }
      return collect(results)
    },

    scan<U>(callback: (acc: U, item: T) => U, initial: U): CollectionOperations<U> {
      const results: U[] = []
      let accumulator = initial
      for (const item of collection.items) {
        accumulator = callback(accumulator, item)
        results.push(accumulator)
      }
      return collect(results)
    },

    unfold<U>(fn: (seed: U) => [T, U] | null, initial: U): CollectionOperations<T> {
      const results: T[] = []
      let seed = initial
      let result = fn(seed)
      while (result !== null) {
        const [value, nextSeed] = result
        results.push(value)
        seed = nextSeed
        result = fn(seed)
      }
      return collect(results)
    },

    // Type conversions & casting
    /**
     * Cast collection items to a new type
     * @param type Constructor for the target type
     */
    as<U extends Record<string, any>>(type: new () => U): CollectionOperations<U> {
      return collect(
        collection.items.map((item) => {
          // eslint-disable-next-line new-cap
          const instance = new type()
          const targetKeys = Object.keys(instance) as Array<keyof U>
          const sourceItem = item as unknown as Record<string, unknown>

          targetKeys.forEach((key) => {
            if (key in sourceItem) {
              instance[key] = sourceItem[key as string] as U[keyof U]
            }
          })

          return instance
        }),
      )
    },

    pick<K extends keyof T>(...keys: K[]): CollectionOperations<Pick<T, K>> {
      return collect(collection.items.map((item) => {
        const result = {} as Pick<T, K>
        for (const key of keys) {
          result[key] = item[key]
        }
        return result
      }))
    },

    omit<K extends keyof T>(...keys: K[]): CollectionOperations<Omit<T, K>> {
      const keySet = new Set(keys)
      return collect(collection.items.map((item) => {
        const result = {} as Omit<T, K>
        for (const key of Object.keys(item as object) as Array<keyof T>) {
          if (!keySet.has(key as K)) {
            (result as any)[key] = item[key]
          }
        }
        return result
      }))
    },

    // Search operations
    search<K extends keyof T>(
      query: string,
      fields: K[],
      options: { fuzzy?: boolean, weights?: Partial<Record<K, number>> } = {},
    ): CollectionOperations<T & { score: number }> {
      const { fuzzy = false, weights = {} as Partial<Record<K, number>> } = options
      const normalizedQuery = query.toLowerCase()

      return collect(collection.items.map((item) => {
        let score = 0
        for (const field of fields) {
          const value = String(item[field]).toLowerCase()
          const weight = weights[field] || 1
          if (fuzzy) {
            score += calculateFuzzyScore(normalizedQuery, value) * weight
          }
          else {
            score += value.includes(normalizedQuery) ? weight : 0
          }
        }
        return { ...item, score }
      })).filter(item => item.score > 0).sort((a, b) => b.score - a.score)
    },

    // Advanced querying operations
    aggregate<K extends keyof T>(
      key: K,
      operations: Array<'sum' | 'avg' | 'min' | 'max' | 'count'>,
    ): Map<T[K], Record<string, number>> {
      const groups = this.groupBy(key)
      const result = new Map<T[K], Record<string, number>>()

      for (const [groupKey, group] of groups.entries()) {
        const stats: Record<string, number> = {}
        for (const op of operations) {
          switch (op) {
            case 'sum':
              stats.sum = group.sum()
              break
            case 'avg':
              stats.avg = group.avg()
              break
            case 'min':
              stats.min = Number(group.min())
              break
            case 'max':
              stats.max = Number(group.max())
              break
            case 'count':
              stats.count = group.count()
              break
          }
        }
        result.set(groupKey, stats)
      }
      return result
    },

    pivotTable<R extends keyof T, C extends keyof T, V extends keyof T>(
      rows: R,
      cols: C,
      values: V,
      aggregation: 'sum' | 'avg' | 'count',
    ): Map<T[R], Map<T[C], number>> {
      const result = new Map<T[R], Map<T[C], number>>()
      const uniqueRows = new Set(collection.items.map(item => item[rows]))
      const uniqueCols = new Set(collection.items.map(item => item[cols]))

      for (const row of uniqueRows) {
        const colMap = new Map<T[C], number>()
        for (const col of uniqueCols) {
          const filtered = this.filter(item => item[rows] === row && item[cols] === col)
          let value: number
          switch (aggregation) {
            case 'sum':
              value = filtered.sum(values)
              break
            case 'avg':
              value = filtered.avg(values)
              break
            case 'count':
              value = filtered.count()
              break
          }
          colMap.set(col, value)
        }
        result.set(row, colMap)
      }
      return result
    },

    // Serialization methods
    toSQL(table: string): string {
      if (collection.length === 0)
        return ''
      const columns = Object.keys(collection.items[0] as object)
      const values = collection.items.map(item =>
        `(${columns.map(col => JSON.stringify(item[col as keyof T])).join(', ')})`,
      ).join(',\n')
      return `INSERT INTO ${table} (${columns.join(', ')})\nVALUES\n${values};`
    },

    toGraphQL(typename: string): string {
      if (collection.length === 0) {
        return `query {\n  ${typename}s {\n    []\n  }\n}`
      }

      const fields = Object.keys(collection.items[0] as object)
      return `query {
  ${typename}s {
    nodes {
${collection.items.map(item =>
  `      ${typename} {\n${fields.map(field =>
    `        ${field}: ${JSON.stringify(item[field as keyof T])}`,
  ).join('\n')
  }\n      }`,
).join('\n')}
    }
  }
}`
    },

    toElastic(index: string): Record<string, any> {
      return {
        index,
        body: collection.items.flatMap(doc => [
          { index: { _index: index } },
          doc,
        ]),
      }
    },

    toPandas(): string {
      if (collection.length === 0)
        return 'pd.DataFrame()'
      const items = collection.items.map(item => JSON.stringify(item)).join(',\n  ')
      return `pd.DataFrame([\n  ${items}\n])`
    },

    // Developer experience methods
    playground(): void {
      // This would normally open an interactive playground
      // Since we can't actually open one, we'll log the data
      // eslint-disable-next-line no-console
      console.log('Collection Playground:', {
        items: collection.items,
        length: collection.length,
        operations: Object.keys(this),
      })
    },

    // Advanced mathematical operations
    fft(this: CollectionOperations<T>): T extends number ? CollectionOperations<[number, number]> : never {
      if (!collection.items.every(item => typeof item === 'number')) {
        throw new Error('FFT can only be performed on number collections')
      }

      function fft(x: number[]): [number, number][] {
        const N = x.length
        if (N <= 1)
          return [[x[0], 0]]

        const even = fft(x.filter((_, i) => i % 2 === 0))
        const odd = fft(x.filter((_, i) => i % 2 === 1))
        // eslint-disable-next-line unicorn/no-new-array
        const result: [number, number][] = new Array(N)

        for (let k = 0; k < N / 2; k++) {
          const angle = -2 * Math.PI * k / N
          const t = [
            Math.cos(angle) * odd[k][0] - Math.sin(angle) * odd[k][1],
            Math.sin(angle) * odd[k][0] + Math.cos(angle) * odd[k][1],
          ]
          result[k] = [
            even[k][0] + t[0],
            even[k][1] + t[1],
          ]
          result[k + N / 2] = [
            even[k][0] - t[0],
            even[k][1] - t[1],
          ]
        }
        return result
      }

      return collect(
        fft(collection.items as number[]),
      ) as T extends number ? CollectionOperations<[number, number]> : never
    },

    interpolate(this: CollectionOperations<number>, points: number): CollectionOperations<number> {
      if (points < 2)
        throw new Error('Points must be greater than 1')

      if (this.count() === 1) {
        // Single point case - repeat the value
        const value = Number(this.first())
        // eslint-disable-next-line unicorn/no-new-array
        return collect(new Array(points).fill(value))
      }

      const input = this.toArray() // No type assertion needed due to this: CollectionOperations<number>
      const result: number[] = []
      const step = (input.length - 1) / (points - 1)

      for (let i = 0; i < points; i++) {
        const x = i * step
        const x0 = Math.floor(x)
        const x1 = Math.min(Math.ceil(x), input.length - 1)
        const y0 = input[x0]
        const y1 = input[x1]
        result.push(y0 + (y1 - y0) * (x - x0))
      }

      return collect(result)
    },

    convolve(this: CollectionOperations<number>, kernel: number[]): CollectionOperations<number> {
      if (kernel.length === 0)
        throw new Error('Kernel must not be empty')
      if (this.count() === 0)
        throw new Error('Signal must not be empty')

      const signal = this.toArray()
      const n = signal.length
      const m = kernel.length
      const result: number[] = []

      // Output length will be n + m - 1
      for (let i = 0; i < n + m - 1; i++) {
        let sum = 0
        for (let j = Math.max(0, i - m + 1); j <= Math.min(n - 1, i); j++) {
          sum += signal[j] * kernel[i - j]
        }
        result.push(sum)
      }

      return collect(result)
    },

    differentiate(this: CollectionOperations<T>): CollectionOperations<number> {
      if (this.count() <= 1)
        return collect([] as number[])

      const values = this.toArray()
      return collect(
        values.slice(1).map((v, i) => Number(v) - Number(values[i])),
      )
    },

    integrate(this: CollectionOperations<number>): CollectionOperations<number> {
      const values = this.toArray()
      if (values.length === 0) {
        return collect([0] as number[])
      }

      const result: number[] = [0]
      let sum = 0

      for (const value of values) {
        sum += value
        result.push(sum)
      }

      return collect(result)
    },

    // Specialized data types support
    geoDistance<K extends keyof T>(key: K, point: [number, number], unit: 'km' | 'mi' = 'km'): CollectionOperations<T & { distance: number }> {
      function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        // Validate coordinates
        if (!validateCoordinates(lat1, lon1) || !validateCoordinates(lat2, lon2)) {
          throw new Error('Invalid coordinates')
        }

        const R = unit === 'km' ? 6371 : 3959 // Earth's radius in km or miles
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const lat1Rad = lat1 * Math.PI / 180
        const lat2Rad = lat2 * Math.PI / 180

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(lat1Rad) * Math.cos(lat2Rad)
          * Math.sin(dLon / 2) * Math.sin(dLon / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
      }

      return collect(collection.items.map((item) => {
        const coords = item[key] as unknown as [number, number]
        if (!coords || !Array.isArray(coords) || coords.length !== 2) {
          throw new Error('Invalid coordinates')
        }

        return {
          ...item,
          distance: haversine(coords[0], coords[1], point[0], point[1]),
        }
      }))
    },

    money<K extends keyof T>(
      key: K,
      currency: string = 'USD',
    ): CollectionOperations<T & { formatted: string }> {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      })

      return collect(collection.items.map(item => ({
        ...item,
        formatted: formatter.format(Number(item[key])),
      })))
    },

    dateTime<K extends keyof T>(
      key: K,
      format: string = 'en-US',
    ): CollectionOperations<T & { formatted: string }> {
      return collect(collection.items.map(item => ({
        ...item,
        formatted: new Date(item[key] as any).toLocaleString(format),
      })))
    },

    // Configuration method
    configure(options: {
      precision?: number
      timezone?: string
      locale?: string
      errorHandling?: 'strict' | 'loose'
    }): void {
      if (options.locale) {
        Intl.NumberFormat.prototype.format = new Intl.NumberFormat(options.locale).format
      }
      if (options.timezone) {
        Intl.DateTimeFormat.prototype.format = new Intl.DateTimeFormat(undefined, {
          timeZone: options.timezone,
        }).format
      }
    },

    trend(options: TimeSeriesOptions) {
      const series = this.timeSeries(options)
      const n = series.count()
      const x = Array.from({ length: n }, (_, i) => i)
      const y = series.pluck('value').toArray()

      // Calculate slope and intercept using least squares
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((a, b, i) => a + b * y[i], 0)
      const sumX2 = x.reduce((a, b) => a + b * b, 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      return { slope, intercept }
    },

    seasonality(options: TimeSeriesOptions) {
      const series = this.timeSeries(options)
      const result = new Map<string, number>()

      // Group by time period (e.g., month, day of week)
      const groups = series.groupBy((item: TimeSeriesPoint) => {
        const date = item.date
        switch (options.interval) {
          case 'month':
            return date.getMonth().toString()
          case 'week':
            return date.getDay().toString()
          default:
            return date.getDate().toString()
        }
      })

      // Calculate average for each period
      for (const [period, group] of groups) {
        result.set(String(period), group.avg('value'))
      }

      return result
    },

    forecast(periods: number): CollectionOperations<T> {
      const trend = this.trend({ dateField: '', valueField: '' })
      const lastItem = this.last()

      if (!lastItem) {
        return collect([] as T[])
      }

      // Create forecasted items with explicit typing
      const forecasted = Array.from({ length: periods }, (_, index): T => {
        const baseItem = { ...lastItem }
        // Calculate the forecasted value using the trend
        const forecastedValue = trend.slope * (this.count() + index) + trend.intercept

        // If T potentially has a 'value' property, we need to be careful about the typing
        // We'll cast to any temporarily to avoid TypeScript errors when setting the value
        const itemWithForecast = baseItem as any
        if (typeof itemWithForecast.value !== 'undefined') {
          itemWithForecast.value = forecastedValue
        }

        return itemWithForecast as T
      })

      return collect(forecasted) as CollectionOperations<T>
    },

    async assertValid(schema: ValidationSchema<T>): Promise<void> {
      const result = await this.validate(schema)
      if (!result.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(Array.from(result.errors.entries()))}`)
      }
    },

    sanitize(rules: Record<keyof T, (value: any) => any>): CollectionOperations<T> {
      return this.map((item) => {
        const sanitized = { ...item } as T
        for (const [key, sanitizer] of Object.entries(rules) as [keyof T, (value: any) => any][]) {
          sanitized[key] = sanitizer(item[key])
        }
        return sanitized
      })
    },

    // This is a basic implementation, updates may come in the future
    query(sql: string, params: any[] = []): CollectionOperations<T> {
      const lowerSQL = sql.toLowerCase()
      // eslint-disable-next-line ts/no-this-alias
      let result = this

      if (lowerSQL.includes('where')) {
        const whereClause = sql.split('where')[1].trim()
        let paramIndex = 0

        result = this.filter((item) => {
          // Replace both named parameters ${name} and positional parameters ?
          const parsedClause = whereClause
            // Handle ${property} style parameters
            .replace(/\$\{(\w+)\}/g, (_, key) => {
              return JSON.stringify(item[key as keyof T])
            })
            // Handle ? style parameters
            .replace(/\?/g, () => {
              const param = params[paramIndex]
              paramIndex++
              return JSON.stringify(param)
            })

          // eslint-disable-next-line no-eval
          return eval(parsedClause)
        })
      }

      return result
    },

    having<K extends keyof T>(key: K, op: string, value: any): CollectionOperations<T> {
      const ops: Record<string, (a: any, b: any) => boolean> = {
        '>': (a, b) => a > b,
        '<': (a, b) => a < b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
        '=': (a, b) => a === b,
        '!=': (a, b) => a !== b,
      }

      return this.filter(item => ops[op](item[key], value))
    },

    crossJoin<U>(other: CollectionOperations<U>): CollectionOperations<T & U> {
      const result: Array<T & U> = []
      for (const item1 of this.items) {
        for (const item2 of other.items) {
          result.push({ ...item1, ...item2 })
        }
      }
      return collect(result)
    },

    leftJoin<U, K extends keyof T, O extends keyof U>(
      other: CollectionOperations<U>,
      key: K,
      otherKey: O,
      // Add type constraint to ensure the key types match
    ): CollectionOperations<T & Partial<U>> {
      type KeyType = T[K] & U[O]
      return this.map((item) => {
        const match = other.items.find((otherItem) => {
          const itemValue = item[key] as KeyType
          const otherValue = otherItem[otherKey] as KeyType
          return itemValue === otherValue
        })
        return { ...item, ...(match || {}) }
      })
    },

    batch(size: number): AsyncGenerator<CollectionOperations<T>, void, unknown> {
      return this.cursor(size)
    },

    toJSON(options: SerializationOptions = {}): string {
      const { pretty = false, exclude = [], include } = options
      const items = this.items.map((item) => {
        const result: any = {}
        const keys = include || Object.keys(item as object)
        for (const key of keys) {
          if (!exclude.includes(key)) {
            result[key] = (item as any)[key]
          }
        }
        return result
      })
      return JSON.stringify(items, null, pretty ? 2 : undefined)
    },

    toCsv(options: SerializationOptions = {}): string {
      const { exclude = [], include } = options
      const items = this.toArray()
      if (items.length === 0)
        return ''

      const keys = include || Object.keys(items[0] as object)
      const headers = keys.filter(k => !exclude.includes(k))
      const rows = items.map(item =>
        headers.map(key =>
          JSON.stringify((item as any)[key])).join(','),
      )

      return [headers.join(','), ...rows].join('\n')
    },

    toXml(options: SerializationOptions = {}): string {
      const { exclude = [], include } = options
      const items = this.toArray()
      const rootTag = 'items'
      const itemTag = 'item'

      function escapeXml(str: string): string {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      }

      const itemsXml = items.map((item) => {
        const keys = include || Object.keys(item as object)
        const fields = keys
          .filter(k => !exclude.includes(k))
          .map(key => `  <${key}>${escapeXml(String((item as any)[key]))}</${key}>`)
          .join('\n')
        return `<${itemTag}>\n${fields}\n</${itemTag}>`
      }).join('\n')

      return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${itemsXml}\n</${rootTag}>`
    },

    parse(data: string, format: 'json' | 'csv' | 'xml'): CollectionOperations<T> {
      switch (format) {
        case 'json':
          return collect(JSON.parse(data))
        case 'csv': {
          const lines = data.trim().split('\n')
          const headers = lines[0].split(',')
          const items = lines.slice(1).map((line) => {
            const values = line.split(',')
            const item: any = {}
            headers.forEach((header, i) => {
              item[header] = values[i]
            })
            return item
          })
          return collect(items)
        }
        case 'xml':
          throw new Error('XML parsing not implemented')
        default:
          throw new Error(`Unsupported format: ${format}`)
      }
    },

    cache(ttl: number = 60000): CollectionOperations<T> {
      const cacheStore = new Map<string, CacheEntry<any>>()
      const cacheKey = JSON.stringify(this.items)
      const now = Date.now()

      // Check if we have a valid cache entry
      const cached = cacheStore.get(cacheKey) as CacheEntry<T> | undefined
      if (cached && cached.expiry > now) {
        return collect(cached.data)
      }

      // Store current items in cache with expiry
      cacheStore.set(cacheKey, {
        data: [...this.items],
        expiry: now + ttl,
      })

      return this
    },

    memoize<K extends keyof T>(key: K): CollectionOperations<T> {
      const cache = new Map<T[K], T>()
      const items = this.items.map((item) => {
        const k = item[key]
        if (!cache.has(k)) {
          cache.set(k, item)
        }
        return cache.get(k) as T
      })

      return collect(items)
    },

    async prefetch(): Promise<CollectionOperations<Awaited<T>>> {
      const results = await Promise.all(
        this.items.map(async (item) => {
          if (item instanceof Promise) {
            return await item
          }
          return await Promise.resolve(item)
        }),
      )

      return collect(results) as CollectionOperations<Awaited<T>>
    },

    sentiment(this: CollectionOperations<string>): CollectionOperations<{ score: number, comparative: number }> {
      // Basic sentiment analysis using a simple positive/negative word approach
      const positiveWords = new Set(['good', 'great', 'awesome', 'excellent', 'happy', 'love'])
      const negativeWords = new Set(['bad', 'terrible', 'awful', 'horrible', 'sad', 'hate'])

      // Group intensifiers/similar words that should count as one
      const wordGroups = [
        new Set(['great', 'awesome']), // These should count as one positive score
      ]

      return this.map((text) => {
        // Clean and split words, removing punctuation
        const words = text.toLowerCase()
          .replace(/[.,!?]*/g, '')
          .split(/\s+/)
          .filter(word => word.length > 0)

        let score = 0
        const usedGroups = new Set<number>()

        words.forEach((word) => {
          // Check individual words
          if (positiveWords.has(word)) {
            // Before incrementing score, check if this word is part of a group
            // that's already been counted
            let isInUsedGroup = false
            wordGroups.forEach((group, index) => {
              if (group.has(word) && usedGroups.has(index)) {
                isInUsedGroup = true
              }
            })

            if (!isInUsedGroup) {
              score++
              // If this word is part of a group, mark the group as used
              wordGroups.forEach((group, index) => {
                if (group.has(word)) {
                  usedGroups.add(index)
                }
              })
            }
          }
          if (negativeWords.has(word)) {
            score--
          }
        })

        return {
          score,
          comparative: score / words.length,
        }
      })
    },

    wordFrequency(this: CollectionOperations<string>): Map<string, number> {
      const frequency = new Map<string, number>()
      this.items.forEach((text) => {
        const words = text.toLowerCase().split(/\s+/)
        words.forEach((word) => {
          frequency.set(word, (frequency.get(word) || 0) + 1)
        })
      })
      return frequency
    },

    ngrams(this: CollectionOperations<string>, n: number): CollectionOperations<string> {
      return collect(
        this.items.flatMap((text) => {
          const words = text.split(/\s+/)
          const ngrams: string[] = []
          for (let i = 0; i <= words.length - n; i++) {
            ngrams.push(words.slice(i, i + n).join(' '))
          }
          return ngrams
        }),
      )
    },

    instrument(callback: (stats: Map<string, number>) => void): CollectionOperations<T> {
      const stats = new Map<string, number>()
      stats.set('count', this.count())
      stats.set('operations', 0)
      stats.set('timeStart', Date.now())

      const proxy = new Proxy(this, {
        get(target: any, prop: string) {
          if (typeof target[prop] === 'function') {
            stats.set('operations', (stats.get('operations') || 0) + 1)
          }
          return target[prop]
        },
      })

      callback(stats)
      return proxy as CollectionOperations<T>
    },

    optimize(): CollectionOperations<T> {
      // Cache results if collection is accessed multiple times
      const cached = this.cache()

      // Index frequently accessed fields
      if (this.count() > 1000) {
        const firstItem = this.first()
        if (firstItem) {
          const keys = Object.keys(firstItem) as Array<keyof T>
          cached.index(keys)
        }
      }

      return cached
    },

    removeOutliers<K extends keyof T>(key: K, threshold = 2): CollectionOperations<T> {
      const values = this.pluck(key).toArray()
      const mean = values.reduce((a, b) => Number(a) + Number(b), 0) / values.length
      const stdDev = Math.sqrt(
        values.reduce((a, b) => a + (Number(b) - mean) ** 2, 0) / values.length,
      )

      return this.filter((item) => {
        const value = Number(item[key])
        return Math.abs((value - mean) / stdDev) <= threshold
      })
    },

    impute<K extends keyof T>(key: K, strategy: 'mean' | 'median' | 'mode'): CollectionOperations<T> {
      const values = this.pluck(key).toArray()
      let replacementValue: T[K]

      switch (strategy) {
        case 'mean': {
          const sum = values.reduce((a, b) => Number(a) + Number(b), 0)
          replacementValue = (sum / values.length) as T[K]
          break
        }
        case 'median': {
          const sorted = [...values].sort((a, b) => Number(a) - Number(b))
          const mid = Math.floor(sorted.length / 2)
          replacementValue = sorted[mid]
          break
        }
        case 'mode': {
          const frequency = new Map<T[K], number>()
          let maxFreq = 0
          let mode = values[0]

          for (const value of values) {
            const count = (frequency.get(value) || 0) + 1
            frequency.set(value, count)
            if (count > maxFreq) {
              maxFreq = count
              mode = value
            }
          }
          replacementValue = mode
          break
        }
      }

      return this.map(item => ({
        ...item,
        [key]: item[key] ?? replacementValue,
      })) as CollectionOperations<T>
    },

    normalize<K extends keyof T>(
      key: K,
      method: 'minmax' | 'zscore',
    ): CollectionOperations<T> {
      const values = this.pluck(key).toArray().map(Number)

      if (method === 'minmax') {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min

        return this.map(item => ({
          ...item,
          [key]: range !== 0 ? (Number(item[key]) - min) / range : 0,
        })) as CollectionOperations<T>
      }

      // z-score normalization
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const stdDev = Math.sqrt(
        values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
      )

      return this.map(item => ({
        ...item,
        [key]: stdDev !== 0 ? (Number(item[key]) - mean) / stdDev : 0,
      })) as CollectionOperations<T>
    },

    knn<K extends keyof T>(
      point: Pick<T, K>,
      k: number,
      features: K[],
    ): CollectionOperations<T> {
      // Calculate Euclidean distance
      function distance(a: Pick<T, K>, b: Pick<T, K>): number {
        return Math.sqrt(
          features.reduce((sum, feature) => {
            const diff = Number(a[feature]) - Number(b[feature])
            return sum + diff * diff
          }, 0),
        )
      }

      // Get k nearest neighbors
      const neighbors = this.items
        .map(item => ({
          item,
          distance: distance(point, item as Pick<T, K>),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, k)
        .map(n => n.item)

      return collect(neighbors)
    },

    naiveBayes<K extends keyof T>(
      features: K[],
      label: K,
    ): (item: Pick<T, K>) => T[K] {
      // Calculate prior probabilities and feature probabilities
      const classes = new Set(this.pluck(label).toArray())
      const priors = new Map<T[K], number>()
      const conditionals = new Map<T[K], Map<K, Map<T[K], number>>>()

      for (const cls of classes) {
        const classItems = this.where(label, cls)
        priors.set(cls, classItems.count() / this.count())

        conditionals.set(cls, new Map())
        for (const feature of features) {
          const featureProbs = new Map<T[K], number>()
          const featureValues = new Set(classItems.pluck(feature).toArray())

          for (const value of featureValues) {
            const count = classItems.where(feature, value).count()
            featureProbs.set(value, count / classItems.count())
          }

          conditionals.get(cls)!.set(feature, featureProbs)
        }
      }

      // Return classifier function
      return (item: Pick<T, K>): T[K] => {
        let maxProb = -Infinity
        let predicted: T[K] = Array.from(classes)[0]

        for (const cls of classes) {
          let prob = Math.log(priors.get(cls) || 0)

          for (const feature of features) {
            const value = item[feature]
            const featureProb = conditionals.get(cls)?.get(feature)?.get(value) || 0.0001 // Laplace smoothing
            prob += Math.log(featureProb)
          }

          if (prob > maxProb) {
            maxProb = prob
            predicted = cls
          }
        }

        return predicted
      }
    },

    detectAnomalies(options: AnomalyDetectionOptions<T>): CollectionOperations<T> {
      const { method = 'zscore', threshold = 2, features = [] } = options

      switch (method) {
        case 'zscore': {
          const featureKeys = features.length > 0
            ? features
            : (Object.keys(this.first() || {}) as Array<keyof T>)

          return this.filter((item) => {
            for (const key of featureKeys) {
              const values = this.pluck(key).toArray().map(Number)
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              const std = Math.sqrt(
                values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
              )

              const zscore = Math.abs((Number(item[key]) - mean) / std)
              if (zscore > threshold)
                return true
            }
            return false
          })
        }

        case 'iqr': {
          const featureKeys = features.length > 0
            ? features
            : (Object.keys(this.first() || {}) as Array<keyof T>)

          return this.filter((item) => {
            for (const key of featureKeys) {
              const values = this.pluck(key).toArray().map(Number).sort((a, b) => a - b)
              const q1 = values[Math.floor(values.length * 0.25)]
              const q3 = values[Math.floor(values.length * 0.75)]
              const iqr = q3 - q1

              const value = Number(item[key])
              if (value < q1 - threshold * iqr || value > q3 + threshold * iqr) {
                return true
              }
            }
            return false
          })
        }

        case 'isolationForest': {
          const maxSamples = Math.min(256, this.count())
          const maxDepth = Math.ceil(Math.log2(maxSamples))

          function randomSplit<K extends keyof T>(items: T[], feature: K, depth: number): number {
            if (depth >= maxDepth || items.length <= 1)
              return depth

            const values = items.map(item => Number(item[feature]))
            const min = Math.min(...values)
            const max = Math.max(...values)
            const splitValue = min + Math.random() * (max - min)

            const left = items.filter(item => Number(item[feature]) < splitValue)
            const right = items.filter(item => Number(item[feature]) >= splitValue)

            return Math.max(
              randomSplit(left, feature, depth + 1),
              randomSplit(right, feature, depth + 1),
            )
          }

          const featureKeys = features.length > 0
            ? features
            : (Object.keys(this.first() || {}) as Array<keyof T>)

          return this.filter((item) => {
            const score = featureKeys.reduce((acc, feature) => {
              // Now feature is properly typed as keyof T
              const depth = randomSplit([item], feature, 0)
              return acc + depth
            }, 0) / featureKeys.length

            return score < threshold
          })
        }
      }
    },
  }
}

function createKMeansResult<T>(collection: CollectionOperations<ClusterResult<T>>): KMeansResult<T> {
  const originalPluck = collection.pluck.bind(collection)

  const result = collection as KMeansResult<T>

  function pluckImpl(key: 'cluster'): PluckedCluster
  function pluckImpl(key: 'data'): PluckedData<T>
  function pluckImpl<K extends keyof ClusterResult<T>>(key: K): CollectionOperations<ClusterResult<T>[K]>
  function pluckImpl(key: keyof ClusterResult<T>): any {
    const plucked = originalPluck(key)

    if (key === 'cluster') {
      const clusterPlucked = plucked as CollectionOperations<number>
      return {
        values: () => clusterPlucked.toArray(),
        toArray: () => clusterPlucked.toArray(),
        *[Symbol.iterator]() {
          yield * clusterPlucked.toArray()
        },
      } as PluckedCluster
    }

    if (key === 'data') {
      const dataPlucked = plucked as CollectionOperations<T>
      return {
        values: () => dataPlucked.toArray(),
        toArray: () => dataPlucked.toArray(),
        forEach: (callback: (item: T) => void) => {
          dataPlucked.toArray().forEach(callback)
        },
        avg: (field: keyof T) => {
          const values = dataPlucked.toArray()
            .map(item => Number(item[field]))
            .filter(val => !Number.isNaN(val))
          return values.reduce((sum, val) => sum + val, 0) / values.length
        },
        filter: (predicate: (item: T) => boolean) => {
          const filtered = dataPlucked.toArray().filter(predicate)
          return createPluckedData(collect(filtered))
        },
      } as PluckedData<T>
    }

    return plucked
  }

  result.pluck = pluckImpl
  return result
}

function createPluckedData<T>(collection: CollectionOperations<T>): PluckedData<T> {
  return {
    values: () => collection.toArray(),
    toArray: () => collection.toArray(),
    forEach: (callback: (item: T) => void) => {
      collection.toArray().forEach(callback)
    },
    avg: (field: keyof T) => {
      const values = collection.toArray()
        .map(item => Number(item[field]))
        .filter(val => !Number.isNaN(val))
      return values.reduce((sum, val) => sum + val, 0) / values.length
    },
    filter: (predicate: (item: T) => boolean) => {
      const filtered = collection.toArray().filter(predicate)
      return createPluckedData(collect(filtered))
    },
  }
}
