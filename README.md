# Time-Space Tradeoffs for Directed s-t Connectivity (STCON)

This repository contains an implementation and empirical analysis of the sublinear space algorithm for the Directed s-t Connectivity (STCON) problem, as described in theoretical computer science research.

## Project Overview

The standard algorithm for solving STCON is Breadth-First Search (BFS) or Depth-First Search (DFS), which requires linear space **O(n)** to store the visited nodes. For extremely massive graphs (like the internet or social networks), this linear space requirement becomes a bottleneck.

This project implements a highly advanced **Sublinear STCON Algorithm** that sacrifices some Time Complexity to achieve massive gains in Space Complexity. The memory usage is bounded by:
`O(n / 2^(sqrt(log n)))`

### Components
1. **Core Algorithm (`stcon_algorithm.py`)**: The raw Python implementation of the algorithm.
2. **Benchmark Suite (`benchmark.py`)**: An automated script to programmatically track the Space (Memory) and Time complexities against Standard BFS.
3. **Web Visualizer (`stcon-ui`)**: An interactive, React-based UI that visually proves the sublinear space claims with a live memory tracker and graph builder.

---

## Academic Analysis (Complexity)

| Metric | Standard BFS / DFS | Sublinear STCON Algorithm |
| :--- | :--- | :--- |
| **Time Complexity** | `O(n + m)` | `n^(O(2^(sqrt(log n))))` |
| **Space Complexity** | `O(n)` | `O(n / 2^(sqrt(log n)))` |

### Proof of Sublinear Space
The algorithm guarantees sublinear space by actively "forgetting" paths. Instead of keeping a queue of every visited node like BFS, it mathematically re-computes intermediate paths (`SPR` subroutine) using a recursive matrix-multiplication-like approach. By checking reachability between nodes at specific modulo distances (`k`), it strictly enforces a memory limit at every level.

---

## How to Run

### 1. Run the UI Visualizer
Navigate to the UI folder and start the dev server:
```bash
cd stcon-ui
npm run dev
```
Open `http://localhost:5173` in your browser. 
**Pro-tip for presentation:** Run the "Standard BFS" on the dense graph to watch the memory explode past the limit line, then run the "Sublinear STCON" to watch it effortlessly stay under the limit!

### 2. Run the Benchmark (Time & Space tracking)
To see the empirical data proving the memory differences:
```bash
python benchmark.py
```
This will output a formatted table comparing execution times and peak memory (in KB) for graphs of varying sizes.
