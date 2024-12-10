import type { CollectionOperations } from './types'
import { collect } from './collect'

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
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  )
}

/**
 * Helper function to get the next timestamp based on interval
 */
export function getNextTimestamp(date: Date, interval: 'day' | 'week' | 'month' | 'year'): number {
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

export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

// function deepEqual(a: any, b: any): boolean {
//   if (a === b)
//     return true

//   if (typeof a !== 'object' || typeof b !== 'object')
//     return false
//   if (a === null || b === null)
//     return false

//   const keysA = Object.keys(a)
//   const keysB = Object.keys(b)

//   if (keysA.length !== keysB.length)
//     return false

//   for (const key of keysA) {
//     if (!keysB.includes(key))
//       return false
//     if (!deepEqual(a[key], b[key]))
//       return false
//   }

//   return true
// }

// function getItemKey(item: any): string {
//   if ('id' in item)
//     return String(item.id)
//   return JSON.stringify(item)
// }

// Helper function for fuzzy search scoring
export function calculateFuzzyScore(query: string, value: string): number {
  if (!query || !value)
    return 0

  let score = 0
  let lastIndex = -1
  const lowerQuery = query.toLowerCase()
  const lowerValue = value.toLowerCase()
  const valueLength = lowerValue.length

  // Look ahead for transpositions
  const isTransposed = (char: string, nextChar: string, startIndex: number): number => {
    const normalIndex = lowerValue.indexOf(char, startIndex)
    const transposedIndex = lowerValue.indexOf(nextChar, startIndex)

    if (normalIndex > -1 && transposedIndex > -1) {
      // Check if characters are transposed
      if (Math.abs(normalIndex - transposedIndex) === 1) {
        return transposedIndex > normalIndex ? normalIndex : transposedIndex
      }
    }
    return -1
  }

  let i = 0
  while (i < lowerQuery.length) {
    const char = lowerQuery[i]
    const nextChar = lowerQuery[i + 1]
    let index = lowerValue.indexOf(char, lastIndex + 1)

    // Check for transpositions if we have a next character
    if (index === -1 && nextChar) {
      const transposedIndex = isTransposed(char, nextChar, lastIndex + 1)
      if (transposedIndex > -1) {
        // Found a transposition, handle both characters
        score += 1 / (transposedIndex - lastIndex || 1)
        lastIndex = transposedIndex + 1
        i += 2 // Skip next character since we handled it
        continue
      }
    }

    // If still not found, try finding the character anywhere after last match
    if (index === -1) {
      index = lowerValue.indexOf(char, lastIndex + 1)
      if (index === -1) {
        // Try one last time from the beginning in case of wrapped matches
        index = lowerValue.indexOf(char)
        if (index > -1 && index > lastIndex) {
          score += 0.5 / (index - lastIndex) // Penalized score for out-of-order match
          lastIndex = index
          i++
          continue
        }
        // Character not found at all
        i++
        continue
      }
    }

    // Calculate position-based bonus
    const positionBonus = index === 0
      ? 1.2
      : index === valueLength - 1 ? 1.1 : 1.0

    // Calculate distance-based score
    const distance = index - lastIndex
    score += (1 / (distance > 1 ? distance * 1.5 : distance)) * positionBonus

    lastIndex = index
    i++
  }

  // Apply bonuses
  if (lowerQuery === lowerValue) {
    score *= 2 // Exact match bonus
  }
  else if (query.length === value.length) {
    score *= 1.5 // Same length bonus
  }
  else if (lowerValue.startsWith(lowerQuery)) {
    score *= 1.3 // Prefix match bonus
  }

  return score
}
