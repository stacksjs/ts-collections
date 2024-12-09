# Introduction

> `ts-collect`, a powerful, fully-typed collections library for TypeScript, combining Laravel's collection elegance with advanced data processing capabilities. Features lazy evaluation, statistical analysis, machine learning operations, and comprehensive data manipulation tools—all with zero dependencies.

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
