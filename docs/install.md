# Install

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
