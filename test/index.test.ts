import { describe, expect, it } from 'bun:test'
import { collect } from '../src/collect'

describe('Collection Core Operations', () => {
  describe('collect()', () => {
    it('should create collection from array', () => {
      const input = [1, 2, 3]
      const collection = collect(input)

      expect(collection.toArray()).toEqual(input)
      expect(collection.count()).toBe(3)
    })

    it('should create collection from iterable', () => {
      const input = new Set([1, 2, 3])
      const collection = collect(input)

      expect(collection.toArray()).toEqual([1, 2, 3])
      expect(collection.count()).toBe(3)
    })

    it('should handle empty input', () => {
      const collection = collect([])

      expect(collection.toArray()).toEqual([])
      expect(collection.count()).toBe(0)
      expect(collection.isEmpty()).toBe(true)
    })
  })

  describe('map()', () => {
    it('should transform items with index', () => {
      const collection = collect([1, 2, 3])
      const result = collection.map((item, index) => ({
        value: item,
        index,
      }))

      expect(result.toArray()).toEqual([
        { value: 1, index: 0 },
        { value: 2, index: 1 },
        { value: 3, index: 2 },
      ])
    })

    it('should handle empty collection', () => {
      const collection = collect([])
      const result = collection.map(x => x * 2)

      expect(result.toArray()).toEqual([])
      expect(result.isEmpty()).toBe(true)
    })

    it('should maintain types correctly', () => {
      interface User {
        id: number
        name: string
      }

      const users = collect<User>([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ])

      const names = users.map(user => user.name)
      const ids = users.map(user => user.id)

      expect(names.toArray()).toEqual(['John', 'Jane'])
      expect(ids.toArray()).toEqual([1, 2])
    })
  })

  describe('filter()', () => {
    it('should filter items with predicate', () => {
      const collection = collect([1, 2, 3, 4, 5])
      const result = collection.filter(num => num % 2 === 0)

      expect(result.toArray()).toEqual([2, 4])
      expect(result.count()).toBe(2)
    })

    it('should pass index to predicate', () => {
      const collection = collect(['a', 'b', 'c'])
      const evenIndices = collection.filter((_, index) => index % 2 === 0)

      expect(evenIndices.toArray()).toEqual(['a', 'c'])
    })

    it('should handle empty collection', () => {
      const collection = collect([])
      const result = collection.filter(() => true)

      expect(result.toArray()).toEqual([])
      expect(result.isEmpty()).toBe(true)
    })
  })

  describe('reduce()', () => {
    it('should reduce collection with initial value', () => {
      const collection = collect([1, 2, 3, 4])
      const sum = collection.reduce((acc, curr) => acc + curr, 0)
      const product = collection.reduce((acc, curr) => acc * curr, 1)

      expect(sum).toBe(10)
      expect(product).toBe(24)
    })

    it('should pass index to callback', () => {
      const collection = collect(['a', 'b', 'c'])
      const result = collection.reduce((acc, curr, index) => {
        return { ...acc, [curr]: index }
      }, {} as Record<string, number>)

      expect(result).toEqual({ a: 0, b: 1, c: 2 })
    })

    it('should handle empty collection', () => {
      const collection = collect([])
      const result = collection.reduce((acc, curr) => acc + curr, 0)

      expect(result).toBe(0)
    })
  })

  describe('flatMap()', () => {
    it('should flatten and map results', () => {
      const collection = collect([1, 2, 3])
      const result = collection.flatMap(x => [x, x * 2])

      expect(result.toArray()).toEqual([1, 2, 2, 4, 3, 6])
    })

    it('should handle nested arrays', () => {
      const collection = collect([[1, 2], [3, 4], [5, 6]])
      const result = collection.flatMap(arr => arr)

      expect(result.toArray()).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('should pass index to callback', () => {
      const collection = collect(['a', 'b'])
      const result = collection.flatMap((item, index) => [
        `${item}-${index}`,
        `${item}-${index + 1}`,
      ])

      expect(result.toArray()).toEqual([
        'a-0',
        'a-1',
        'b-1',
        'b-2',
      ])
    })
  })
})

describe('Collection Element Access', () => {
  describe('first()', () => {
    it('should return first element', () => {
      const collection = collect([1, 2, 3])
      expect(collection.first()).toBe(1)

      const stringCollection = collect(['a', 'b', 'c'])
      expect(stringCollection.first()).toBe('a')
    })

    it('should return undefined for empty collection', () => {
      const collection = collect([])
      expect(collection.first()).toBeUndefined()
    })

    it('should return property when key provided', () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const users = collect<User>([
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ])

      expect(users.first('name')).toBe('John')
      expect(users.first('id')).toBe(1)
      expect(users.first('email')).toBe('john@example.com')

      // Test with empty collection
      const emptyUsers = collect<User>([])
      expect(emptyUsers.first('name')).toBeUndefined()
    })
  })

  describe('last()', () => {
    it('should return last element', () => {
      const collection = collect([1, 2, 3])
      expect(collection.last()).toBe(3)

      const stringCollection = collect(['a', 'b', 'c'])
      expect(stringCollection.last()).toBe('c')
    })

    it('should return undefined for empty collection', () => {
      const collection = collect([])
      expect(collection.last()).toBeUndefined()
    })

    it('should return property when key provided', () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const users = collect<User>([
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ])

      expect(users.last('name')).toBe('Jane')
      expect(users.last('id')).toBe(2)
      expect(users.last('email')).toBe('jane@example.com')

      // Test with empty collection
      const emptyUsers = collect<User>([])
      expect(emptyUsers.last('name')).toBeUndefined()
    })
  })

  describe('nth()', () => {
    it('should return element at index', () => {
      const collection = collect(['a', 'b', 'c', 'd', 'e'])

      expect(collection.nth(0)).toBe('a')
      expect(collection.nth(2)).toBe('c')
      expect(collection.nth(4)).toBe('e')

      // Test with objects
      interface Item {
        value: number
      }
      const items = collect<Item>([
        { value: 10 },
        { value: 20 },
        { value: 30 },
      ])
      expect(items.nth(1)).toEqual({ value: 20 })
    })

    it('should return undefined for out of bounds', () => {
      const collection = collect([1, 2, 3])

      // Test negative index
      expect(collection.nth(-1)).toBeUndefined()

      // Test index equal to length
      expect(collection.nth(3)).toBeUndefined()

      // Test index greater than length
      expect(collection.nth(5)).toBeUndefined()

      // Test with empty collection
      const emptyCollection = collect([])
      expect(emptyCollection.nth(0)).toBeUndefined()
    })
  })
})

describe('Collection Aggregation Methods', () => {
  describe('sum()', () => {
    it('should sum numeric values', () => {
      const numbers = collect([1, 2, 3, 4, 5])
      expect(numbers.sum()).toBe(15)

      const decimals = collect([1.5, 2.25, 3.75])
      expect(decimals.sum()).toBe(7.5)

      // Should handle mixed numbers
      const mixed = collect([1, 2.5, 3, 4.75, 5])
      expect(mixed.sum()).toBe(16.25)

      // Should ignore NaN values
      const withNaN = collect([1, Number.NaN, 3, 4, Number.NaN])
      expect(withNaN.sum()).toBe(8)
    })

    it('should sum by key', () => {
      interface Product {
        name: string
        price: number
        quantity: number
      }

      const products = collect<Product>([
        { name: 'Apple', price: 0.5, quantity: 3 },
        { name: 'Banana', price: 0.25, quantity: 6 },
        { name: 'Orange', price: 0.75, quantity: 2 },
      ])

      expect(products.sum('price')).toBe(1.5)
      expect(products.sum('quantity')).toBe(11)

      // Test with nested NaN values
      const withNaN = collect<Product>([
        { name: 'Apple', price: Number.NaN, quantity: 3 },
        { name: 'Banana', price: 0.25, quantity: 6 },
        { name: 'Orange', price: 0.75, quantity: Number.NaN },
      ])

      expect(withNaN.sum('price')).toBe(1)
      expect(withNaN.sum('quantity')).toBe(9)
    })

    it('should handle empty collection', () => {
      const empty = collect([])
      expect(empty.sum()).toBe(0)

      interface Item {
        value: number
      }
      const emptyObjects = collect<Item>([])
      expect(emptyObjects.sum('value')).toBe(0)
    })
  })

  describe('avg()', () => {
    it('should calculate average of numbers', () => {
      const numbers = collect([2, 4, 6, 8, 10])
      expect(numbers.avg()).toBe(6)

      const decimals = collect([1.5, 2.5, 3.5])
      expect(decimals.avg()).toBe(2.5)

      // Should handle mixed numbers
      const mixed = collect([1, 2.5, 3, 4.75, 5])
      expect(mixed.avg()).toBe(3.25)

      // NaN values are counted in length but treated as 0
      const withNaN = collect([1, Number.NaN, 3, 4, Number.NaN])
      expect(withNaN.avg()).toBe(1.6) // (1 + 0 + 3 + 4 + 0) / 5 = 1.6
    })

    it('should calculate average by key', () => {
      interface Score {
        student: string
        math: number
        science: number
      }

      const scores = collect<Score>([
        { student: 'John', math: 90, science: 85 },
        { student: 'Jane', math: 95, science: 92 },
        { student: 'Bob', math: 88, science: 78 },
      ])

      expect(scores.avg('math')).toBe(91)
      expect(scores.avg('science')).toBe(85)

      // NaN values are counted in length but treated as 0
      const withNaN = collect<Score>([
        { student: 'John', math: Number.NaN, science: 85 },
        { student: 'Jane', math: 95, science: 92 },
        { student: 'Bob', math: 88, science: Number.NaN },
      ])

      expect(withNaN.avg('math')).toBe(61) // (0 + 95 + 88) / 3 = 61
      expect(withNaN.avg('science')).toBe(59) // (85 + 92 + 0) / 3 = 59
    })

    it('should handle empty collection', () => {
      const empty = collect([])
      expect(empty.avg()).toBe(0)

      interface Item {
        value: number
      }
      const emptyObjects = collect<Item>([])
      expect(emptyObjects.avg('value')).toBe(0)
    })
  })

  describe('median()', () => {
    it('should find median of odd length collection', () => {
      const numbers = collect([1, 2, 3, 4, 5])
      expect(numbers.median()).toBe(3)

      const unsorted = collect([5, 3, 1, 2, 4])
      expect(unsorted.median()).toBe(3)

      const decimals = collect([1.5, 2.5, 3.5, 4.5, 5.5])
      expect(decimals.median()).toBe(3.5)
    })

    it('should find median of even length collection', () => {
      const numbers = collect([1, 2, 3, 4])
      expect(numbers.median()).toBe(2.5)

      const unsorted = collect([4, 1, 3, 2])
      expect(numbers.median()).toBe(2.5)

      const decimals = collect([1.5, 2.5, 3.5, 4.5])
      expect(decimals.median()).toBe(3)
    })

    it('should find median by key', () => {
      interface Purchase {
        product: string
        amount: number
      }

      // Odd length
      const oddPurchases = collect<Purchase>([
        { product: 'A', amount: 10 },
        { product: 'B', amount: 20 },
        { product: 'C', amount: 30 },
        { product: 'D', amount: 40 },
        { product: 'E', amount: 50 },
      ])
      expect(oddPurchases.median('amount')).toBe(30)

      // Even length
      const evenPurchases = collect<Purchase>([
        { product: 'A', amount: 10 },
        { product: 'B', amount: 20 },
        { product: 'C', amount: 30 },
        { product: 'D', amount: 40 },
      ])
      expect(evenPurchases.median('amount')).toBe(25)

      // Unsorted data
      const unsortedPurchases = collect<Purchase>([
        { product: 'A', amount: 40 },
        { product: 'B', amount: 10 },
        { product: 'C', amount: 30 },
        { product: 'D', amount: 20 },
        { product: 'E', amount: 50 },
      ])
      expect(unsortedPurchases.median('amount')).toBe(30)

      // Empty collection
      const emptyPurchases = collect<Purchase>([])
      expect(emptyPurchases.median('amount')).toBeUndefined()
    })
  })
})

describe('Collection Grouping Operations', () => {
  describe('chunk()', () => {
    it('should create chunks of specified size', () => {
      const numbers = collect([1, 2, 3, 4, 5, 6])
      const chunks = numbers.chunk(2)

      expect(chunks.toArray()).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ])

      // Test with different size
      const chunks3 = numbers.chunk(3)
      expect(chunks3.toArray()).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ])
    })

    it('should handle remainder chunk', () => {
      const numbers = collect([1, 2, 3, 4, 5])

      // Chunk size 2 with remainder
      const chunks2 = numbers.chunk(2)
      expect(chunks2.toArray()).toEqual([
        [1, 2],
        [3, 4],
        [5],
      ])

      // Chunk size 3 with remainder
      const chunks3 = numbers.chunk(3)
      expect(chunks3.toArray()).toEqual([
        [1, 2, 3],
        [4, 5],
      ])

      // Chunk size larger than array
      const chunksLarge = numbers.chunk(10)
      expect(chunksLarge.toArray()).toEqual([[1, 2, 3, 4, 5]])
    })

    it('should throw for invalid chunk size', () => {
      const numbers = collect([1, 2, 3, 4, 5])

      expect(() => numbers.chunk(0)).toThrow('Chunk size must be greater than 0')
      expect(() => numbers.chunk(-1)).toThrow('Chunk size must be greater than 0')
    })
  })

  describe('groupBy()', () => {
    it('should group by key', () => {
      interface User {
        role: string
        name: string
        active: boolean
      }

      const users = collect<User>([
        { role: 'admin', name: 'John', active: true },
        { role: 'user', name: 'Jane', active: true },
        { role: 'admin', name: 'Mike', active: false },
        { role: 'user', name: 'Lisa', active: true },
      ])

      const groupedByRole = users.groupBy('role')

      expect(Array.from(groupedByRole.get('admin')?.toArray() || [])).toEqual([
        { role: 'admin', name: 'John', active: true },
        { role: 'admin', name: 'Mike', active: false },
      ])

      expect(Array.from(groupedByRole.get('user')?.toArray() || [])).toEqual([
        { role: 'user', name: 'Jane', active: true },
        { role: 'user', name: 'Lisa', active: true },
      ])

      // Group by boolean field
      const groupedByActive = users.groupBy('active')
      expect(Array.from(groupedByActive.get(true)?.toArray() || [])).toHaveLength(3)
      expect(Array.from(groupedByActive.get(false)?.toArray() || [])).toHaveLength(1)
    })

    it('should group by callback', () => {
      const numbers = collect([1, 2, 3, 4, 5, 6])
      const grouped = numbers.groupBy(num => num % 2 === 0 ? 'even' : 'odd')

      expect(Array.from(grouped.get('even')?.toArray() || [])).toEqual([2, 4, 6])
      expect(Array.from(grouped.get('odd')?.toArray() || [])).toEqual([1, 3, 5])

      // More complex callback
      interface Person {
        name: string
        age: number
      }

      const people = collect<Person>([
        { name: 'John', age: 25 },
        { name: 'Jane', age: 32 },
        { name: 'Bob', age: 18 },
        { name: 'Alice', age: 45 },
      ])

      const groupedByAgeRange = people.groupBy((person) => {
        if (person.age < 20)
          return 'teenager'
        if (person.age < 30)
          return 'twenties'
        if (person.age < 40)
          return 'thirties'
        return 'forties+'
      })

      expect(Array.from(groupedByAgeRange.get('teenager')?.toArray() || [])).toHaveLength(1)
      expect(Array.from(groupedByAgeRange.get('twenties')?.toArray() || [])).toHaveLength(1)
      expect(Array.from(groupedByAgeRange.get('thirties')?.toArray() || [])).toHaveLength(1)
      expect(Array.from(groupedByAgeRange.get('forties+')?.toArray() || [])).toHaveLength(1)
    })

    it('should handle empty collection', () => {
      interface User {
        role: string
        name: string
      }

      const emptyCollection = collect<User>([])
      const groupedByKey = emptyCollection.groupBy('role')
      const groupedByCallback = emptyCollection.groupBy(user => user.role)

      expect(groupedByKey.size).toBe(0)
      expect(groupedByCallback.size).toBe(0)
    })
  })

  describe('partition()', () => {
    it('should split collection by predicate', () => {
      const numbers = collect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const [evens, odds] = numbers.partition(num => num % 2 === 0)

      expect(evens.toArray()).toEqual([2, 4, 6, 8, 10])
      expect(odds.toArray()).toEqual([1, 3, 5, 7, 9])

      // Test with objects
      interface User {
        name: string
        active: boolean
      }

      const users = collect<User>([
        { name: 'John', active: true },
        { name: 'Jane', active: false },
        { name: 'Bob', active: true },
        { name: 'Alice', active: false },
      ])

      const [active, inactive] = users.partition(user => user.active)
      expect(active.toArray()).toEqual([
        { name: 'John', active: true },
        { name: 'Bob', active: true },
      ])
      expect(inactive.toArray()).toEqual([
        { name: 'Jane', active: false },
        { name: 'Alice', active: false },
      ])
    })

    it('should handle empty collection', () => {
      const empty = collect([])
      const [truthy, falsy] = empty.partition(item => Boolean(item))

      expect(truthy.toArray()).toEqual([])
      expect(falsy.toArray()).toEqual([])

      // Test with typed empty collection
      interface User {
        name: string
        active: boolean
      }

      const emptyUsers = collect<User>([])
      const [active, inactive] = emptyUsers.partition(user => user.active)

      expect(active.toArray()).toEqual([])
      expect(inactive.toArray()).toEqual([])
    })
  })
})

describe('Collection Filtering Methods', () => {
  // Test data interfaces
  interface User {
    id: number
    name: string
    age: number | null
    role: string
    metadata?: {
      lastLogin?: string
      score?: number
    }
  }

  interface Product {
    id: number
    name: string
    price: number
    stock: number
    categories: string[]
  }

  describe('where()', () => {
    it('should filter by key-value pair', () => {
      const users = collect([
        { id: 1, name: 'John', age: 25, role: 'admin' },
        { id: 2, name: 'Jane', age: 30, role: 'user' },
        { id: 3, name: 'Bob', age: 25, role: 'user' },
        { id: 4, name: 'Alice', age: 35, role: 'admin' },
      ])

      // Test with string value
      const admins = users.where('role', 'admin')
      expect(admins.count()).toBe(2)
      expect(admins.pluck('name').toArray()).toEqual(['John', 'Alice'])

      // Test with number value
      const age25 = users.where('age', 25)
      expect(age25.count()).toBe(2)
      expect(age25.pluck('name').toArray()).toEqual(['John', 'Bob'])

      // Test with objects (without nested property access)
      const usersWithMeta = collect([
        { id: 1, name: 'John', score: 100 },
        { id: 2, name: 'Jane', score: 85 },
        { id: 3, name: 'Bob', score: 100 },
      ])

      const highScore = usersWithMeta.where('score', 100)
      expect(highScore.count()).toBe(2)
      expect(highScore.pluck('name').toArray()).toEqual(['John', 'Bob'])
    })

    it('should handle non-existent key', () => {
      const users = collect([
        { id: 1, name: 'John', age: 25, role: 'admin' },
        { id: 2, name: 'Jane', age: 30, role: 'user' },
      ])

      // Test with non-existent key
      const result = users.where('nonexistent' as any, 'value')
      expect(result.isEmpty()).toBe(true)
    })

    it('should handle edge cases', () => {
      interface User {
        id: number
        name: string
        age: number | null
        role: string
      }

      const users = collect<User>([
        { id: 1, name: 'John', age: null, role: 'admin' },
        { id: 2, name: 'Jane', age: 30, role: 'user' },
        { id: 3, name: 'Bob', age: 0, role: 'user' },
        { id: 4, name: '', role: 'admin', age: 25 },
      ])

      // Test with null value
      const nullAge = users.where('age', null)
      const nullUser = nullAge.first()
      expect(nullUser?.name).toBe('John')

      // Test with zero value
      const zeroAge = users.where('age', 0)
      const zeroUser = zeroAge.first()
      expect(zeroUser?.name).toBe('Bob')

      // Test with empty string
      const emptyName = users.where('name', '')
      const emptyUser = emptyName.first()
      expect(emptyUser?.id).toBe(4)

      // Additional type-safe tests
      const adminRole = users.where('role', 'admin').first()
      const adminName = users.where('role', 'admin').first('name')
      expect(adminRole?.name).toBe('John')
      expect(adminName).toBe('John')
    })
  })

  describe('whereIn()', () => {
    it('should filter by value list', () => {
      const products = collect([
        { id: 1, name: 'Apple', price: 0.5, stock: 100, category: 'fruit' },
        { id: 2, name: 'Banana', price: 0.3, stock: 150, category: 'fruit' },
        { id: 3, name: 'Carrot', price: 0.4, stock: 80, category: 'vegetable' },
        { id: 4, name: 'Donut', price: 1.0, stock: 50, category: 'bakery' },
      ])

      // Test with numbers
      const selectedIds = products.whereIn('id', [1, 3])
      expect(selectedIds.count()).toBe(2)
      expect(selectedIds.pluck('name').toArray()).toEqual(['Apple', 'Carrot'])

      // Test with strings
      const selectedNames = products.whereIn('name', ['Apple', 'Banana', 'NonExistent'])
      expect(selectedNames.count()).toBe(2)
      expect(selectedNames.pluck('price').toArray()).toEqual([0.5, 0.3])

      // Test with categories
      const fruitAndBakery = products.whereIn('category', ['fruit', 'bakery'])
      expect(fruitAndBakery.count()).toBe(3)
      expect(fruitAndBakery.pluck('name').toArray()).toEqual(['Apple', 'Banana', 'Donut'])
    })

    it('should handle empty value list', () => {
      const products = collect([
        { id: 1, name: 'Apple', price: 0.5, stock: 100, category: 'fruit' },
        { id: 2, name: 'Banana', price: 0.3, stock: 150, category: 'fruit' },
      ])

      // Test with empty array
      const emptyResult = products.whereIn('id', [])
      expect(emptyResult.isEmpty()).toBe(true)
    })

    it('should handle edge cases', () => {
      const users = collect([
        { id: 1, name: 'John', age: null, role: 'admin' },
        { id: 2, name: 'Jane', age: 30, role: 'user' },
        { id: 3, name: 'Bob', age: 0, role: 'user' },
        { id: 4, name: '', role: 'admin', age: 25 },
      ])

      // Test with null values in list
      const withNull = users.whereIn('age', [null, 30])
      expect(withNull.count()).toBe(2)
      expect(withNull.pluck('name').toArray()).toEqual(['John', 'Jane'])

      // Test with zero in list
      const withZero = users.whereIn('age', [0, 25])
      expect(withZero.count()).toBe(2)
      expect(withZero.pluck('name').toArray()).toEqual(['Bob', ''])

      // Test with empty string in list
      const withEmpty = users.whereIn('name', ['', 'John'])
      expect(withEmpty.count()).toBe(2)
    })
  })

  describe('whereBetween()', () => {
    it('should filter values within range', () => {
      const products = collect<Product>([
        { id: 1, name: 'Apple', price: 0.5, stock: 100, categories: ['fruit'] },
        { id: 2, name: 'Banana', price: 0.3, stock: 150, categories: ['fruit'] },
        { id: 3, name: 'Carrot', price: 0.4, stock: 80, categories: ['vegetable'] },
        { id: 4, name: 'Donut', price: 1.0, stock: 50, categories: ['bakery'] },
      ])

      // Test with integers
      const stockBetween = products.whereBetween('stock', 75, 125)
      expect(stockBetween.count()).toBe(2)
      expect(stockBetween.pluck('name').toArray()).toEqual(['Apple', 'Carrot'])

      // Test with decimals
      const priceBetween = products.whereBetween('price', 0.3, 0.5)
      expect(priceBetween.count()).toBe(3)
      expect(priceBetween.pluck('name').toArray()).toEqual(['Apple', 'Banana', 'Carrot'])
    })

    it('should include boundary values', () => {
      const users = collect<User>([
        { id: 1, name: 'John', age: 20, role: 'user' },
        { id: 2, name: 'Jane', age: 25, role: 'user' },
        { id: 3, name: 'Bob', age: 30, role: 'user' },
        { id: 4, name: 'Alice', age: 35, role: 'user' },
      ])

      // Test inclusive boundaries
      const ageBetween = users.whereBetween('age', 25, 30)
      expect(ageBetween.count()).toBe(2)
      expect(ageBetween.pluck('name').toArray()).toEqual(['Jane', 'Bob'])
    })

    it('should handle edge cases', () => {
      const products = collect<Product>([
        { id: 1, name: 'A', price: 0, stock: 100, categories: ['fruit'] },
        { id: 2, name: 'B', price: -1, stock: 150, categories: ['fruit'] },
        { id: 3, name: 'C', price: 1, stock: 80, categories: ['vegetable'] },
      ])

      // Test with zero boundary
      const priceAroundZero = products.whereBetween('price', -1, 0)
      expect(priceAroundZero.count()).toBe(2)

      // Test with same min and max
      const exactPrice = products.whereBetween('price', 1, 1)
      expect(exactPrice.count()).toBe(1)
      expect(exactPrice.first()?.name).toBe('C')

      // Test with inverted range
      const invertedRange = products.whereBetween('price', 1, -1)
      expect(invertedRange.isEmpty()).toBe(true)
    })

    it('should handle floating point precision', () => {
      const items = collect([
        { value: 0.1 + 0.2 }, // JavaScript floating point fun: 0.30000000000000004
        { value: 0.3 },
        { value: 0.4 },
      ])

      const between = items.whereBetween('value', 0.3, 0.35)
      expect(between.count()).toBe(2) // Should include both 0.30000000000000004 and 0.3
    })
  })
})

// describe('Collection Sorting Methods', () => {
//   describe('sort()', () => {
//     it('should sort with compare function', () => expect(true).toBe(true))
//     it('should sort numbers by default', () => expect(true).toBe(true))
//     it('should handle empty collection', () => expect(true).toBe(true))
//   })

//   describe('sortBy()', () => {
//     it('should sort by key ascending', () => expect(true).toBe(true))
//     it('should sort by key descending', () => expect(true).toBe(true))
//     it('should handle non-existent key', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Set Operations', () => {
//   describe('unique()', () => {
//     it('should remove duplicates', () => expect(true).toBe(true))
//     it('should remove duplicates by key', () => expect(true).toBe(true))
//     it('should handle empty collection', () => expect(true).toBe(true))
//   })

//   describe('intersect()', () => {
//     it('should find common elements', () => expect(true).toBe(true))
//     it('should work with array input', () => expect(true).toBe(true))
//     it('should handle empty input', () => expect(true).toBe(true))
//   })

//   describe('union()', () => {
//     it('should combine unique elements', () => expect(true).toBe(true))
//     it('should work with array input', () => expect(true).toBe(true))
//     it('should handle empty input', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Utility Methods', () => {
//   describe('tap()', () => {
//     it('should execute callback and return collection', () => expect(true).toBe(true))
//     it('should not modify collection', () => expect(true).toBe(true))
//   })

//   describe('pipe()', () => {
//     it('should transform collection with callback', () => expect(true).toBe(true))
//     it('should handle complex transformations', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Async Operations', () => {
//   describe('mapAsync()', () => {
//     it('should transform items asynchronously', () => expect(true).toBe(true))
//     it('should maintain order', () => expect(true).toBe(true))
//     it('should handle rejections', () => expect(true).toBe(true))
//   })

//   describe('filterAsync()', () => {
//     it('should filter items asynchronously', () => expect(true).toBe(true))
//     it('should handle async predicates', () => expect(true).toBe(true))
//     it('should handle rejections', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Advanced Features', () => {
//   describe('timeSeries()', () => {
//     it('should create time series data', () => expect(true).toBe(true))
//     it('should fill gaps correctly', () => expect(true).toBe(true))
//     it('should handle different intervals', () => expect(true).toBe(true))
//   })

//   describe('movingAverage()', () => {
//     it('should calculate moving average', () => expect(true).toBe(true))
//     it('should handle different window sizes', () => expect(true).toBe(true))
//     it('should support centered option', () => expect(true).toBe(true))
//   })
// })

// describe('Collection ML Operations', () => {
//   describe('kmeans()', () => {
//     it('should cluster data points', () => expect(true).toBe(true))
//     it('should handle different distance metrics', () => expect(true).toBe(true))
//     it('should respect max iterations', () => expect(true).toBe(true))
//   })

//   describe('linearRegression()', () => {
//     it('should calculate regression coefficients', () => expect(true).toBe(true))
//     it('should calculate R-squared', () => expect(true).toBe(true))
//     it('should handle multiple independents', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Serialization', () => {
//   describe('toJSON()', () => {
//     it('should serialize to JSON string', () => expect(true).toBe(true))
//     it('should handle circular references', () => expect(true).toBe(true))
//     it('should respect serialization options', () => expect(true).toBe(true))
//   })

//   describe('toCsv()', () => {
//     it('should convert to CSV format', () => expect(true).toBe(true))
//     it('should handle nested objects', () => expect(true).toBe(true))
//     it('should escape special characters', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Performance Features', () => {
//   describe('cache()', () => {
//     it('should cache results', () => expect(true).toBe(true))
//     it('should respect TTL', () => expect(true).toBe(true))
//     it('should handle cache invalidation', () => expect(true).toBe(true))
//   })

//   describe('lazy()', () => {
//     it('should create lazy collection', () => expect(true).toBe(true))
//     it('should defer execution', () => expect(true).toBe(true))
//     it('should support chaining', () => expect(true).toBe(true))
//   })
// })

// describe('Advanced Transformations', () => {
//   describe('mapToGroups()', () => {
//     it('should map items to groups', () => expect(true).toBe(true))
//     it('should handle complex group mappings', () => expect(true).toBe(true))
//   })

//   describe('mapSpread()', () => {
//     it('should spread arguments to callback', () => expect(true).toBe(true))
//     it('should handle arrays and objects', () => expect(true).toBe(true))
//   })

//   describe('mapUntil()', () => {
//     it('should map until predicate is true', () => expect(true).toBe(true))
//     it('should handle early termination', () => expect(true).toBe(true))
//   })

//   describe('mapOption()', () => {
//     it('should filter out null/undefined values', () => expect(true).toBe(true))
//     it('should transform remaining values', () => expect(true).toBe(true))
//   })
// })

// describe('String Operations', () => {
//   describe('join()', () => {
//     it('should join string collections', () => expect(true).toBe(true))
//     it('should use custom separator', () => expect(true).toBe(true))
//   })

//   describe('implode()', () => {
//     it('should join by key', () => expect(true).toBe(true))
//     it('should use custom separator', () => expect(true).toBe(true))
//   })

//   describe('lower()', () => {
//     it('should convert to lowercase', () => expect(true).toBe(true))
//   })

//   describe('upper()', () => {
//     it('should convert to uppercase', () => expect(true).toBe(true))
//   })

//   describe('slug()', () => {
//     it('should create URL-friendly slug', () => expect(true).toBe(true))
//     it('should handle special characters', () => expect(true).toBe(true))
//   })
// })

// describe('Set Operations', () => {
//   describe('symmetricDiff()', () => {
//     it('should find symmetric difference', () => expect(true).toBe(true))
//     it('should work with collections and arrays', () => expect(true).toBe(true))
//   })

//   describe('cartesianProduct()', () => {
//     it('should compute cartesian product', () => expect(true).toBe(true))
//     it('should handle empty collections', () => expect(true).toBe(true))
//   })

//   describe('power()', () => {
//     it('should compute power set', () => expect(true).toBe(true))
//     it('should include empty set', () => expect(true).toBe(true))
//   })
// })

// describe('Advanced Math Operations', () => {
//   describe('zscore()', () => {
//     it('should calculate z-scores', () => expect(true).toBe(true))
//     it('should handle key parameter', () => expect(true).toBe(true))
//   })

//   describe('kurtosis()', () => {
//     it('should calculate kurtosis', () => expect(true).toBe(true))
//     it('should handle key parameter', () => expect(true).toBe(true))
//   })

//   describe('skewness()', () => {
//     it('should calculate skewness', () => expect(true).toBe(true))
//     it('should handle key parameter', () => expect(true).toBe(true))
//   })

//   describe('covariance()', () => {
//     it('should calculate covariance', () => expect(true).toBe(true))
//     it('should handle different keys', () => expect(true).toBe(true))
//   })

//   describe('entropy()', () => {
//     it('should calculate entropy', () => expect(true).toBe(true))
//     it('should handle key parameter', () => expect(true).toBe(true))
//   })

//   describe('fft()', () => {
//     it('should compute FFT for number collections', () => expect(true).toBe(true))
//     it('should throw for non-number collections', () => expect(true).toBe(true))
//   })

//   describe('interpolate()', () => {
//     it('should interpolate values', () => expect(true).toBe(true))
//     it('should handle different point counts', () => expect(true).toBe(true))
//   })

//   describe('convolve()', () => {
//     it('should convolve with kernel', () => expect(true).toBe(true))
//     it('should handle different kernel sizes', () => expect(true).toBe(true))
//   })

//   describe('differentiate()', () => {
//     it('should compute derivative', () => expect(true).toBe(true))
//     it('should handle numeric collections', () => expect(true).toBe(true))
//   })

//   describe('integrate()', () => {
//     it('should compute integral', () => expect(true).toBe(true))
//     it('should handle numeric collections', () => expect(true).toBe(true))
//   })
// })

// describe('Text Analysis', () => {
//   describe('sentiment()', () => {
//     it('should analyze sentiment', () => expect(true).toBe(true))
//     it('should calculate comparative score', () => expect(true).toBe(true))
//   })

//   describe('wordFrequency()', () => {
//     it('should count word occurrences', () => expect(true).toBe(true))
//     it('should handle case sensitivity', () => expect(true).toBe(true))
//   })

//   describe('ngrams()', () => {
//     it('should generate n-grams', () => expect(true).toBe(true))
//     it('should handle different n values', () => expect(true).toBe(true))
//   })
// })

// describe('Data Quality Operations', () => {
//   describe('detectAnomalies()', () => {
//     it('should detect using z-score method', () => expect(true).toBe(true))
//     it('should detect using IQR method', () => expect(true).toBe(true))
//     it('should detect using isolation forest', () => expect(true).toBe(true))
//   })

//   describe('impute()', () => {
//     it('should impute using mean', () => expect(true).toBe(true))
//     it('should impute using median', () => expect(true).toBe(true))
//     it('should impute using mode', () => expect(true).toBe(true))
//   })

//   describe('normalize()', () => {
//     it('should normalize using min-max', () => expect(true).toBe(true))
//     it('should normalize using z-score', () => expect(true).toBe(true))
//   })

//   describe('removeOutliers()', () => {
//     it('should remove statistical outliers', () => expect(true).toBe(true))
//     it('should handle custom threshold', () => expect(true).toBe(true))
//   })
// })

// describe('Type Operations', () => {
//   describe('as()', () => {
//     it('should cast to new type', () => expect(true).toBe(true))
//     it('should handle type constraints', () => expect(true).toBe(true))
//   })

//   describe('pick()', () => {
//     it('should pick specified keys', () => expect(true).toBe(true))
//     it('should handle missing keys', () => expect(true).toBe(true))
//   })

//   describe('omit()', () => {
//     it('should omit specified keys', () => expect(true).toBe(true))
//     it('should handle missing keys', () => expect(true).toBe(true))
//   })

//   describe('transform()', () => {
//     it('should transform using schema', () => expect(true).toBe(true))
//     it('should handle complex transformations', () => expect(true).toBe(true))
//   })
// })

// describe('Specialized Data Types', () => {
//   describe('geoDistance()', () => {
//     it('should calculate distances in km', () => expect(true).toBe(true))
//     it('should calculate distances in miles', () => expect(true).toBe(true))
//   })

//   describe('money()', () => {
//     it('should format as currency', () => expect(true).toBe(true))
//     it('should handle different currencies', () => expect(true).toBe(true))
//   })

//   describe('dateTime()', () => {
//     it('should format dates', () => expect(true).toBe(true))
//     it('should handle different locales', () => expect(true).toBe(true))
//   })
// })

// describe('Database-like Operations', () => {
//   describe('query()', () => {
//     it('should handle SQL-like queries', () => expect(true).toBe(true))
//     it('should support parameterized queries', () => expect(true).toBe(true))
//   })

//   describe('having()', () => {
//     it('should filter grouped results', () => expect(true).toBe(true))
//     it('should support different operators', () => expect(true).toBe(true))
//   })

//   describe('crossJoin()', () => {
//     it('should perform cross join', () => expect(true).toBe(true))
//     it('should handle empty collections', () => expect(true).toBe(true))
//   })

//   describe('leftJoin()', () => {
//     it('should perform left join', () => expect(true).toBe(true))
//     it('should handle missing matches', () => expect(true).toBe(true))
//   })
// })

// describe('Export Operations', () => {
//   describe('toSQL()', () => {
//     it('should generate SQL insert statement', () => expect(true).toBe(true))
//     it('should handle complex data types', () => expect(true).toBe(true))
//   })

//   describe('toGraphQL()', () => {
//     it('should generate GraphQL query', () => expect(true).toBe(true))
//     it('should handle nested structures', () => expect(true).toBe(true))
//   })

//   describe('toElastic()', () => {
//     it('should format for Elasticsearch', () => expect(true).toBe(true))
//     it('should handle bulk operations', () => expect(true).toBe(true))
//   })

//   describe('toPandas()', () => {
//     it('should generate pandas DataFrame code', () => expect(true).toBe(true))
//     it('should handle complex data structures', () => expect(true).toBe(true))
//   })
// })

// describe('Streaming Operations', () => {
//   describe('stream()', () => {
//     it('should create readable stream', () => expect(true).toBe(true))
//     it('should handle backpressure', () => expect(true).toBe(true))
//   })

//   describe('fromStream()', () => {
//     it('should collect from stream', () => expect(true).toBe(true))
//     it('should handle stream errors', () => expect(true).toBe(true))
//   })

//   describe('batch()', () => {
//     it('should process in batches', () => expect(true).toBe(true))
//     it('should handle custom batch sizes', () => expect(true).toBe(true))
//   })
// })

// describe('Performance Monitoring', () => {
//   describe('metrics()', () => {
//     it('should collect performance metrics', () => expect(true).toBe(true))
//     it('should track memory usage', () => expect(true).toBe(true))
//   })

//   describe('profile()', () => {
//     it('should measure execution time', () => expect(true).toBe(true))
//     it('should measure memory usage', () => expect(true).toBe(true))
//   })

//   describe('instrument()', () => {
//     it('should track operation counts', () => expect(true).toBe(true))
//     it('should provide performance stats', () => expect(true).toBe(true))
//   })
// })

// describe('Development Tools', () => {
//   describe('playground()', () => {
//     it('should initialize playground', () => expect(true).toBe(true))
//   })

//   describe('explain()', () => {
//     it('should explain operation pipeline', () => expect(true).toBe(true))
//   })

//   describe('benchmark()', () => {
//     it('should benchmark operations', () => expect(true).toBe(true))
//     it('should calculate complexity', () => expect(true).toBe(true))
//   })
// })

// describe('Version Control', () => {
//   describe('diff()', () => {
//     it('should compare versions', () => expect(true).toBe(true))
//     it('should detect changes', () => expect(true).toBe(true))
//   })

//   describe('diffSummary()', () => {
//     it('should summarize changes', () => expect(true).toBe(true))
//     it('should count modifications', () => expect(true).toBe(true))
//   })
// })

// describe('Parallel Processing', () => {
//   describe('parallel()', () => {
//     it('should process in parallel', () => expect(true).toBe(true))
//     it('should respect concurrency limits', () => expect(true).toBe(true))
//   })

//   describe('prefetch()', () => {
//     it('should prefetch results', () => expect(true).toBe(true))
//     it('should cache prefetched data', () => expect(true).toBe(true))
//   })
// })

// describe('Cache and Memoization', () => {
//   describe('cacheStore', () => {
//     it('should store cache entries', () => expect(true).toBe(true))
//     it('should respect cache entry expiry', () => expect(true).toBe(true))
//   })
// })

// describe('Conditional Operations', () => {
//   describe('when()', () => {
//     it('should execute when condition is true', () => expect(true).toBe(true))
//     it('should skip when condition is false', () => expect(true).toBe(true))
//   })

//   describe('unless()', () => {
//     it('should execute when condition is false', () => expect(true).toBe(true))
//     it('should skip when condition is true', () => expect(true).toBe(true))
//   })
// })

// describe('Navigation and Paging', () => {
//   describe('forPage()', () => {
//     it('should return specific page', () => expect(true).toBe(true))
//     it('should handle out of bounds pages', () => expect(true).toBe(true))
//   })

//   describe('cursor()', () => {
//     it('should create async iterator', () => expect(true).toBe(true))
//     it('should respect chunk size', () => expect(true).toBe(true))
//   })
// })

// describe('Fuzzy Matching', () => {
//   describe('calculateFuzzyScore()', () => {
//     it('should calculate similarity score', () => expect(true).toBe(true))
//     it('should handle empty strings', () => expect(true).toBe(true))
//   })

//   describe('levenshteinDistance()', () => {
//     it('should calculate edit distance', () => expect(true).toBe(true))
//     it('should handle empty strings', () => expect(true).toBe(true))
//   })
// })

// describe('Machine Learning Utilities', () => {
//   describe('randomSplit()', () => {
//     it('should split data for isolation forest', () => expect(true).toBe(true))
//     it('should respect max depth', () => expect(true).toBe(true))
//   })

//   describe('distance()', () => {
//     it('should calculate distance for KNN', () => expect(true).toBe(true))
//     it('should handle different feature sets', () => expect(true).toBe(true))
//   })
// })

// describe('Type Handling', () => {
//   describe('KeyType', () => {
//     it('should enforce matching key types', () => expect(true).toBe(true))
//     it('should handle type constraints', () => expect(true).toBe(true))
//   })
// })

// describe('Geographic Calculations', () => {
//   describe('haversine()', () => {
//     it('should calculate great circle distance', () => expect(true).toBe(true))
//     it('should handle different units', () => expect(true).toBe(true))
//   })
// })

// describe('Collection Core', () => {
//   describe('createCollectionOperations()', () => {
//     it('should create new collection operations', () => expect(true).toBe(true))
//     it('should initialize with correct state', () => expect(true).toBe(true))
//     it('should maintain type safety', () => expect(true).toBe(true))
//   })
// })
