import type { AnomalyDetectionOptions, AsyncCallback, Collection, CollectionMetrics, CollectionOperations, CompareFunction, ConditionalCallback, KeySelector, KMeansOptions, LazyCollectionOperations, MovingAverageOptions, PaginationResult, RegressionResult, SerializationOptions, StandardDeviationResult, TimeSeriesOptions, TimeSeriesPoint, ValidationResult, ValidationRule, ValidationSchema, VersionInfo, VersionStore } from './types'
import process from 'node:process'
import { createLazyOperations } from './lazy'
import { getNextTimestamp, isSameDay } from './utils'

export interface CacheEntry<T> {
  data: T[]
  expiry: number
}

// Add this at class/module level
const cacheStore = new Map<string, CacheEntry<any>>()

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
  const versionStore: VersionStore<T> = {
    currentVersion: 0,
    snapshots: new Map(),
    changes: [],
  }

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

    setDiff(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherSet = new Set(Array.isArray(other) ? other : other.items)
      return collect(collection.items.filter(item => !otherSet.has(item)))
    },

    diff(version1: number, version2: number): CollectionOperations<VersionInfo<T>> {
      // Ensure both versions exist
      if (!versionStore.snapshots.has(version1) || !versionStore.snapshots.has(version2)) {
        throw new Error('One or both versions do not exist')
      }

      // Get snapshots for both versions
      const snapshot1 = versionStore.snapshots.get(version1)!
      const snapshot2 = versionStore.snapshots.get(version2)!

      // Initialize changes array
      const changes: VersionInfo<T>['changes'] = []

      // Find added items (present in version2 but not in version1)
      const addedItems = snapshot2.items.filter(item2 =>
        !snapshot1.items.some(item1 =>
          JSON.stringify(item1) === JSON.stringify(item2)
        )
      )

      // Find removed items (present in version1 but not in version2)
      const removedItems = snapshot1.items.filter(item1 =>
        !snapshot2.items.some(item2 =>
          JSON.stringify(item1) === JSON.stringify(item2)
        )
      )

      // Find updated items (have the same keys but different values)
      const updatedItems = snapshot2.items.filter(item2 =>
        snapshot1.items.some(item1 => {
          // Properly type cast the objects for Object.keys
          const item1Obj = item1 as Record<string, unknown>
          const item2Obj = item2 as Record<string, unknown>

          const item1Keys = Object.keys(item1Obj)
          const item2Keys = Object.keys(item2Obj)

          // Check if items have the same keys
          const sameKeys = item1Keys.length === item2Keys.length &&
            item1Keys.every(key => item2Keys.includes(key))

          // Check if any values are different
          const hasChanges = sameKeys && item1Keys.some(key =>
            JSON.stringify(item1Obj[key]) !== JSON.stringify(item2Obj[key])
          )

          return sameKeys && hasChanges
        })
      )

      // Record all changes with their types
      addedItems.forEach(item => {
        changes.push({
          type: 'add',
          item
        })
      })

      removedItems.forEach(item => {
        changes.push({
          type: 'delete',
          item
        })
      })

      updatedItems.forEach(item => {
        // Find the previous version of this item
        const itemObj = item as Record<string, unknown>
        const previousItem = snapshot1.items.find(item1 => {
          const item1Obj = item1 as Record<string, unknown>
          return Object.keys(item1Obj).every(key =>
            Object.keys(itemObj).includes(key)
          )
        })

        changes.push({
          type: 'update',
          item,
          previousItem
        })
      })

      // Create a VersionInfo object with the changes
      const versionInfo: VersionInfo<T>[] = [{
        version: Math.max(version1, version2),
        timestamp: new Date(),
        changes
      }]

      return collect(versionInfo)
    },

    diffSummary(version1: number, version2: number) {
      const diffResult = this.diff(version1, version2)
      // Properly type the first() result and access to changes
      const versionInfo = diffResult.first() as VersionInfo<T> | undefined
      const changes = versionInfo?.changes || []

      return {
        added: changes.filter((c: { type: 'add' | 'update' | 'delete' }) => c.type === 'add').length,
        removed: changes.filter((c: { type: 'add' | 'update' | 'delete' }) => c.type === 'delete').length,
        updated: changes.filter((c: { type: 'add' | 'update' | 'delete' }) => c.type === 'update').length,
        changes: changes.map((change: {
          type: 'add' | 'update' | 'delete'
          item: T
          previousItem?: T
        }) => {
          if (change.type === 'update' && change.previousItem) {
            // Properly type cast the objects for Object.keys
            const itemObj = change.item as Record<string, unknown>
            const prevItemObj = change.previousItem as Record<string, unknown>

            const changedFields = Object.keys(itemObj).filter((key) => {
              return JSON.stringify(itemObj[key]) !== JSON.stringify(prevItemObj[key])
            })

            return changedFields.map(field => ({
              type: change.type,
              field: field as keyof T,
              oldValue: change.previousItem![field as keyof T],
              newValue: change.item[field as keyof T],
            }))
          }
          return [{
            type: change.type,
          }]
        }).flat(),
      }
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
      const offset = (page - 1) * perPage
      return collect(collection.items.slice(offset, offset + perPage))
    },

    async *cursor(size: number): AsyncGenerator<CollectionOperations<T>, void, unknown> {
      let offset = 0
      while (offset < collection.length) {
        yield collect(collection.items.slice(offset, offset + size))
        offset += size
      }
    },

    symmetricDiff(other: T[] | CollectionOperations<T>): CollectionOperations<T> {
      const otherSet = new Set(Array.isArray(other) ? other : other.items)
      const result: T[] = []

      // Items in this collection but not in other
      for (const item of collection.items) {
        if (!otherSet.has(item)) {
          result.push(item)
        }
      }

      // Items in other but not in this collection
      const thisSet = new Set(collection.items)
      for (const item of otherSet) {
        if (!thisSet.has(item)) {
          result.push(item)
        }
      }

      return collect(result)
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
      })

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

    movingAverage({ window, centered = false }: MovingAverageOptions) {
      if (window < 1 || window > collection.length) {
        throw new Error('Invalid window size')
      }

      const values = collection.items.map(item => Number(item))
      const result: number[] = []
      const offset = centered ? Math.floor(window / 2) : 0

      for (let i = 0; i <= values.length - window; i++) {
        const sum = values.slice(i, i + window).reduce((a, b) => a + b, 0)
        result[i + offset] = sum / window
      }

      return collect(result)
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

    kmeans({ k, maxIterations = 100, distanceMetric = 'euclidean' }: KMeansOptions): CollectionOperations<{ cluster: number, data: T }> {
      // Simple k-means implementation for numeric data
      const data = collection.items.map(item =>
        Object.values(item as object).filter(v => typeof v === 'number'),
      ) as number[][]

      // Initialize centroids randomly
      let centroids = data
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, k)

      let iterations = 0
      let previousCentroids: number[][] = []

      while (iterations < maxIterations) {
        // Assign points to clusters
        const clusters = data.map((point) => {
          const distances = centroids.map(centroid =>
            distanceMetric === 'euclidean'
              ? Math.sqrt(
                point.reduce(
                  (sum, dim, i) => sum + (dim - centroid[i]) ** 2,
                  0,
                ),
              )
              : distanceMetric === 'manhattan'
                ? point.reduce(
                  (sum, dim, i) => sum + Math.abs(dim - centroid[i]),
                  0,
                )
                : 0, // cosine similarity would go here
          )
          return distances.indexOf(Math.min(...distances))
        })

        // Store previous centroids
        previousCentroids = centroids

        // Calculate new centroids
        // eslint-disable-next-line unicorn/no-new-array
        centroids = new Array(k)
          .fill(0)
          .map((_, i) => {
            const clusterPoints = data.filter((_, index) => clusters[index] === i)
            return clusterPoints[0].map((_, dim) =>
              clusterPoints.reduce((sum, point) => sum + point[dim], 0)
              / clusterPoints.length,
            )
          })

        // Check convergence
        const centroidsDiff = centroids.reduce(
          (sum, centroid, i) =>
            sum
            + centroid.reduce(
              (s, dim, j) => s + Math.abs(dim - previousCentroids[i][j]),
              0,
            ),
          0,
        )

        if (centroidsDiff < 1e-6)
          break
        iterations++
      }

      // Return original items with cluster assignments
      return collect(
        collection.items.map((item) => {
          const point = Object.values(item as object).filter(
            v => typeof v === 'number',
          ) as number[]

          // Find the nearest centroid by comparing distances
          let minDistance = Infinity
          let nearestCluster = 0

          centroids.forEach((centroid, index) => {
            const distance = distanceMetric === 'euclidean'
              ? Math.sqrt(
                point.reduce(
                  (sum, dim, i) => sum + (dim - centroid[i]) ** 2,
                  0,
                ),
              )
              : distanceMetric === 'manhattan'
                ? point.reduce(
                  (sum, dim, i) => sum + Math.abs(dim - centroid[i]),
                  0,
                )
                : 0

            if (distance < minDistance) {
              minDistance = distance
              nearestCluster = index
            }
          })

          return {
            cluster: nearestCluster,
            data: item,
          }
        }),
      )
    },

    async parallel<U>(
      callback: (chunk: CollectionOperations<T>) => Promise<U>,
      options: { chunks?: number, maxConcurrency?: number } = {},
    ): Promise<CollectionOperations<U>> {
      const { chunks = navigator.hardwareConcurrency || 4, maxConcurrency = chunks } = options
      const chunkSize = Math.ceil(collection.length / chunks)
      const batches = this.chunk(chunkSize)

      const results: U[] = []
      const runningTasks: Promise<void>[] = []

      for (const batch of batches.items) {
        if (runningTasks.length >= maxConcurrency) {
          await Promise.race(runningTasks)
        }

        const task = callback(collect(batch)).then((result) => {
          results.push(result)
          runningTasks.splice(runningTasks.indexOf(task), 1)
        })

        runningTasks.push(task)
      }

      await Promise.all(runningTasks)
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

    mapToGroups<K extends keyof T, V>(callback: (item: T) => [K, V]): Map<K, CollectionOperations<V>> {
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
    zscore<K extends keyof T>(key: K): CollectionOperations<number> {
      const values = collection.items.map(item => Number(item[key]))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      return collect(values.map(value => (value - mean) / std))
    },

    kurtosis<K extends keyof T>(key: K): number {
      const values = collection.items.map(item => Number(item[key]))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      const m4 = values.reduce((a, b) => a + (b - mean) ** 4, 0) / values.length
      return m4 / (std ** 4) - 3
    },

    skewness<K extends keyof T>(key: K): number {
      const values = collection.items.map(item => Number(item[key]))
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

    entropy<K extends keyof T>(key: K): number {
      const values = collection.items.map(item => item[key])
      const frequencies = new Map<T[K], number>()
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
    fft(
      this: CollectionOperations<T>,
    ): T extends number ? CollectionOperations<[number, number]> : never {
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

    interpolate(
      this: CollectionOperations<T>,
      points: number,
    ): T extends number ? CollectionOperations<number> : never {
      if (!collection.items.every(item => typeof item === 'number')) {
        throw new Error('Interpolation can only be performed on number collections')
      }

      const input = collection.items as number[]
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

      return collect(result) as T extends number ? CollectionOperations<number> : never
    },

    convolve(
      this: CollectionOperations<T>,
      kernel: number[],
    ): T extends number ? CollectionOperations<number> : never {
      if (!collection.items.every(item => typeof item === 'number')) {
        throw new Error('Convolution can only be performed on number collections')
      }

      const signal = collection.items as number[]
      const result: number[] = []
      const kernelCenter = Math.floor(kernel.length / 2)

      for (let i = 0; i < signal.length; i++) {
        let sum = 0
        for (let j = 0; j < kernel.length; j++) {
          const signalIdx = i - kernelCenter + j
          if (signalIdx >= 0 && signalIdx < signal.length) {
            sum += signal[signalIdx] * kernel[j]
          }
        }
        result.push(sum)
      }

      return collect(result) as T extends number ? CollectionOperations<number> : never
    },

    differentiate(
      this: CollectionOperations<T>,
    ): T extends number ? CollectionOperations<number> : never {
      if (!collection.items.every(item => typeof item === 'number')) {
        throw new Error('Differentiation can only be performed on number collections')
      }

      const items = collection.items as number[]
      return collect(
        items.slice(1).map((v, i) => v - items[i]),
      ) as T extends number ? CollectionOperations<number> : never
    },

    integrate(
      this: CollectionOperations<T>,
    ): T extends number ? CollectionOperations<number> : never {
      if (!collection.items.every(item => typeof item === 'number')) {
        throw new Error('Integration can only be performed on number collections')
      }

      const items = collection.items as number[]
      const result: number[] = [0]
      for (let i = 0; i < items.length; i++) {
        result.push(result[i] + items[i])
      }

      return collect(result) as T extends number ? CollectionOperations<number> : never
    },

    // Specialized data types support
    geoDistance<K extends keyof T>(
      key: K,
      point: [number, number],
      unit: 'km' | 'mi' = 'km',
    ): CollectionOperations<T & { distance: number }> {
      function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = unit === 'km' ? 6371 : 3959 // Earth's radius in km or miles
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
      }

      return collect(collection.items.map((item) => {
        const coords = item[key] as unknown as [number, number]
        return {
          ...item,
          distance: haversine(point[0], point[1], coords[0], coords[1]),
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

    async prefetch(): Promise<CollectionOperations<T>> {
      // Force evaluation of any lazy operations
      await Promise.resolve()
      return this
    },

    sentiment(this: CollectionOperations<string>): CollectionOperations<{ score: number, comparative: number }> {
      // Basic sentiment analysis using a simple positive/negative word approach
      const positiveWords = new Set(['good', 'great', 'awesome', 'excellent', 'happy', 'love'])
      const negativeWords = new Set(['bad', 'terrible', 'awful', 'horrible', 'sad', 'hate'])

      return this.map((text) => {
        const words = text.toLowerCase().split(/\s+/)
        let score = 0
        words.forEach((word) => {
          if (positiveWords.has(word))
            score++
          if (negativeWords.has(word))
            score--
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

    // Add these methods to your createCollectionOperations return object

    linearRegression<K extends keyof T>(
      dependent: K,
      independents: K[],
    ): RegressionResult {
      const X = this.items.map(item =>
        [1, ...independents.map(ind => Number(item[ind]))],
      )
      const y = this.items.map(item => Number(item[dependent]))
      const n = X.length

      // Calculate coefficients using normal equation: β = (X'X)^-1 X'y
      const XT = X[0].map((_, i) => X.map(row => row[i])) // transpose
      const XTX = XT.map(row =>
        X[0].map((_, j) =>
          row.reduce((sum, val, k) => sum + val * X[k][j], 0),
        ),
      )

      // Matrix inverse using determinant (simplified for demo)
      const det = XTX[0][0] * XTX[1][1] - XTX[0][1] * XTX[1][0]
      const XTXinv = [
        [XTX[1][1] / det, -XTX[0][1] / det],
        [-XTX[1][0] / det, XTX[0][0] / det],
      ]

      const XTy = XT.map(row =>
        row.reduce((sum, val, i) => sum + val * y[i], 0),
      )

      const coefficients = XTXinv.map(row =>
        row.reduce((sum, val, i) => sum + val * XTy[i], 0),
      )

      // Calculate predictions and residuals
      const predictions = X.map(row =>
        row.reduce((sum, val, i) => sum + val * coefficients[i], 0),
      )

      const residuals = y.map((actual, i) => actual - predictions[i])

      // Calculate R-squared
      const yMean = y.reduce((a, b) => a + b, 0) / n
      const totalSS = y.reduce((ss, val) => ss + (val - yMean) ** 2, 0)
      const residualSS = residuals.reduce((ss, val) => ss + val ** 2, 0)
      const rSquared = 1 - (residualSS / totalSS)

      return {
        coefficients,
        rSquared,
        predictions,
        residuals,
      }
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
