-- ============================================================================
-- AI Interview Platform — Database Initialization Script
-- PostgreSQL 15+
-- ============================================================================

-- 1. Create database and user (run as superuser)
-- CREATE USER interview_user WITH PASSWORD 'SecurePass123!';
-- CREATE DATABASE interview_platform OWNER interview_user;
-- GRANT ALL PRIVILEGES ON DATABASE interview_platform TO interview_user;

-- Connect to interview_platform database before running the rest

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('guest', 'candidate', 'hr');
CREATE TYPE interview_status AS ENUM ('created', 'task_active', 'evaluating', 'adapting', 'completed', 'cancelled');
CREATE TYPE difficulty_level AS ENUM ('junior', 'middle', 'senior');
CREATE TYPE task_domain AS ENUM (
    'arrays', 'strings', 'trees', 'graphs', 'dynamic_programming',
    'sorting', 'hash_tables', 'linked_lists', 'recursion', 'math'
);

-- ============================================================================
-- 3. TABLES
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'candidate',
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    domain task_domain NOT NULL,
    level difficulty_level NOT NULL,
    description TEXT NOT NULL,
    skeleton_code TEXT,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    reference_solution TEXT NOT NULL,
    visible_tests JSONB NOT NULL,
    hidden_tests JSONB NOT NULL,
    constraints TEXT,
    time_limit_seconds INTEGER DEFAULT 10,
    memory_limit_mb INTEGER DEFAULT 256,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status interview_status DEFAULT 'created',
    level difficulty_level NOT NULL,
    total_score FLOAT DEFAULT 0.0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    ai_summary TEXT,
    ai_recommendation VARCHAR(50)
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES task_templates(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    domain task_domain NOT NULL,
    level difficulty_level NOT NULL,
    visible_tests JSONB NOT NULL,
    hidden_tests JSONB NOT NULL,
    reference_solution TEXT,
    order_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'python',
    passed_visible INTEGER DEFAULT 0,
    total_visible INTEGER DEFAULT 0,
    passed_hidden INTEGER DEFAULT 0,
    total_hidden INTEGER DEFAULT 0,
    score FLOAT DEFAULT 0.0,
    execution_time_ms INTEGER,
    stdout TEXT,
    stderr TEXT,
    is_final BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    task_id INTEGER REFERENCES tasks(id),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id),
    event_type VARCHAR(50) NOT NULL,
    data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE anticheat_events (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity FLOAT DEFAULT 0.0,
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_interviews_user_id ON interviews(user_id);
CREATE INDEX ix_interviews_status ON interviews(status);
CREATE INDEX ix_tasks_interview_id ON tasks(interview_id);
CREATE INDEX ix_submissions_task_id ON submissions(task_id);
CREATE INDEX ix_chat_messages_interview_id ON chat_messages(interview_id);
CREATE INDEX ix_metrics_interview_id ON metrics(interview_id);
CREATE INDEX ix_anticheat_events_interview_id ON anticheat_events(interview_id);

-- ============================================================================
-- 5. SEED DATA — HR accounts and employees
-- ============================================================================
-- Passwords are bcrypt hashes. All passwords listed in comments.

-- HR: hr@company.ru / HrAdmin2024!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('hr@company.ru', '$2b$12$LJ3N7gXk0rFz1qYbK5E8kuYxVfJ8sMVqfN3GzHd7VmPpWbDqXhXWe', 'hr', 'Иванова Мария Петровна', '+7-495-123-4567');

-- HR 2: hr2@company.ru / HrManager2024!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('hr2@company.ru', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'hr', 'Смирнов Алексей Дмитриевич', '+7-495-234-5678');

-- ============================================================================
-- 6. SEED DATA — Candidate accounts (for demo/testing)
-- ============================================================================

-- Candidate 1: candidate1@mail.ru / Candidate1Pass!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('candidate1@mail.ru', '$2b$12$Wf0X8FQ3d0gTLvH5nK3jZOQzXQ3F5VqR2eN8mK9pL4sT6uW8xY0bC', 'candidate', 'Петров Дмитрий Сергеевич', '+7-916-111-2233');

-- Candidate 2: candidate2@mail.ru / Candidate2Pass!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('candidate2@mail.ru', '$2b$12$Kf0X8FQ3d0gTLvH5nK3jZOQzXQ3F5VqR2eN8mK9pL4sT6uW8xY0aC', 'candidate', 'Сидорова Елена Александровна', '+7-926-333-4455');

-- Candidate 3: candidate3@gmail.com / Candidate3Pass!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('candidate3@gmail.com', '$2b$12$Mf0X8FQ3d0gTLvH5nK3jZOQzXQ3F5VqR2eN8mK9pL4sT6uW8xY0dE', 'candidate', 'Козлов Андрей Викторович', '+7-903-555-6677');

-- Candidate 4: candidate4@yandex.ru / Candidate4Pass!
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('candidate4@yandex.ru', '$2b$12$Nf0X8FQ3d0gTLvH5nK3jZOQzXQ3F5VqR2eN8mK9pL4sT6uW8xY0fG', 'candidate', 'Новикова Анна Игоревна', '+7-915-777-8899');

-- ============================================================================
-- 7. SEED DATA — Task Templates (bank of 25 templates)
-- ============================================================================

INSERT INTO task_templates (title, domain, level, description, skeleton_code, input_format, output_format, reference_solution, visible_tests, hidden_tests, constraints) VALUES

-- === JUNIOR: Arrays ===
('Сумма элементов массива', 'arrays', 'junior',
'Дан массив целых чисел. Найдите сумму всех элементов массива.',
'def solve(arr):
    # Ваш код здесь
    pass',
'Первая строка — количество элементов n. Вторая строка — n целых чисел через пробел.',
'Одно число — сумма элементов.',
'def solve(arr):
    return sum(arr)

n = int(input())
arr = list(map(int, input().split()))
print(solve(arr))',
'[{"input": "5\n1 2 3 4 5", "expected": "15"}, {"input": "3\n-1 0 1", "expected": "0"}]',
'[{"input": "1\n42", "expected": "42"}, {"input": "4\n0 0 0 0", "expected": "0"}, {"input": "3\n1000000 1000000 1000000", "expected": "3000000"}]',
'1 ≤ n ≤ 10^5, |a_i| ≤ 10^6'),

-- === JUNIOR: Arrays — Max element ===
('Максимальный элемент', 'arrays', 'junior',
'Дан массив целых чисел. Найдите максимальный элемент.',
'n = int(input())
arr = list(map(int, input().split()))
# Ваш код здесь',
'Первая строка — n. Вторая строка — n чисел.',
'Максимальный элемент.',
'n = int(input())
arr = list(map(int, input().split()))
print(max(arr))',
'[{"input": "5\n3 1 4 1 5", "expected": "5"}, {"input": "3\n-1 -2 -3", "expected": "-1"}]',
'[{"input": "1\n0", "expected": "0"}, {"input": "4\n100 100 100 100", "expected": "100"}]',
'1 ≤ n ≤ 10^5'),

-- === JUNIOR: Strings ===
('Палиндром', 'strings', 'junior',
'Дана строка. Определите, является ли она палиндромом (читается одинаково слева направо и справа налево). Выведите "YES" или "NO".',
NULL,
'Одна строка из строчных латинских букв.',
'"YES" или "NO".',
's = input().strip()
print("YES" if s == s[::-1] else "NO")',
'[{"input": "abcba", "expected": "YES"}, {"input": "hello", "expected": "NO"}]',
'[{"input": "a", "expected": "YES"}, {"input": "ab", "expected": "NO"}, {"input": "aabbaa", "expected": "YES"}]',
'1 ≤ |s| ≤ 10^5'),

-- === JUNIOR: Strings — Count chars ===
('Подсчёт символов', 'strings', 'junior',
'Дана строка. Подсчитайте количество вхождений каждого символа и выведите в формате "символ: количество" в алфавитном порядке.',
NULL,
'Одна строка.',
'Каждая строка: "символ: количество", в алфавитном порядке.',
'from collections import Counter
s = input().strip()
counts = Counter(s)
for ch in sorted(counts):
    print(f"{ch}: {counts[ch]}")',
'[{"input": "hello", "expected": "e: 1\nh: 1\nl: 2\no: 1"}, {"input": "aab", "expected": "a: 2\nb: 1"}]',
'[{"input": "a", "expected": "a: 1"}, {"input": "aaaa", "expected": "a: 4"}]',
'1 ≤ |s| ≤ 1000'),

-- === JUNIOR: Sorting ===
('Сортировка пузырьком', 'sorting', 'junior',
'Реализуйте сортировку массива методом пузырька. Выведите отсортированный массив.',
NULL,
'Первая строка — n. Вторая строка — n чисел.',
'Отсортированный массив через пробел.',
'n = int(input())
arr = list(map(int, input().split()))
for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j+1]:
            arr[j], arr[j+1] = arr[j+1], arr[j]
print(*arr)',
'[{"input": "5\n5 3 1 4 2", "expected": "1 2 3 4 5"}, {"input": "3\n3 2 1", "expected": "1 2 3"}]',
'[{"input": "1\n1", "expected": "1"}, {"input": "4\n1 1 1 1", "expected": "1 1 1 1"}]',
'1 ≤ n ≤ 1000'),

-- === JUNIOR: Math ===
('Числа Фибоначчи', 'math', 'junior',
'Выведите первые n чисел Фибоначчи через пробел. F(1)=1, F(2)=1, F(n)=F(n-1)+F(n-2).',
NULL,
'Одно число n.',
'Первые n чисел Фибоначчи через пробел.',
'n = int(input())
fib = [1, 1]
for i in range(2, n):
    fib.append(fib[-1] + fib[-2])
print(*fib[:n])',
'[{"input": "5", "expected": "1 1 2 3 5"}, {"input": "1", "expected": "1"}]',
'[{"input": "2", "expected": "1 1"}, {"input": "10", "expected": "1 1 2 3 5 8 13 21 34 55"}]',
'1 ≤ n ≤ 45'),

-- === JUNIOR: Hash tables ===
('Уникальные элементы', 'hash_tables', 'junior',
'Дан массив чисел. Выведите только уникальные элементы в порядке первого появления.',
NULL,
'Первая строка — n. Вторая строка — n чисел.',
'Уникальные элементы через пробел.',
'n = int(input())
arr = list(map(int, input().split()))
seen = set()
result = []
for x in arr:
    if x not in seen:
        seen.add(x)
        result.append(x)
print(*result)',
'[{"input": "6\n1 2 3 2 1 4", "expected": "1 2 3 4"}, {"input": "3\n5 5 5", "expected": "5"}]',
'[{"input": "1\n1", "expected": "1"}, {"input": "5\n1 2 3 4 5", "expected": "1 2 3 4 5"}]',
'1 ≤ n ≤ 10^5'),

-- === MIDDLE: Arrays — Two Sum ===
('Два числа с заданной суммой', 'arrays', 'middle',
'Дан массив целых чисел и целевое число target. Найдите индексы двух элементов, сумма которых равна target. Выведите два индекса (0-based) через пробел. Гарантируется, что решение существует.',
NULL,
'Первая строка — n и target. Вторая строка — n чисел.',
'Два индекса через пробел.',
'line1 = input().split()
n, target = int(line1[0]), int(line1[1])
arr = list(map(int, input().split()))
seen = {}
for i, x in enumerate(arr):
    comp = target - x
    if comp in seen:
        print(seen[comp], i)
        break
    seen[x] = i',
'[{"input": "4 9\n2 7 11 15", "expected": "0 1"}, {"input": "3 6\n3 2 4", "expected": "1 2"}]',
'[{"input": "2 3\n1 2", "expected": "0 1"}, {"input": "5 10\n1 2 3 4 6", "expected": "3 4"}]',
'2 ≤ n ≤ 10^5, решение единственное'),

-- === MIDDLE: Strings — Anagram check ===
('Проверка анаграммы', 'strings', 'middle',
'Даны две строки. Определите, являются ли они анаграммами друг друга (содержат одинаковые символы в разном порядке). Выведите "YES" или "NO".',
NULL,
'Две строки на отдельных строках.',
'"YES" или "NO".',
'from collections import Counter
s1 = input().strip()
s2 = input().strip()
print("YES" if Counter(s1) == Counter(s2) else "NO")',
'[{"input": "listen\nsilent", "expected": "YES"}, {"input": "hello\nworld", "expected": "NO"}]',
'[{"input": "a\na", "expected": "YES"}, {"input": "ab\nba", "expected": "YES"}, {"input": "abc\nabd", "expected": "NO"}]',
'1 ≤ |s| ≤ 10^5'),

-- === MIDDLE: Linked Lists (simulated) ===
('Разворот списка', 'linked_lists', 'middle',
'Дан массив чисел, представляющий связный список. Разверните его (выведите элементы в обратном порядке).',
NULL,
'Первая строка — n. Вторая строка — n чисел.',
'Развёрнутый массив через пробел.',
'n = int(input())
arr = list(map(int, input().split()))
print(*arr[::-1])',
'[{"input": "5\n1 2 3 4 5", "expected": "5 4 3 2 1"}, {"input": "3\n10 20 30", "expected": "30 20 10"}]',
'[{"input": "1\n1", "expected": "1"}, {"input": "2\n1 2", "expected": "2 1"}]',
'1 ≤ n ≤ 10^5'),

-- === MIDDLE: Dynamic Programming — Climbing stairs ===
('Лестница', 'dynamic_programming', 'middle',
'Вы поднимаетесь по лестнице из n ступенек. За один шаг можно подняться на 1 или 2 ступеньки. Сколько различных способов добраться до вершины?',
NULL,
'Одно число n.',
'Количество способов.',
'n = int(input())
if n <= 2:
    print(n)
else:
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    print(b)',
'[{"input": "2", "expected": "2"}, {"input": "3", "expected": "3"}, {"input": "5", "expected": "8"}]',
'[{"input": "1", "expected": "1"}, {"input": "10", "expected": "89"}, {"input": "20", "expected": "10946"}]',
'1 ≤ n ≤ 45'),

-- === MIDDLE: Recursion — Power ===
('Быстрое возведение в степень', 'recursion', 'middle',
'Реализуйте быстрое возведение числа a в степень n по модулю 10^9+7.',
NULL,
'Два числа a и n.',
'a^n mod 10^9+7.',
'a, n = map(int, input().split())
MOD = 10**9 + 7
def power(a, n, mod):
    if n == 0: return 1
    if n % 2 == 0:
        half = power(a, n // 2, mod)
        return (half * half) % mod
    return (a * power(a, n - 1, mod)) % mod
print(power(a, n, MOD))',
'[{"input": "2 10", "expected": "1024"}, {"input": "3 3", "expected": "27"}]',
'[{"input": "2 0", "expected": "1"}, {"input": "1 1000000", "expected": "1"}, {"input": "2 30", "expected": "73741817"}]',
'0 ≤ a ≤ 10^9, 0 ≤ n ≤ 10^18'),

-- === MIDDLE: Graphs — BFS shortest path ===
('Кратчайший путь (BFS)', 'graphs', 'middle',
'Дан неориентированный невзвешенный граф. Найдите длину кратчайшего пути от вершины 1 до вершины n. Если пути нет, выведите -1.',
NULL,
'Первая строка — n (вершины) и m (рёбра). Далее m строк — пары u v.',
'Длина кратчайшего пути или -1.',
'from collections import deque
n, m = map(int, input().split())
graph = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    graph[u].append(v)
    graph[v].append(u)
dist = [-1] * (n + 1)
dist[1] = 0
q = deque([1])
while q:
    node = q.popleft()
    for nb in graph[node]:
        if dist[nb] == -1:
            dist[nb] = dist[node] + 1
            q.append(nb)
print(dist[n])',
'[{"input": "4 4\n1 2\n2 3\n3 4\n1 3", "expected": "2"}, {"input": "3 1\n1 2", "expected": "-1"}]',
'[{"input": "2 1\n1 2", "expected": "1"}, {"input": "1 0", "expected": "0"}, {"input": "5 4\n1 2\n2 3\n3 4\n4 5", "expected": "4"}]',
'1 ≤ n ≤ 10^5, 0 ≤ m ≤ 2*10^5'),

-- === MIDDLE: Hash Tables — Group anagrams ===
('Группировка анаграмм', 'hash_tables', 'middle',
'Дан список слов. Сгруппируйте анаграммы вместе. Выведите каждую группу на отдельной строке, слова в группе через пробел (в алфавитном порядке). Группы отсортированы по первому слову.',
NULL,
'Первая строка — n. Далее n слов.',
'Каждая группа на отдельной строке.',
'from collections import defaultdict
n = int(input())
groups = defaultdict(list)
for _ in range(n):
    word = input().strip()
    key = "".join(sorted(word))
    groups[key].append(word)
for key in sorted(groups, key=lambda k: sorted(groups[k])[0]):
    print(*sorted(groups[key]))',
'[{"input": "6\neat\ntea\ntan\nate\nnat\nbat", "expected": "ate eat tea\nant nat tan\nbat"}]',
'[{"input": "1\nhello", "expected": "hello"}, {"input": "2\nab\nba", "expected": "ab ba"}]',
'1 ≤ n ≤ 10^4'),

-- === MIDDLE: Trees — Binary tree depth ===
('Глубина бинарного дерева', 'trees', 'middle',
'Дано бинарное дерево в виде массива (по уровням, -1 = отсутствие узла). Найдите максимальную глубину дерева.',
NULL,
'Первая строка — n. Вторая строка — n чисел (массив дерева, -1 = null).',
'Максимальная глубина.',
'import math
n = int(input())
arr = list(map(int, input().split()))
if n == 0 or arr[0] == -1:
    print(0)
else:
    max_depth = 0
    for i in range(n):
        if arr[i] != -1:
            depth = int(math.log2(i + 1)) + 1
            max_depth = max(max_depth, depth)
    print(max_depth)',
'[{"input": "7\n3 9 20 -1 -1 15 7", "expected": "3"}, {"input": "1\n1", "expected": "1"}]',
'[{"input": "3\n1 2 3", "expected": "2"}, {"input": "0\n", "expected": "0"}]',
'0 ≤ n ≤ 10^4'),

-- === SENIOR: Dynamic Programming — LCS ===
('Наибольшая общая подпоследовательность', 'dynamic_programming', 'senior',
'Даны две строки. Найдите длину их наибольшей общей подпоследовательности (LCS).',
NULL,
'Две строки на отдельных строках.',
'Длина LCS.',
's1 = input().strip()
s2 = input().strip()
m, n = len(s1), len(s2)
dp = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(1, m + 1):
    for j in range(1, n + 1):
        if s1[i-1] == s2[j-1]:
            dp[i][j] = dp[i-1][j-1] + 1
        else:
            dp[i][j] = max(dp[i-1][j], dp[i][j-1])
print(dp[m][n])',
'[{"input": "abcde\nace", "expected": "3"}, {"input": "abc\nabc", "expected": "3"}]',
'[{"input": "abc\ndef", "expected": "0"}, {"input": "a\na", "expected": "1"}, {"input": "abcdef\nbdf", "expected": "3"}]',
'1 ≤ |s| ≤ 1000'),

-- === SENIOR: Graphs — Dijkstra ===
('Кратчайший путь (Dijkstra)', 'graphs', 'senior',
'Дан взвешенный ориентированный граф. Найдите кратчайшее расстояние от вершины 1 до вершины n. Если пути нет, выведите -1.',
NULL,
'Первая строка — n и m. Далее m строк — u v w (ребро от u к v весом w).',
'Кратчайшее расстояние или -1.',
'import heapq
n, m = map(int, input().split())
graph = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v, w = map(int, input().split())
    graph[u].append((v, w))
dist = [float("inf")] * (n + 1)
dist[1] = 0
pq = [(0, 1)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]: continue
    for v, w in graph[u]:
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
            heapq.heappush(pq, (dist[v], v))
print(dist[n] if dist[n] != float("inf") else -1)',
'[{"input": "4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 6\n3 4 3", "expected": "6"}, {"input": "2 0", "expected": "-1"}]',
'[{"input": "1 0", "expected": "0"}, {"input": "3 3\n1 2 1\n2 3 1\n1 3 3", "expected": "2"}]',
'1 ≤ n ≤ 10^5, 0 ≤ m ≤ 3*10^5, 1 ≤ w ≤ 10^6'),

-- === SENIOR: Trees — LCA ===
('Наименьший общий предок (LCA)', 'trees', 'senior',
'Дано дерево с корнем в вершине 1 и два запроса (u, v). Для каждого найдите наименьшего общего предка.',
NULL,
'Первая строка — n. Далее n-1 строк — рёбра. Затем число запросов q. Далее q строк — u v.',
'Для каждого запроса — номер LCA.',
'import sys
from collections import deque
input_data = sys.stdin.read().split()
idx = 0
n = int(input_data[idx]); idx += 1
children = [[] for _ in range(n + 1)]
for _ in range(n - 1):
    u = int(input_data[idx]); idx += 1
    v = int(input_data[idx]); idx += 1
    children[u].append(v)
    children[v].append(u)
parent = [0] * (n + 1)
depth = [0] * (n + 1)
visited = [False] * (n + 1)
q = deque([1])
visited[1] = True
while q:
    node = q.popleft()
    for nb in children[node]:
        if not visited[nb]:
            visited[nb] = True
            parent[nb] = node
            depth[nb] = depth[node] + 1
            q.append(nb)
queries = int(input_data[idx]); idx += 1
for _ in range(queries):
    u = int(input_data[idx]); idx += 1
    v = int(input_data[idx]); idx += 1
    while depth[u] > depth[v]: u = parent[u]
    while depth[v] > depth[u]: v = parent[v]
    while u != v: u = parent[u]; v = parent[v]
    print(u)',
'[{"input": "5\n1 2\n1 3\n2 4\n2 5\n2\n4 5\n4 3", "expected": "2\n1"}]',
'[{"input": "3\n1 2\n1 3\n1\n2 3", "expected": "1"}]',
'1 ≤ n ≤ 10^5'),

-- === SENIOR: Arrays — Merge intervals ===
('Слияние интервалов', 'arrays', 'senior',
'Дан список интервалов [start, end]. Объедините пересекающиеся интервалы и выведите результат.',
NULL,
'Первая строка — n. Далее n строк — start end.',
'Объединённые интервалы, каждый на своей строке.',
'n = int(input())
intervals = []
for _ in range(n):
    a, b = map(int, input().split())
    intervals.append((a, b))
intervals.sort()
merged = [intervals[0]]
for start, end in intervals[1:]:
    if start <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    else:
        merged.append((start, end))
for a, b in merged:
    print(a, b)',
'[{"input": "4\n1 3\n2 6\n8 10\n15 18", "expected": "1 6\n8 10\n15 18"}, {"input": "2\n1 4\n4 5", "expected": "1 5"}]',
'[{"input": "1\n1 1", "expected": "1 1"}, {"input": "3\n1 10\n2 3\n4 5", "expected": "1 10"}]',
'1 ≤ n ≤ 10^4'),

-- === SENIOR: Strings — KMP ===
('Поиск подстроки (KMP)', 'strings', 'senior',
'Дана строка text и шаблон pattern. Найдите все вхождения pattern в text. Выведите начальные индексы (0-based) через пробел. Если вхождений нет — выведите -1.',
NULL,
'Первая строка — text. Вторая строка — pattern.',
'Индексы вхождений через пробел или -1.',
'def kmp(text, pattern):
    n, m = len(text), len(pattern)
    lps = [0] * m
    j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]: j = lps[j-1]
        if pattern[i] == pattern[j]: j += 1
        lps[i] = j
    result = []
    j = 0
    for i in range(n):
        while j > 0 and text[i] != pattern[j]: j = lps[j-1]
        if text[i] == pattern[j]: j += 1
        if j == m:
            result.append(i - m + 1)
            j = lps[j-1]
    return result
text = input().strip()
pattern = input().strip()
res = kmp(text, pattern)
print(*res if res else [-1])',
'[{"input": "abcabcabc\nabc", "expected": "0 3 6"}, {"input": "hello\nworld", "expected": "-1"}]',
'[{"input": "aaaa\naa", "expected": "0 1 2"}, {"input": "a\na", "expected": "0"}]',
'1 ≤ |text| ≤ 10^6, 1 ≤ |pattern| ≤ |text|'),

-- === SENIOR: Sorting — Merge sort ===
('Сортировка слиянием', 'sorting', 'senior',
'Реализуйте сортировку слиянием (merge sort). Выведите отсортированный массив.',
NULL,
'Первая строка — n. Вторая строка — n чисел.',
'Отсортированный массив через пробел.',
'def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
def merge(l, r):
    result = []
    i = j = 0
    while i < len(l) and j < len(r):
        if l[i] <= r[j]: result.append(l[i]); i += 1
        else: result.append(r[j]); j += 1
    result.extend(l[i:])
    result.extend(r[j:])
    return result
n = int(input())
arr = list(map(int, input().split()))
print(*merge_sort(arr))',
'[{"input": "6\n38 27 43 3 9 82", "expected": "3 9 27 38 43 82"}, {"input": "3\n3 2 1", "expected": "1 2 3"}]',
'[{"input": "1\n1", "expected": "1"}, {"input": "5\n5 4 3 2 1", "expected": "1 2 3 4 5"}]',
'1 ≤ n ≤ 10^5'),

-- === SENIOR: Recursion — N-Queens count ===
('N ферзей (количество)', 'recursion', 'senior',
'Найдите количество способов расставить n ферзей на доске n×n так, чтобы ни один ферзь не бил другого.',
NULL,
'Одно число n.',
'Количество решений.',
'def solve(n):
    count = 0
    cols = set()
    diag1 = set()
    diag2 = set()
    def backtrack(row):
        nonlocal count
        if row == n:
            count += 1
            return
        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            cols.add(col); diag1.add(row - col); diag2.add(row + col)
            backtrack(row + 1)
            cols.remove(col); diag1.remove(row - col); diag2.remove(row + col)
    backtrack(0)
    return count
n = int(input())
print(solve(n))',
'[{"input": "4", "expected": "2"}, {"input": "1", "expected": "1"}]',
'[{"input": "5", "expected": "10"}, {"input": "8", "expected": "92"}, {"input": "2", "expected": "0"}]',
'1 ≤ n ≤ 12'),

-- === SENIOR: Math — Sieve of Eratosthenes ===
('Решето Эратосфена', 'math', 'senior',
'Выведите все простые числа до n включительно, через пробел.',
NULL,
'Одно число n.',
'Простые числа через пробел.',
'n = int(input())
if n < 2:
    print()
else:
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    for i in range(2, int(n**0.5) + 1):
        if sieve[i]:
            for j in range(i*i, n + 1, i):
                sieve[j] = False
    print(*[i for i in range(n + 1) if sieve[i]])',
'[{"input": "10", "expected": "2 3 5 7"}, {"input": "2", "expected": "2"}]',
'[{"input": "1", "expected": ""}, {"input": "30", "expected": "2 3 5 7 11 13 17 19 23 29"}]',
'1 ≤ n ≤ 10^6'),

-- === JUNIOR: Recursion — Factorial ===
('Факториал', 'recursion', 'junior',
'Вычислите n! (факториал числа n). Используйте рекурсию.',
NULL,
'Одно число n.',
'n!',
'def factorial(n):
    if n <= 1: return 1
    return n * factorial(n - 1)
n = int(input())
print(factorial(n))',
'[{"input": "5", "expected": "120"}, {"input": "0", "expected": "1"}]',
'[{"input": "1", "expected": "1"}, {"input": "10", "expected": "3628800"}]',
'0 ≤ n ≤ 20');

-- ============================================================================
-- 8. DEMO INTERVIEW DATA — pre-filled sessions for candidates
-- ============================================================================

-- Interview for candidate1 (completed, good score)
INSERT INTO interviews (user_id, status, level, total_score, total_tasks, completed_tasks, started_at, finished_at, ai_summary, ai_recommendation)
VALUES (3, 'completed', 'middle', 85.0, 3, 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes',
'Кандидат показал хорошее знание алгоритмов и структур данных. Уверенно решает задачи на массивы и строки. Рекомендуется для позиции Middle Developer.',
'hire');

-- Interview for candidate2 (completed, average)
INSERT INTO interviews (user_id, status, level, total_score, total_tasks, completed_tasks, started_at, finished_at, ai_summary, ai_recommendation)
VALUES (4, 'completed', 'junior', 62.5, 3, 3, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '55 minutes',
'Кандидат справился с базовыми задачами, но допускал ошибки в крайних случаях. Нужна дополнительная подготовка по алгоритмам.',
'maybe');

-- Interview for candidate3 (in progress)
INSERT INTO interviews (user_id, status, level, total_score, total_tasks, completed_tasks, started_at)
VALUES (5, 'task_active', 'senior', 0.0, 3, 0, NOW() - INTERVAL '1 hour');

-- Interview for candidate4 (completed, low score)
INSERT INTO interviews (user_id, status, level, total_score, total_tasks, completed_tasks, started_at, finished_at, ai_summary, ai_recommendation)
VALUES (6, 'completed', 'junior', 35.0, 3, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '60 minutes',
'Кандидат имеет базовое понимание программирования, но не справился с задачами на алгоритмы. Рекомендуется дополнительная подготовка.',
'reject');

COMMIT;
