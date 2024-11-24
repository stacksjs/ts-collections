<p align="center"><img src=".github/art/cover.png" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-collect

> A powerful, fully-typed collections library for TypeScript, combining Laravel's collection elegance with advanced data processing capabilities. Features lazy evaluation, statistical analysis, machine learning operations, and comprehensive data manipulation tools—all with zero dependencies.

## Features

- Lightweight & Dependency-free
- Fully typed
- Laravel-inspired APIs

### Core Operations (Laravel Collection API)

- [x] Standard operations (map, filter, reduce)
- [x] FlatMap and MapSpread operations
- [x] Element access (first, firstOrFail, last, nth)
- [x] Subset operations (take, skip, slice)
- [x] Unique value handling
- [x] Chunk operations
- [x] Tap and Pipe utilities
- [x] Collection conversion (toArray, toMap, toSet)
- [x] Collection inspection (count, isEmpty, isNotEmpty)
- [x] Combine and collapse operations
- [x] Contains checks (contains, containsOneItem)
- [x] Each iterations (each, eachSpread)
- [x] Only and except operations
- [x] Forget and random selection
- [x] Push, prepend, and put operations
- [x] Skip and take variants (skipUntil, skipWhile, takeUntil, takeWhile)
- [x] Sole item retrieval
- [x] Conditional execution (when, unless)
- [x] Wrap and unwrap operations

### Advanced Array & Object Operations

- [x] GroupBy with multiple key support
- [x] Value extraction (pluck)
- [x] Where clause variations
  - Basic where operations (where, whereIn, whereNotIn)
  - Range checks (whereBetween, whereNotBetween)
  - Null handling (whereNull, whereNotNull)
  - Pattern matching (whereLike, whereRegex)
  - Type checks (whereInstanceOf)
- [x] Comprehensive sorting
  - Basic sort operations
  - Key-based sorting (sortBy, sortByDesc)
  - Key sorting (sortKeys, sortKeysDesc)
- [x] Pagination & Cursor iteration
- [x] Data partitioning
- [x] Set operations (union, intersect, diff, symmetricDiff)
- [x] Advanced products (cartesianProduct)
- [x] Recursive operations (mergeRecursive, replaceRecursive)

### Advanced Transformations

- [x] Group transformations (mapToGroups)
- [x] Array handling (mapSpread, mapWithKeys)
- [x] Conditional mapping (mapUntil, mapOption)
- [x] Data restructuring (transform)
- [x] Type system integration (cast, mapInto)
- [x] Property operations (pick, omit)
- [x] Fuzzy matching algorithms
- [x] Key-value transformations (flip, undot)

### Statistical Operations

- [x] Basic statistics
  - Sum and averages
  - Median and mode
  - Range (min, max)
  - Products
- [x] Advanced statistics
  - Standard deviation
  - Variance analysis
  - Percentile calculations
  - Correlation coefficients
  - Entropy measures
  - Z-score computations
  - Distribution analysis (kurtosis, skewness)
  - Covariance calculations

### Time Series Analysis

- [x] Series conversion and formatting
- [x] Moving average calculations
- [x] Trend detection and analysis
- [x] Seasonality identification
- [x] Time-based forecasting
- [x] Temporal grouping operations
- [x] Time-based aggregations
- [x] Interval handling

### Machine Learning Operations

- [x] Clustering algorithms
  - K-means implementation
  - Cluster analysis tools
- [x] Regression analysis
  - Linear regression
  - Multi-variable regression
- [x] Classification tools
  - K-nearest neighbors (KNN)
  - Naive Bayes classifier
- [x] Anomaly detection systems
- [x] Data preparation
  - Normalization
  - Outlier handling
  - Feature scaling

### Async & Performance Optimization

- [x] Asynchronous operations
  - Async mapping
  - Async filtering
  - Async reduction
- [x] Parallel processing capabilities
- [x] Batch processing systems
- [x] Lazy evaluation strategies
- [x] Caching mechanisms
- [x] Performance tools
  - Profiling utilities
  - Memory optimization
  - Index management
  - Operation monitoring

### Data Validation & Quality

- [x] Validation framework
  - Schema validation
  - Custom rules
  - Async validation
- [x] Data sanitization tools
- [x] Quality metrics
- [x] Constraint management
- [x] Error handling
- [x] Type enforcement

### Text Processing

- [x] String manipulation
  - Join operations
  - Implode functionality
  - Case transformation
- [x] URL slug generation
- [x] Text analysis
  - Word frequency
  - N-gram generation
  - Sentiment analysis
- [x] Pattern matching
- [x] String normalization

### Serialization & Export

- [x] Multiple format support
  - JSON serialization
  - CSV generation
  - XML export
- [x] Query generation
  - SQL queries
  - GraphQL operations
- [x] Integration formats
  - Elasticsearch bulk
  - Pandas DataFrame
- [x] Custom formatting options

### Streaming & I/O

- [x] Stream operations
  - Stream creation
  - Stream consumption
- [x] Batch streaming
- [x] Memory-efficient processing
- [x] Buffered operations

### Advanced Mathematical Operations

- [x] Signal processing
  - Fast Fourier Transform (FFT)
  - Signal interpolation
  - Convolution operations
- [x] Calculus operations
  - Differentiation
  - Integration
- [x] Numerical methods
- [x] Mathematical optimizations

### Special Data Types Support

- [x] Geographic calculations
  - Distance computations
  - Coordinate handling
- [x] Financial operations
  - Money formatting
  - Currency handling
- [x] DateTime operations
  - Formatting
  - Timezone handling
- [x] Complex number support
  - Basic operations
  - Advanced computations

### Versioning & History

- [x] Version management
  - Version tracking
  - History storage
- [x] Change tracking
  - Diff generation
  - Change detection
- [x] History operations
  - Rollback support
  - Version comparison

### Development Tools

- [x] Development aids
  - Playground environment
  - Debugging utilities
- [x] Analysis tools
  - Pipeline visualization
  - Performance benchmarking
- [x] Development modes
  - Debug mode
  - Strict mode

### Utility Features

- [x] System configuration
  - Configuration management
  - Environment handling
- [x] Internationalization
  - Locale support
  - Timezone management
- [x] Error handling
  - Error modes
  - Exception handling
- [x] Resource management
  - Memory tracking
  - Resource cleanup

## Get Started

```bash
bun install ts-collect
```

## Usage

### Basic Collection Operations

```typescript
import { collect } from 'ts-collect'

// Create a collection
const collection = collect([1, 2, 3, 4, 5])

// Basic operations with chaining
const result = collection
  .map(n => n * 2) // [2, 4, 6, 8, 10]
  .filter(n => n > 5) // [6, 8, 10]
  .take(2) // [6, 8]
  .toArray()

// Unique values with custom key
const users = collect([
  { id: 1, role: 'admin' },
  { id: 2, role: 'user' },
  { id: 3, role: 'admin' }
])
const uniqueRoles = users.unique('role') // [{ id: 1, role: 'admin' }, { id: 2, role: 'user' }]

// Chunk data into smaller arrays
const chunks = collection.chunk(2) // [[1, 2], [3, 4], [5]]

// Find elements
const first = collection.first() // 1
const last = collection.last() // 5
const secondItem = collection.nth(1) // 2

// all() - Get all items as array
const items = collection.all() // [1, 2, 3, 4, 5]

// average/avg - Calculate average of items
collection.average() // 3
collection.avg() // 3

// chunk - Split collection into smaller collections
collection.chunk(2) // [[1, 2], [3, 4], [5]]

// collapse - Flatten a collection of arrays
const nested = collect([[1, 2], [3, 4], [5]])
nested.collapse() // [1, 2, 3, 4, 5]

// combine - Create collection by combining arrays
const keys = collect(['name', 'age'])
const values = ['John', 25]
keys.combine(values) // { name: 'John', age: 25 }

// contains/containsOneItem - Check for item existence
collection.contains(3) // true
collection.containsOneItem() // false

// countBy - Count occurrences by value
const items = collect(['apple', 'banana', 'apple', 'orange'])
items.countBy() // Map { 'apple' => 2, 'banana' => 1, 'orange' => 1 }

// diff/diffAssoc/diffKeys - Find differences between collections
const col1 = collect([1, 2, 3])
const col2 = collect([2, 3, 4])
col1.diff(col2) // [1]

// dd/dump - Dump collection and die or just dump
collection.dump() // Console logs items
collection.dd() // Console logs and exits

// each/eachSpread - Iterate over items
collection.each(item => console.log(item))
collection.eachSpread((a, b) => console.log(a, b)) // For array items

// except/only - Get all items except/only specified keys
const user = collect({ id: 1, name: 'John', age: 25 })
user.except('age') // { id: 1, name: 'John' }
user.only('name', 'age') // { name: 'John', age: 25 }

// firstOrFail - Get first item or throw
collection.firstOrFail() // 1 or throws if empty

// firstWhere - Get first item matching criteria
const users = collect([
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
])
users.firstWhere('name', 'Jane') // { id: 2, name: 'Jane' }

// flip - Swap keys and values
const flipped = collect({ name: 'John' }).flip() // { John: 'name' }

// forget - Remove an item by key
const array = collect(['a', 'b', 'c'])
array.forget(1) // ['a', 'c']

// has/get - Check key existence / Get value
const item = collect({ name: 'John' })
item.has('name') // true
item.get('name') // 'John'

// mapInto - Map items into new class instances
class User {
  name: string = ''
  greet() { return `Hello ${this.name}` }
}
collect([{ name: 'John' }])
  .mapInto(User)
  .first()
  .greet() // "Hello John"

// prepend/push/put - Add items
collection.prepend(0) // [0, 1, 2, 3, 4, 5]
collection.push(6) // [1, 2, 3, 4, 5, 6]
collection.put('key', 'value') // Adds/updates key-value

// random - Get random item(s)
collection.random() // Random item
collection.random(2) // Array of 2 random items

// skip/skipUntil/skipWhile - Skip items
collection.skip(2) // [3, 4, 5]
collection.skipUntil(3) // [3, 4, 5]
collection.skipWhile(n => n < 3) // [3, 4, 5]

// sole - Get only item in single-item collection
collect([1]).sole() // 1 (throws if not exactly one item)

// take/takeUntil/takeWhile - Take items
collection.take(2) // [1, 2]
collection.takeUntil(3) // [1, 2]
collection.takeWhile(n => n < 3) // [1, 2]

// when/unless - Conditional execution
collection
  .when(true, col => col.take(3))
  .unless(false, col => col.take(2))

// wrap/unwrap - Wrap/unwrap value in collection
collect().wrap([1, 2, 3]) // Collection([1, 2, 3])
collection.unwrap() // [1, 2, 3]
```

### Working with Objects

```typescript
interface User {
  id: number
  name: string
  role: string
}

const users: User[] = [
  { id: 1, name: 'John', role: 'admin' },
  { id: 2, name: 'Jane', role: 'user' },
  { id: 3, name: 'Bob', role: 'user' }
]

const collection = collect(users)

// Group by a key
const byRole = collection.groupBy('role')
// Map { 'admin' => [{ id: 1, ... }], 'user' => [{ id: 2, ... }, { id: 3, ... }] }

// Pluck specific values
const names = collection.pluck('name')
// ['John', 'Jane', 'Bob']

// Find where
const admins = collection.where('role', 'admin')
// [{ id: 1, name: 'John', role: 'admin' }]
```

### Advanced Array & Object Operations

```typescript
interface User {
  id: number
  name: string
  role: string
  department: string
  salary: number
  joinedAt: Date
}

const users: User[] = [
  {
    id: 1,
    name: 'John',
    role: 'admin',
    department: 'IT',
    salary: 80000,
    joinedAt: new Date('2023-01-15')
  },
  {
    id: 2,
    name: 'Jane',
    role: 'manager',
    department: 'Sales',
    salary: 90000,
    joinedAt: new Date('2023-03-20')
  },
  {
    id: 3,
    name: 'Bob',
    role: 'developer',
    department: 'IT',
    salary: 75000,
    joinedAt: new Date('2023-06-10')
  }
]

const collection = collect(users)

// Complex grouping by multiple fields
const groupedUsers = collection.groupByMultiple('department', 'role')
// Map {
//   'IT::admin' => [{ id: 1, ... }],
//   'Sales::manager' => [{ id: 2, ... }],
//   'IT::developer' => [{ id: 3, ... }]
// }

// Advanced filtering combinations
const seniorITStaff = collection
  .where('department', 'IT')
  .filter((user) => {
    const monthsEmployed = (new Date().getTime() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monthsEmployed > 6
  })
  .whereBetween('salary', 70000, 85000)
  .toArray()

// Sort by multiple fields
const sorted = collection
  .sortBy('department')
  .sortBy('salary', 'desc')
  .toArray()

// Transform data structure
const transformed = collection.transform<{ fullName: string, info: string }>({
  fullName: user => user.name,
  info: user => `${user.role} in ${user.department}`
})

// Pagination
const page = collection.paginate(2, 1) // 2 items per page, first page
// {
//   data: [...],
//   total: 3,
//   perPage: 2,
//   currentPage: 1,
//   lastPage: 2,
//   hasMorePages: true
// }
```

### Advanced Filtering & Pattern Matching

```typescript
interface Product {
  id: number
  name: string
  description: string
  price: number
  categories: string[]
  inStock: boolean
}

const products = collect<Product>([
  {
    id: 1,
    name: 'Premium Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1299.99,
    categories: ['electronics', 'computers'],
    inStock: true
  },
  // ... more products
])

// Fuzzy search
const searchResults = products.fuzzyMatch('name', 'laptop', 0.8)

// Regular expression matching
const matched = products.whereRegex('description', /\d+GB/)

// Complex conditional filtering
const filtered = products
  .when(true, collection =>
    collection.filter(p => p.price > 1000))
  .unless(false, collection =>
    collection.filter(p => p.inStock))

// Pattern matching with whereLike
const pattern = products.whereLike('name', '%Laptop%')
```

### Statistical Operations

```typescript
const numbers = collect([1, 2, 3, 4, 5, 6])

numbers.sum() // 21
numbers.avg() // 3.5
numbers.median() // 3.5
numbers.min() // 1
numbers.max() // 6
numbers.standardDeviation() // { population: 1.707825127659933, sample: 1.8708286933869707 }
```

### Time Series Data

```typescript
const timeData = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 150 },
  { date: '2024-01-03', value: 120 }
]

const series = collect(timeData).timeSeries({
  dateField: 'date',
  valueField: 'value',
  interval: 'day'
})

// Calculate moving average
const movingAvg = series.movingAverage({ window: 2 })
```

### Lazy Evaluation

```typescript
const huge = collect(Array.from({ length: 1000000 }, (_, i) => i))

// Operations are deferred until needed
const result = huge
  .lazy()
  .filter(n => n % 2 === 0)
  .map(n => n * 2)
  .take(5)
  .toArray()
```

### Async Operations & Batch Processing

```typescript
// Process large datasets in batches
const largeDataset = collect(Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  data: `Data ${i}`
})))

// Parallel processing with batches
await largeDataset.parallel(
  async (batch) => {
    const processed = await processItems(batch)
    return processed
  },
  { chunks: 4, maxConcurrency: 2 }
)

// Async mapping
const asyncMapped = await largeDataset
  .mapAsync(async (item) => {
    const result = await fetchDataForItem(item)
    return { ...item, ...result }
  })

// Batch processing with cursor
for await (const batch of largeDataset.cursor(100)) {
  await processBatch(batch)
}
```

### Data Validation & Sanitization

```typescript
interface UserData {
  email: string
  age: number
  username: string
}

const userData = collect<UserData>([
  { email: 'john@example.com', age: 25, username: 'john_doe' },
  { email: 'invalid-email', age: -5, username: 'admin' }
])

// Validate data
const validationResult = await userData.validate({
  email: [
    email => /^[^@]+@[^@][^.@]*\.[^@]+$/.test(email),
    email => email.length <= 255
  ],
  age: [
    age => age >= 0,
    age => age <= 120
  ],
  username: [
    username => username.length >= 3,
    username => /^\w+$/.test(username)
  ]
})

// Sanitize data
const sanitized = userData.sanitize({
  email: email => email.toLowerCase().trim(),
  age: age => Math.max(0, Math.min(120, age)),
  username: username => username.toLowerCase().replace(/\W/g, '')
})
```

### Data Analysis & Statistics

```typescript
interface SalesData {
  product: string
  revenue: number
  cost: number
  date: string
  region: string
}

const sales: SalesData[] = [
  { product: 'A', revenue: 100, cost: 50, date: '2024-01-01', region: 'North' },
  { product: 'B', revenue: 200, cost: 80, date: '2024-01-01', region: 'South' },
  { product: 'A', revenue: 150, cost: 60, date: '2024-01-02', region: 'North' },
  { product: 'B', revenue: 180, cost: 75, date: '2024-01-02', region: 'South' },
]

const salesCollection = collect(sales)

// Advanced statistical analysis
const stats = salesCollection
  .describe('revenue') // Get statistical summary
  .pluck('revenue')
  .pipe(numbers => ({
    sum: numbers.sum(),
    average: numbers.avg(),
    median: numbers.median(),
    stdDev: numbers.standardDeviation(),
    variance: numbers.variance()
  }))

// Pivot table analysis
const pivotData = salesCollection.pivotTable(
  'product', // rows
  'region', // columns
  'revenue', // values
  'sum' // aggregation method
)

// Time series analysis with moving averages
const timeSeries = salesCollection
  .timeSeries({
    dateField: 'date',
    valueField: 'revenue',
    interval: 'day'
  })
  .movingAverage({ window: 2, centered: true })

// Correlation analysis
const correlation = salesCollection.correlate('revenue', 'cost')

// Detect anomalies in revenue
const anomalies = salesCollection.detectAnomalies({
  method: 'zscore',
  threshold: 2,
  features: ['revenue']
})
```

### Performance Optimization

```typescript
// Cache expensive operations
const cached = collection
  .map(expensiveOperation)
  .cache(60000) // Cache for 60 seconds

// Lazy evaluation for large datasets
const lazy = collection
  .lazy()
  .filter(predicate)
  .map(transform)
  .take(10)

// Optimize queries with indexing
const indexed = collection
  .index(['id', 'category'])
  .where('category', 'electronics')
  .where('id', 123)

// Profile performance
const metrics = await collection.profile()
// { time: 123, memory: 456 }

// Instrumentation
collection
  .instrument(stats => console.log('Operation stats:', stats))
  .map(transform)
  .filter(predicate)
```

### Advanced Serialization

```typescript
// Export to different formats
const json = collection.toJSON({ pretty: true })
const csv = collection.toCsv()
const xml = collection.toXml()

// SQL generation
const sql = collection.toSQL('users')

// GraphQL query generation
const graphql = collection.toGraphQL('User')

// Elasticsearch bulk format
const elastic = collection.toElastic('users')

// Pandas DataFrame generation
const pandas = collection.toPandas()
```

### Type Safety

```typescript
interface Product {
  id: number
  name: string
  price: number
}

// Collection is fully typed
const products = collect<Product>([
  { id: 1, name: 'Widget', price: 9.99 }
])

// TypeScript will catch errors
products.where('invalid', 'value') // Type error!
```

For more detailed documentation and examples, please visit our documentation site.

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/ts-collect/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-starter/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Stacks OSS will always stay open-sourced, and we will always love to receive postcards from wherever Stacks is used! _And we also publish them on our website. Thank you, Spatie._

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## 📄 License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-collect?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-collect
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-collect/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-collect/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-collect/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-collect -->
