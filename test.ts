// Example usage with complex operations
interface User {
  id: number
  name: string
  age: number
  department: string
}

const users = collect<User>([
  { id: 1, name: 'John', age: 30, department: 'IT' },
  { id: 2, name: 'Jane', age: 25, department: 'HR' },
  { id: 3, name: 'Bob', age: 35, department: 'IT' },
  { id: 4, name: 'Alice', age: 28, department: 'HR' },
])

// Complex chaining example
const result = users
  .groupBy('department')
  .get('IT')
  ?.where('age', 30)
  .pluck('name')
  .first()

// Aggregation example
const avgAgeByDept = users
  .groupBy('department')
  .entries()
  .reduce((acc, [dept, users]) => {
    acc[dept] = users.avg('age')
    return acc
  }, {} as Record<string, number>)
