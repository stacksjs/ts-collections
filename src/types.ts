/**
 * Type for any function that takes a value and returns a string/number key
 */
export type KeySelector<T> = (item: T) => string | number

/**
 * Type for comparison function
 */
export type CompareFunction<T> = (a: T, b: T) => number

/**
 * Type for when/unless callback
 */
export type ConditionalCallback<T> = (collection: CollectionOperations<T>) => boolean

/**
 * Types for pagination
 */
export interface PaginationResult<T> {
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
export interface StandardDeviationResult {
  population: number
  sample: number
}

/**
 * Types for async operations
 */
export type AsyncCallback<T, U> = (item: T, index: number) => Promise<U>

/**
 * Represents a collection of items with type safety and chainable methods
 */
export interface Collection<T> {
  readonly items: T[]
  readonly length: number
}

/**
 * Types for time series operations
 */
export interface TimeSeriesOptions {
  dateField: string
  valueField: string
  interval?: 'day' | 'week' | 'month' | 'year'
  fillGaps?: boolean
}

export interface TimeSeriesPoint {
  date: Date
  value: number
}

export interface MovingAverageOptions {
  window: number
  centered?: boolean
}

/**
 * Types for validation
 */
export type ValidationRule<T> = (value: T) => boolean | Promise<boolean>

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

export interface ValidationResult {
  isValid: boolean
  errors: Map<string, string[]>
}

/**
 * Types for serialization
 */
export interface SerializationOptions {
  pretty?: boolean
  exclude?: string[]
  include?: string[]
  transform?: Record<string, (value: any) => any>
}

/**
 * Types for machine learning operations
 */
export interface KMeansOptions {
  k: number
  maxIterations?: number
  distanceMetric?: 'euclidean' | 'manhattan' | 'cosine'
}

export interface RegressionResult {
  coefficients: number[]
  rSquared: number
  predictions: number[]
  residuals: number[]
}

/**
 * Types for data quality
 */
// interface DataQualityMetrics {
//   completeness: number
//   accuracy: number
//   consistency: number
//   uniqueness: number
//   timeliness: number
// }

export interface AnomalyDetectionOptions<T> {
  method: 'zscore' | 'iqr' | 'isolationForest'
  threshold?: number
  features?: Array<keyof T>
}

/**
 * Types for versioning and change tracking
 */
export interface VersionInfo<T> {
  version: number
  timestamp: Date
  changes: Array<{
    type: 'add' | 'update' | 'delete'
    item: T
    previousItem?: T
  }>
}

export interface VersionStore<T> {
  currentVersion: number
  snapshots: Map<number, {
    items: T[]
    timestamp: Date
    metadata?: Record<string, any>
  }>
  changes: VersionInfo<T>[]
}

/**
 * Interface for collection metrics
 */
export interface CollectionMetrics {
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
export type LazyGenerator<T> = Generator<T, void, unknown> | AsyncGenerator<T, void, unknown>

/**
 * Interface for lazy collection operations
 */
export interface LazyCollectionOperations<T> {
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
export interface CollectionOperations<T> extends Collection<T> {
  // Laravel-like
  all: () => T[]
  average: (key?: keyof T) => number // alias for avg
  collapse: () => CollectionOperations<T extends Array<infer U> ? U : T>
  combine: <U>(values: U[]) => CollectionOperations<Record<string, U>>
  contains: ((item: T) => boolean) & (<K extends keyof T>(key: K, value: T[K]) => boolean)
  containsOneItem: () => boolean
  countBy: <K extends keyof T>(key: K) => Map<T[K], number>
  diffAssoc: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  diffKeys: <K extends keyof T>(other: Record<K, T[K]>[]) => CollectionOperations<T>
  diffUsing: (other: T[], callback: (a: T, b: T) => number) => CollectionOperations<T>
  doesntContain: ((item: T) => boolean) & (<K extends keyof T>(key: K, value: T[K]) => boolean)
  duplicates: <K extends keyof T>(key?: K) => CollectionOperations<T>
  each: (callback: (item: T) => void) => CollectionOperations<T>
  eachSpread: (callback: (...args: any[]) => void) => CollectionOperations<T>
  except: <K extends keyof T>(...keys: K[]) => CollectionOperations<Omit<T, K>>
  firstOrFail: () => T
  firstWhere: <K extends keyof T>(key: K, value: T[K]) => T | undefined
  flatten: (depth?: number) => CollectionOperations<T extends Array<infer U> ? U : T>
  flip: <R extends Record<string | number, string | number> = {
    [K in Extract<keyof T, string | number> as T[K] extends string | number ? T[K] : never]: K
  }>() => CollectionOperations<R>
  forget: <K extends keyof T>(key: K) => CollectionOperations<Omit<T, K>>
  get: <K extends keyof T>(key: K, defaultValue?: T[K]) => T[K] | undefined
  has: <K extends keyof T>(key: K) => boolean
  keyBy: <K extends keyof T>(key: K) => Map<T[K], T>
  macro: (name: string, callback: (...args: any[]) => any) => void
  make: <U>(items: U[]) => CollectionOperations<U>
  mapInto: <U extends Record<string, any>>(constructor: new () => U) => CollectionOperations<U>
  mapToDictionary: <K extends keyof T>(callback: (item: T) => [K, T[K]]) => Map<K, T[K]>
  mapWithKeys: <K extends keyof T, V>(callback: (item: T) => [K, V]) => Map<K, V>
  merge: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  mergeRecursive: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>
  only: <K extends keyof T>(...keys: K[]) => CollectionOperations<Pick<T, K>>
  pad: (size: number, value: T) => CollectionOperations<T>
  pop: () => T | undefined
  prepend: (value: T) => CollectionOperations<T>
  pull: <K extends keyof T>(key: K) => T[K] | undefined
  push: (value: T) => CollectionOperations<T>
  put: <K extends keyof T>(key: K, value: T[K]) => CollectionOperations<T>
  random: (size?: number) => CollectionOperations<T>
  reject: (predicate: (item: T) => boolean) => CollectionOperations<T>
  replace: (items: T[]) => CollectionOperations<T>
  replaceRecursive: (items: T[]) => CollectionOperations<T>
  reverse: () => CollectionOperations<T>
  shift: () => T | undefined
  shuffle: () => CollectionOperations<T>
  skipUntil: (value: T | ((item: T) => boolean)) => CollectionOperations<T>
  skipWhile: (value: T | ((item: T) => boolean)) => CollectionOperations<T>
  slice: (start: number, length?: number) => CollectionOperations<T>
  sole: () => T
  sortDesc: () => CollectionOperations<T>
  sortKeys: () => CollectionOperations<T>
  sortKeysDesc: () => CollectionOperations<T>
  splice: (start: number, deleteCount?: number, ...items: T[]) => CollectionOperations<T>
  split: (numberOfGroups: number) => CollectionOperations<T[]>
  takeUntil: (value: T | ((item: T) => boolean)) => CollectionOperations<T>
  takeWhile: (value: T | ((item: T) => boolean)) => CollectionOperations<T>
  times: <U>(count: number, callback: (index: number) => U) => CollectionOperations<U>
  undot: () => CollectionOperations<Record<string, any>>
  unlessEmpty: (callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  unlessNotEmpty: (callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  unwrap: <U>(value: U | CollectionOperations<U>) => U[]
  whenEmpty: (callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  whenNotEmpty: (callback: (collection: CollectionOperations<T>) => CollectionOperations<T>) => CollectionOperations<T>
  wrap: <U>(value: U | U[]) => CollectionOperations<U>
  zip: <U>(array: U[]) => CollectionOperations<[T, U]>

  // Transformations
  map: <U>(callback: (item: T, index: number) => U) => CollectionOperations<U>
  filter: (predicate: (item: T, index: number) => boolean) => CollectionOperations<T>
  reduce: <U>(callback: (accumulator: U, current: T, index: number) => U, initialValue: U) => U
  flatMap: <U>(callback: (item: T, index: number) => U[]) => CollectionOperations<U>

  // Advanced Transformations
  mapToGroups: <K extends keyof T | string | number, V>(callback: (item: T) => [K, V]) => Map<K, CollectionOperations<V>>
  mapSpread: <U>(callback: (...args: any[]) => U) => CollectionOperations<U>
  mapUntil: <U>(callback: (item: T, index: number) => U, predicate: (item: U) => boolean) => CollectionOperations<U>

  // Async Operations
  mapAsync: <U>(callback: AsyncCallback<T, U>) => Promise<CollectionOperations<Awaited<U>>>
  filterAsync: (callback: AsyncCallback<T, boolean>) => Promise<CollectionOperations<T>>
  reduceAsync: <U>(callback: (acc: U, item: T) => Promise<U>, initialValue: U) => Promise<U>
  everyAsync: (callback: AsyncCallback<T, boolean>) => Promise<boolean>
  someAsync: (callback: AsyncCallback<T, boolean>) => Promise<boolean>

  // Accessing Elements
  // eslint-disable-next-line ts/method-signature-style
  first(): T | undefined
  // eslint-disable-next-line ts/method-signature-style
  first<K extends keyof T>(key: K): T[K] | undefined
  // eslint-disable-next-line ts/method-signature-style
  last(): T | undefined
  // eslint-disable-next-line ts/method-signature-style
  last<K extends keyof T>(key: K): T[K] | undefined
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
  // dataQuality: () => DataQualityMetrics
  detectAnomalies: (options: AnomalyDetectionOptions<T>) => CollectionOperations<T>
  impute: <K extends keyof T>(key: K, strategy: 'mean' | 'median' | 'mode') => CollectionOperations<T>
  normalize: <K extends keyof T>(key: K, method: 'minmax' | 'zscore') => CollectionOperations<T>
  removeOutliers: <K extends keyof T>(key: K, threshold?: number) => CollectionOperations<T>

  // Versioning & History
  diff: (version1: number, version2: number) => CollectionOperations<VersionInfo<T>>
  diffSummary: (version1: number, version2: number) => {
    added: number
    removed: number
    updated: number
    changes: Array<{
      type: 'add' | 'update' | 'delete'
      field?: keyof T
      oldValue?: any
      newValue?: any
    }>
  }
  setDiff: (other: T[] | CollectionOperations<T>) => CollectionOperations<T>

  // Advanced Querying & Search
  /**
   * Search through collection items using string matching
   * @param query Search query string
   * @param fields Fields to search in
   * @param options Search options including fuzzy matching and field weights
   */
  search: <K extends keyof T>(
    query: string,
    fields: K[],
    options?: { fuzzy?: boolean, weights?: Partial<Record<K, number>> }
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
  /**
   * Convert collection to GraphQL-formatted string
   * @param typename The GraphQL type name for the objects
   */
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

  // Advanced Mathematical Operations
  /**
   * Compute Fast Fourier Transform
   * Only available when T is number
   */
  fft: (this: CollectionOperations<T>) => T extends number ? CollectionOperations<[number, number]> : never
  interpolate: (
    this: CollectionOperations<T>,
    points: number
  ) => T extends number ? CollectionOperations<number> : never
  /**
   * Compute convolution with a kernel
   * Only available when T is number
   */
  convolve: (this: CollectionOperations<T>, kernel: number[]) => T extends number ? CollectionOperations<number> : never
  differentiate: (this: CollectionOperations<T>) => T extends number ? CollectionOperations<number> : never
  integrate: (this: CollectionOperations<T>) => T extends number ? CollectionOperations<number> : never

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
  // metadata: () => {
  //   schema: Record<keyof T, string>
  //   constraints: Record<keyof T, string[]>
  //   statistics: Record<keyof T, Record<string, number>>
  //   quality: DataQualityMetrics
  // }
}

export interface CacheEntry<T> {
  data: T[]
  expiry: number
}

export interface ClusterResult<T> {
  cluster: number
  data: T
}

export interface PluckedCluster {
  values: () => number[]
  toArray: () => number[]
  [Symbol.iterator]: () => IterableIterator<number>
}

export interface PluckedData<T> {
  values: () => T[]
  toArray: () => T[]
  forEach: (callback: (item: T) => void) => void
  avg: (field: keyof T) => number
  filter: (predicate: (item: T) => boolean) => PluckedData<T>
}

export interface KMeansResult<T> extends CollectionOperations<ClusterResult<T>> {
  pluck: {
    (key: 'cluster'): PluckedCluster
    (key: 'data'): PluckedData<T>
    <K extends keyof ClusterResult<T>>(key: K): CollectionOperations<ClusterResult<T>[K]>
  }
}
