import process from 'node:process'

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
 * Types for pagination
 */
interface PaginationResult<T> {
  data: CollectionOperations<T>
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  hasMorePages: boolean
}

/**
 * Types for mathematical operations
 */
interface StandardDeviationResult {
  population: number
  sample: number
}

/**
 * Types for async operations
 */
type AsyncCallback<T, U> = (item: T, index: number) => Promise<U>

/**
 * Represents a collection of items with type safety and chainable methods
 */
interface Collection<T> {
  readonly items: T[]
  readonly length: number
}

/**
 * Types for time series operations
 */
interface TimeSeriesOptions {
  dateField: string
  valueField: string
  interval?: 'day' | 'week' | 'month' | 'year'
  fillGaps?: boolean
}

interface TimeSeriesPoint {
  date: Date
  value: number
}

interface MovingAverageOptions {
  window: number
  centered?: boolean
}

/**
 * Types for validation
 */
type ValidationRule<T> = (value: T) => boolean | Promise<boolean>

type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

interface ValidationResult {
  isValid: boolean
  errors: Map<string, string[]>
}

/**
 * Types for serialization
 */
interface SerializationOptions {
  pretty?: boolean
  exclude?: string[]
  include?: string[]
  transform?: Record<string, (value: any) => any>
}

/**
 * Types for machine learning operations
 */
interface KMeansOptions {
  k: number
  maxIterations?: number
  distanceMetric?: 'euclidean' | 'manhattan' | 'cosine'
}

interface RegressionResult {
  coefficients: number[]
  rSquared: number
  predictions: number[]
  residuals: number[]
}

/**
 * Types for data quality
 */
interface DataQualityMetrics {
  completeness: number
  accuracy: number
  consistency: number
  uniqueness: number
  timeliness: number
}

interface AnomalyDetectionOptions {
  method: 'zscore' | 'iqr' | 'isolationForest'
  threshold?: number
  features?: string[]
}

/**
 * Types for versioning and change tracking
 */
interface VersionInfo<T> {
  version: number
  timestamp: Date
  changes: Array<{
    type: 'add' | 'update' | 'delete'
    item: T
    previousItem?: T
  }>
}

/**
 * Interface for collection metrics
 */
interface CollectionMetrics {
  count: number
  nullCount: number
  uniqueCount: number
  heapUsed: number
  heapTotal: number
  fieldCount?: number
  nullFieldsDistribution?: Map<string, number>
}

/**
 * Type for a lazy evaluation generator
 */
type LazyGenerator<T> = Generator<T, void, unknown> | AsyncGenerator<T, void, unknown>

/**
 * Interface for lazy collection operations
 */
interface LazyCollectionOperations<T> {
  // Core Operations - these build up the computation chain without executing
  map: <U>(callback: (item: T, index: number) => U) => LazyCollectionOperations<U>
  filter: (predicate: (item: T, index: number) => boolean) => LazyCollectionOperations<T>
  flatMap: <U>(callback: (item: T, index: number) => U[]) => LazyCollectionOperations<U>
  take: (count: number) => LazyCollectionOperations<T>
  skip: (count: number) => LazyCollectionOperations<T>
  chunk: (size: number) => LazyCollectionOperations<T[]>

  // Terminal Operations - these execute the chain
  toArray: () => Promise<T[]>
  toCollection: () => Promise<CollectionOperations<T>>
  forEach: (callback: (item: T) => void) => Promise<void>
  reduce: <U>(callback: (accumulator: U, current: T) => U, initial: U) => Promise<U>
  count: () => Promise<number>
  first: () => Promise<T | undefined>
  last: () => Promise<T | undefined>
  nth: (n: number) => Promise<T | undefined>

  // Utility Operations
  cache: () => LazyCollectionOperations<T>
  batch: (size: number) => LazyCollectionOperations<T>
  pipe: <U>(callback: (lazy: LazyCollectionOperations<T>) => LazyCollectionOperations<U>) => LazyCollectionOperations<U>
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

  // Advanced Transformations
  mapToGroups: <K extends keyof T, V>(callback: (item: T) => [K, V]) => Map<K, CollectionOperations<V>>
  mapSpread: <U>(callback: (...args: any[]) => U) => CollectionOperations<U>
  mapUntil: <U>(callback: (item: T, index: number) => U, predicate: (item: U) => boolean) => CollectionOperations<U>

  // Async Operations
  mapAsync: <U>(callback: AsyncCallback<T, U>) => Promise<CollectionOperations<Awaited<U>>>
  filterAsync: (callback: AsyncCallback<T, boolean>) => Promise<CollectionOperations<T>>
  reduceAsync: <U>(callback: (acc: U, item: T) => Promise<U>, initialValue: U) => Promise<U>
  everyAsync: (callback: AsyncCallback<T, boolean>) => Promise<boolean>
  someAsync: (callback: AsyncCallback<T, boolean>) => Promise<boolean>

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

  // Advanced Mathematical Operations
  product: (key?: keyof T) => number
  standardDeviation: (key?: keyof T) => StandardDeviationResult
  percentile: (p: number, key?: keyof T) => number | undefined
  variance: (key?: keyof T) => number
  frequency: (key?: keyof T) => Map<any, number>

  // Grouping & Chunking
  chunk: (size: number) => CollectionOperations<T[]>
  groupBy: (<K extends keyof T>(key: K) => Map<T[K], CollectionOperations<T>>) & ((callback: KeySelector<T>) => Map<string | number, CollectionOperations<T>>)
  partition: (predicate: (item: T) => boolean) => [CollectionOperations<T>, CollectionOperations<T>]

  // Advanced Grouping
  groupByMultiple: <K extends keyof T>(...keys: K[]) => Map<string, CollectionOperations<T>>
  pivot: <K extends keyof T, V extends keyof T>(keyField: K, valueField: V) => Map<T[K], T[V]>

  // Filtering & Searching
  where: <K extends keyof T>(key: K, value: T[K]) => CollectionOperations<T>
  whereIn: <K extends keyof T>(key: K, values: T[K][]) => CollectionOperations<T>
  whereNotIn: <K extends keyof T>(key: K, values: T[K][]) => CollectionOperations<T>
  whereBetween: <K extends keyof T>(key: K, min: T[K], max: T[K]) => CollectionOperations<T>
  whereNotBetween: <K extends keyof T>(key: K, min: T[K], max: T[K]) => CollectionOperations<T>
  unique: <K extends keyof T>(key?: K) => CollectionOperations<T>
  when: (condition: boolean | ConditionalCallback<T>, callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  unless: (condition: boolean | ConditionalCallback<T>, callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>

  // Advanced Filtering
  whereNull: <K extends keyof T>(key: K) => CollectionOperations<T>
  whereNotNull: <K extends keyof T>(key: K) => CollectionOperations<T>
  whereLike: <K extends keyof T>(key: K, pattern: string) => CollectionOperations<T>
  whereRegex: <K extends keyof T>(key: K, regex: RegExp) => CollectionOperations<T>
  whereInstanceOf: <U>(constructor: new (...args: any[]) => U) => CollectionOperations<T>

  // Sorting
  sort: (compareFunction?: CompareFunction<T>) => CollectionOperations<T>
  sortBy: <K extends keyof T>(key: K, direction?: 'asc' | 'desc') => CollectionOperations<T>
  sortByDesc: <K extends keyof T>(key: K) => CollectionOperations<T>

  // Data Extraction
  pluck: <K extends keyof T>(key: K) => CollectionOperations<T[K]>
  values: () => CollectionOperations<T>
  keys: <K extends keyof T>(key: K) => CollectionOperations<T[K]>

  // Pagination
  paginate: (perPage: number, page?: number) => PaginationResult<T>
  forPage: (page: number, perPage: number) => CollectionOperations<T>
  cursor: (size: number) => AsyncGenerator<CollectionOperations<T>, void, unknown>

  // String Operations (for string collections)
  join: (this: CollectionOperations<string>, separator?: string) => string
  implode: <K extends keyof T>(key: K, separator?: string) => string
  lower: (this: CollectionOperations<string>) => CollectionOperations<string>
  upper: (this: CollectionOperations<string>) => CollectionOperations<string>
  slug: (this: CollectionOperations<string>) => CollectionOperations<string>

  // Set Operations
  symmetricDiff: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  cartesianProduct: <U>(other: U[] | CollectionOperations<U>) => CollectionOperations<[T, U]>
  power: () => CollectionOperations<CollectionOperations<T>>

  // Set Operations
  intersect: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  union: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>

  // Analysis and Statistics
  describe: <K extends keyof T>(key?: K) => Map<string, number>
  correlate: <K extends keyof T>(key1: K, key2: K) => number
  outliers: <K extends keyof T>(key: K, threshold?: number) => CollectionOperations<T>

  // Type Conversion
  cast: <U>(constructor: new (...args: any[]) => U) => CollectionOperations<U>

  // Utilities
  tap: (callback: (collection: CollectionOperations<T>) => void) => CollectionOperations<T>
  pipe: <U>(callback: (collection: CollectionOperations<T>) => U) => U
  isEmpty: () => boolean
  isNotEmpty: () => boolean
  count: () => number
  toArray: () => T[]
  toMap: <K extends keyof T>(key: K) => Map<T[K], T>
  toSet: () => Set<T>

  // Debugging and Development
  debug: () => CollectionOperations<T>
  dump: () => void
  dd: () => never

  // Time Series Operations
  timeSeries: (options: TimeSeriesOptions) => CollectionOperations<TimeSeriesPoint>
  movingAverage: (options: MovingAverageOptions) => CollectionOperations<number>
  trend: (options: TimeSeriesOptions) => { slope: number, intercept: number }
  seasonality: (options: TimeSeriesOptions) => Map<string, number>
  forecast: (periods: number) => CollectionOperations<T>

  // Advanced Validation
  validate: (schema: ValidationSchema<T>) => Promise<ValidationResult>
  validateSync: (schema: ValidationSchema<T>) => ValidationResult
  assertValid: (schema: ValidationSchema<T>) => Promise<void>
  sanitize: (rules: Record<keyof T, (value: any) => any>) => CollectionOperations<T>

  // Advanced Querying
  query: (sql: string, params?: any[]) => CollectionOperations<T>
  having: <K extends keyof T>(key: K, op: string, value: any) => CollectionOperations<T>
  crossJoin: <U>(other: CollectionOperations<U>) => CollectionOperations<T & U>
  leftJoin: <U, K extends keyof T>(
    other: CollectionOperations<U>,
    key: K,
    otherKey: keyof U
  ) => CollectionOperations<T & Partial<U>>

  // Streaming Operations
  stream: () => ReadableStream<T>
  fromStream: (stream: ReadableStream<T>) => Promise<CollectionOperations<T>>
  batch: (size: number) => AsyncGenerator<CollectionOperations<T>, void, unknown>

  // Serialization & Deserialization
  toJSON: (options?: SerializationOptions) => string
  toCsv: (options?: SerializationOptions) => string
  toXml: (options?: SerializationOptions) => string
  parse: (data: string, format: 'json' | 'csv' | 'xml') => CollectionOperations<T>

  // Caching & Performance
  cache: (ttl?: number) => CollectionOperations<T>
  memoize: <K extends keyof T>(key: K) => CollectionOperations<T>
  prefetch: () => Promise<CollectionOperations<T>>
  lazy: () => LazyCollectionOperations<T>

  // Advanced Math & Statistics
  zscore: <K extends keyof T>(key: K) => CollectionOperations<number>
  kurtosis: <K extends keyof T>(key: K) => number
  skewness: <K extends keyof T>(key: K) => number
  covariance: <K extends keyof T>(key1: K, key2: K) => number
  entropy: <K extends keyof T>(key: K) => number

  // Pattern Matching & Text Analysis
  fuzzyMatch: <K extends keyof T>(key: K, pattern: string, threshold?: number) => CollectionOperations<T>
  sentiment: (this: CollectionOperations<string>) => CollectionOperations<{ score: number, comparative: number }>
  wordFrequency: (this: CollectionOperations<string>) => Map<string, number>
  ngrams: (this: CollectionOperations<string>, n: number) => CollectionOperations<string>

  // Advanced Transformations
  mapOption: <U>(callback: (item: T) => U | null | undefined) => CollectionOperations<NonNullable<U>>
  zipWith: <U, R>(other: CollectionOperations<U>, fn: (a: T, b: U) => R) => CollectionOperations<R>
  scan: <U>(callback: (acc: U, item: T) => U, initial: U) => CollectionOperations<U>
  unfold: <U>(fn: (seed: U) => [T, U] | null, initial: U) => CollectionOperations<T>

  // Monitoring & Metrics
  metrics: () => CollectionMetrics
  profile: () => Promise<{ time: number, memory: number }>
  instrument: (callback: (stats: Map<string, number>) => void) => CollectionOperations<T>

  // Type Conversions & Casting
  as: <U extends Record<string, any>>(type: new () => U) => CollectionOperations<U>
  pick: <K extends keyof T>(...keys: K[]) => CollectionOperations<Pick<T, K>>
  omit: <K extends keyof T>(...keys: K[]) => CollectionOperations<Omit<T, K>>
  transform: <U>(schema: Record<keyof U, (item: T) => any>) => CollectionOperations<U>

  // Machine Learning Operations
  kmeans: (options: KMeansOptions) => CollectionOperations<{ cluster: number, data: T }>
  linearRegression: <K extends keyof T>(
    dependent: K,
    independents: K[]
  ) => RegressionResult
  knn: <K extends keyof T>(
    point: Pick<T, K>,
    k: number,
    features: K[]
  ) => CollectionOperations<T>
  naiveBayes: <K extends keyof T>(
    features: K[],
    label: K
  ) => (item: Pick<T, K>) => T[K]

  // Data Quality & Cleaning
  dataQuality: () => DataQualityMetrics
  detectAnomalies: (options: AnomalyDetectionOptions) => CollectionOperations<T>
  impute: <K extends keyof T>(key: K, strategy: 'mean' | 'median' | 'mode') => CollectionOperations<T>
  normalize: <K extends keyof T>(key: K, method: 'minmax' | 'zscore') => CollectionOperations<T>
  removeOutliers: <K extends keyof T>(key: K, threshold?: number) => CollectionOperations<T>

  // Versioning & History
  snapshot: () => void
  revert: (version: number) => CollectionOperations<T>
  history: () => CollectionOperations<VersionInfo<T>>
  diff: (version1: number, version2: number) => CollectionOperations<VersionInfo<T>>
  setDiff: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>

  // Advanced Querying & Search
  search: <K extends keyof T>(
    query: string,
    fields: K[],
    options?: { fuzzy?: boolean, weights?: Record<K, number> }
  ) => CollectionOperations<T & { score: number }>
  aggregate: <K extends keyof T>(
    key: K,
    operations: Array<'sum' | 'avg' | 'min' | 'max' | 'count'>
  ) => Map<T[K], Record<string, number>>
  pivotTable: <R extends keyof T, C extends keyof T, V extends keyof T>(
    rows: R,
    cols: C,
    values: V,
    aggregation: 'sum' | 'avg' | 'count'
  ) => Map<T[R], Map<T[C], number>>

  // Performance Optimizations
  parallel: <U>(
    callback: (chunk: CollectionOperations<T>) => Promise<U>,
    options?: { chunks?: number, maxConcurrency?: number }
  ) => Promise<CollectionOperations<U>>
  index: <K extends keyof T>(keys: K[]) => CollectionOperations<T>
  optimize: () => CollectionOperations<T>

  // Export & Integration
  toSQL: (table: string) => string
  toGraphQL: (typename: string) => string
  toElastic: (index: string) => Record<string, any>
  toPandas: () => string // Returns Python code for pandas DataFrame

  // Developer Experience
  playground: () => void // Opens collection in interactive playground
  explain: () => string // Explains the current collection pipeline
  benchmark: () => Promise<{
    timing: Record<string, number>
    memory: Record<string, number>
    complexity: Record<string, string>
  }>
  lint: () => Array<{
    type: 'warning' | 'error'
    message: string
    suggestion?: string
  }>

  // Advanced Mathematical Operations
  fft: (this: CollectionOperations<number>) => CollectionOperations<[number, number]> // Returns [real, imaginary]
  interpolate: (this: CollectionOperations<number>, points: number) => CollectionOperations<number>
  convolve: (this: CollectionOperations<number>, kernel: number[]) => CollectionOperations<number>
  differentiate: (this: CollectionOperations<number>) => CollectionOperations<number>
  integrate: (this: CollectionOperations<number>) => CollectionOperations<number>

  // Specialized Data Types Support
  geoDistance: <K extends keyof T>(
    key: K,
    point: [number, number],
    unit?: 'km' | 'mi'
  ) => CollectionOperations<T & { distance: number }>
  money: <K extends keyof T>(
    key: K,
    currency?: string
  ) => CollectionOperations<T & { formatted: string }>
  dateTime: <K extends keyof T>(
    key: K,
    format?: string
  ) => CollectionOperations<T & { formatted: string }>

  // Configuration & Metadata
  configure: (options: {
    precision?: number
    timezone?: string
    locale?: string
    errorHandling?: 'strict' | 'loose'
  }) => void
  metadata: () => {
    schema: Record<keyof T, string>
    constraints: Record<keyof T, string[]>
    statistics: Record<keyof T, Record<string, number>>
    quality: DataQualityMetrics
  }
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
      const history = this.history().toArray()
      const changes = history.filter(v =>
        v.version >= Math.min(version1, version2)
        && v.version <= Math.max(version1, version2),
      )
      return collect(changes)
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

    metadata() {
      const schema: Record<string, string> = {}
      const constraints: Record<string, string[]> = {}
      const statistics: Record<string, Record<string, number>> = {}

      if (collection.length > 0) {
        const sample = collection.items[0]
        for (const [key, value] of Object.entries(sample)) {
          // Infer schema
          schema[key] = typeof value

          // Collect constraints
          constraints[key] = []
          if (value !== null)
            constraints[key].push('NOT NULL')
          if (typeof value === 'number') {
            const values = collection.items.map(item => item[key as keyof T])
            const min = Math.min(...values as number[])
            const max = Math.max(...values as number[])
            constraints[key].push(`MIN(${min})`, `MAX(${max})`)
          }

          // Calculate statistics
          statistics[key] = {
            nullCount: collection.items.filter(item => item[key as keyof T] === null).length,
            uniqueCount: new Set(collection.items.map(item => item[key as keyof T])).size,
          }
        }
      }

      return {
        schema,
        constraints,
        statistics,
        quality: this.dataQuality(),
      }
    },

    dataQuality(): DataQualityMetrics {
      if (collection.length === 0) {
        return {
          completeness: 1,
          accuracy: 1,
          consistency: 1,
          uniqueness: 1,
          timeliness: 1,
        }
      }

      const fields = Object.keys(collection.items[0])

      // Calculate completeness (% of non-null values)
      const completeness = fields.reduce((acc, field) => {
        const nullCount = collection.items.filter(item => item[field as keyof T] === null).length
        return acc + (1 - nullCount / collection.length)
      }, 0) / fields.length

      // Calculate uniqueness (% of unique values per field)
      const uniqueness = fields.reduce((acc, field) => {
        const uniqueCount = new Set(collection.items.map(item => item[field as keyof T])).size
        return acc + uniqueCount / collection.length
      }, 0) / fields.length

      // Other metrics would need specific business rules
      return {
        completeness,
        accuracy: 1, // Would need validation rules
        consistency: 1, // Would need business rules
        uniqueness,
        timeliness: 1, // Would need timestamp analysis
      }
    },

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
  }
}

/**
 * Creates a new lazy collection operation chain
 */
function createLazyOperations<T>(generator: LazyGenerator<T>): LazyCollectionOperations<T> {
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

/**
 * Helper function to create an empty collection
 */
export function emptyCollection<T extends Record<string, unknown>>(): CollectionOperations<T> {
  const empty: T[] = []
  return collect(empty)
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
  return value
    && typeof value === 'object'
    && Array.isArray(value.items)
    && typeof value.length === 'number'
    && typeof value.map === 'function'
    && typeof value.filter === 'function'
}

/**
 * Helper function to check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  )
}

/**
 * Helper function to get the next timestamp based on interval
 */
function getNextTimestamp(date: Date, interval: 'day' | 'week' | 'month' | 'year'): number {
  const nextDate = new Date(date)

  switch (interval) {
    case 'day':
      nextDate.setDate(date.getDate() + 1)
      break
    case 'week':
      nextDate.setDate(date.getDate() + 7)
      break
    case 'month':
      nextDate.setMonth(date.getMonth() + 1)
      break
    case 'year':
      nextDate.setFullYear(date.getFullYear() + 1)
      break
  }

  return nextDate.getTime()
}

export const ValidationRules = {
  required: <T>(): ValidationRule<T> =>
    (value: T) => value !== undefined && value !== null,

  min: (min: number): ValidationRule<number> =>
    (value: number) => value >= min,

  max: (max: number): ValidationRule<number> =>
    (value: number) => value <= max,

  length: (length: number): ValidationRule<string | any[]> =>
    (value: string | any[]) => value.length === length,

  minLength: (min: number): ValidationRule<string | any[]> =>
    (value: string | any[]) => value.length >= min,

  maxLength: (max: number): ValidationRule<string | any[]> =>
    (value: string | any[]) => value.length <= max,

  pattern: (regex: RegExp): ValidationRule<string> =>
    (value: string) => regex.test(value),

  email: (): ValidationRule<string> =>
    (value: string) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value),

  url: (): ValidationRule<string> =>
    (value: string) => {
      try {
        // eslint-disable-next-line no-new
        new URL(value)
        return true
      }
      catch {
        return false
      }
    },

  numeric: (): ValidationRule<string | number> =>
    (value: string | number) => !Number.isNaN(Number(value)),

  integer: (): ValidationRule<number> =>
    (value: number) => Number.isInteger(value),

  positive: (): ValidationRule<number> =>
    (value: number) => value > 0,

  negative: (): ValidationRule<number> =>
    (value: number) => value < 0,

  inRange: (min: number, max: number): ValidationRule<number> =>
    (value: number) => value >= min && value <= max,

  oneOf: <T>(values: T[]): ValidationRule<T> =>
    (value: T) => values.includes(value),

  custom: <T>(fn: (value: T) => boolean | Promise<boolean>): ValidationRule<T> =>
    fn,
} as const
