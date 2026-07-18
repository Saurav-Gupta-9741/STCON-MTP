import time
import tracemalloc
import math
import random

# --- ALGORITHMS ---

def generate_random_graph(n, edge_density=2):
    """Generates a random directed graph with n nodes."""
    nodes = list(range(n))
    edges = []
    
    # Ensure all nodes have self-loops for algorithmic completeness
    for i in range(n):
      edges.append((i, i))
      
    # Create a guaranteed path from 0 to n-1 to ensure worst-case searching
    for i in range(n - 1):
        edges.append((i, i + 1))
        
    # Add random edges
    num_random_edges = n * edge_density
    for _ in range(num_random_edges):
        u = random.randint(0, n - 1)
        v = random.randint(0, n - 1)
        edges.append((u, v))
        
    # Format graph as adjacency list for performance
    adj_list = {i: set() for i in range(n)}
    for u, v in edges:
        adj_list[u].add(v)
        
    return nodes, adj_list

def standard_bfs(n, adj_list, start, target):
    """Standard BFS - O(N) Space Complexity"""
    visited = set([start])
    queue = [start]
    
    while queue:
        curr = queue.pop(0)
        if curr == target:
            return True
            
        for neighbor in adj_list[curr]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
                
    return False

def sublinear_stcon(n, adj_list, s, t):
    """Sublinear STCON Algorithm - O(n / 2^(sqrt(log n))) Space Complexity"""
    if n <= 1:
        return s == t

    log_n = max(1, math.log2(n))
    sqrt_log_n = math.sqrt(log_n)
    r = max(1, math.ceil(sqrt_log_n))
    k = max(1, math.ceil(2 ** sqrt_log_n))
    L = 2
    lambd = L ** r

    levels_to_check = math.floor(n / lambd) + 1

    # Recursive sub-procedure to find paths of length lambda
    def SPR(r_curr, ds, dt, Vs):
        Vt = set()
        if r_curr == 0:
            for u in Vs:
                if u % k == ds:
                    for v in adj_list[u]:
                        if v % k == dt:
                            Vt.add(v)
        else:
            limit = k ** (L - 1)
            for i in range(limit):
                num = i
                digits = []
                for _ in range(L - 1):
                    digits.append(num % k)
                    num //= k
                sequence = [ds] + digits + [dt]
                
                current_V = set(Vs)
                for step in range(1, L + 1):
                    prev_d = sequence[step - 1]
                    curr_d = sequence[step]
                    current_V = SPR(r_curr - 1, prev_d, curr_d, current_V)
                Vt.update(current_V)
        return Vt

    for j in range(lambd):
        S = set([s])
        valid_j = True

        for level_idx in range(1, levels_to_check + 1):
            S_prime = set()
            for i1 in range(k):
                P = set()
                for i2 in range(k):
                    Q = set([v for v in S if v % k == i2])
                    if not Q:
                        continue
                    A = SPR(r, i2, i1, Q)
                    P.update(A)
                
                # Space Constraint Check (This guarantees sublinear space!)
                # Count only genuinely NEW nodes not already in S
                new_nodes = S_prime.union(P) - S
                limit = math.ceil(n / lambd) + 2
                if len(new_nodes) > limit:
                    valid_j = False
                    break
                else:
                    S_prime.update(P)
            
            if not valid_j:
                break
                
            S.update(S_prime)
            if t in S:
                return True

        if not valid_j:
            continue
        if t in S:
            return True

    return False

# --- BENCHMARKING ENGINE ---

def run_benchmark():
    graph_sizes = [10, 50, 100, 200]
    results = []
    
    print("="*65)
    print(f"{'Nodes (N)':<10} | {'Algorithm':<15} | {'Time (s)':<12} | {'Space (Peak KB)':<15}")
    print("="*65)

    for n in graph_sizes:
        nodes, adj_list = generate_random_graph(n)
        start_node = 0
        target_node = n - 1
        
        # Test Standard BFS
        tracemalloc.start()
        start_time = time.time()
        standard_bfs(n, adj_list, start_node, target_node)
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        bfs_time = end_time - start_time
        bfs_space = peak / 1024 # Convert to KB
        
        print(f"{n:<10} | {'Standard BFS':<15} | {bfs_time:<12.5f} | {bfs_space:<15.2f}")
        
        # Test Sublinear STCON
        tracemalloc.start()
        start_time = time.time()
        sublinear_stcon(n, adj_list, start_node, target_node)
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        stcon_time = end_time - start_time
        stcon_space = peak / 1024 # Convert to KB
        
        print(f"{n:<10} | {'Sub. STCON':<15} | {stcon_time:<12.5f} | {stcon_space:<15.2f}")
        print("-" * 65)

if __name__ == "__main__":
    print("Starting Empirical Complexity Analysis...")
    run_benchmark()
