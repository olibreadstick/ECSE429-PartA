# ECSE 429 — API Unit Tests

## Overview

Automated tests for the TodoManager REST API using **JavaScript, Mocha, and Chai**. Tests cover Projects endpoints (Olivia) and Todos endpoints (Yanick), including CRUD operations, filtering, JSON/XML requests, and relationships between todos, projects and categories.

## Structure

- `JSON/` — JSON endpoint tests and bug verification.
- `XML/` — XML endpoint tests.
- `testHelpers.js` — Shared setup and cleanup functions (projects).
- `todoHelpers.js` — Helpers for creating todos and checking that a test didn't change anything else (todos).
- `testConstants.js` — API configuration.

Todo test files:

- `JSON/todosEndpoint.js`, `JSON/specificTodoEndpoint.js` — /todos and /todos/:id (T1-T27)
- `JSON/todoProjectRelationshipEndpoints.js`, `JSON/todoCategoryRelationshipEndpoints.js` — tasksof and categories links (T28-T42)
- `JSON/todoUndocumentedEndpoints.js` — OPTIONS, PATCH, collection PUT/DELETE, linking by title (T43-T48)
- `XML/` — the same todo endpoints with XML (T49-T61)
- `JSON/todoBugsObserved.js` / `JSON/todoBugsExpected.js` — BUG-05 to BUG-10

## Running Tests

Ensure the API is running at `http://localhost:4567` and install dependencies using `npm install`.

Run the following commands from the project root.

**Regular test suite (114 passing):**

```bash
npx mocha "test/{JSON,XML}/*.js" --ignore "test/JSON/projectBugsExpected.js" --ignore "test/JSON/todoBugsExpected.js"
```

**Expected-behavior bug tests, projects (4 failing):**

```bash
npx mocha test/JSON/projectBugsExpected.js
```

**Expected-behavior bug tests, todos (6 failing):**

```bash
npx mocha test/JSON/todoBugsExpected.js
```

**Randomized execution (114 passing):**

```bash
node scripts/runRandomizedTests.mjs
TEST_SEED=42 node scripts/runRandomizedTests.mjs   # repeat a specific order
```

## Results

- **43 passing** Projects API tests.
- **4 passing** observed-behavior project bug tests (BUG-01 to BUG-04).
- **61 passing** Todos API tests (T1-T61).
- **6 passing** observed-behavior todo bug tests (BUG-05 to BUG-10).
- **4 failing** project expected-behavior tests, where the API returns HTTP 200 instead of the proposed HTTP 404 for nonexistent project relationships.
- **6 failing** todo expected-behavior tests: PUT resetting omitted fields, HTTP 200 instead of 404 for a nonexistent todo's projects and categories, todo-category links missing on the category side, XML relationship creation returning 404, and rejected creates using up ids.

The HTTP 404 expectations require confirmation against the API documentation.

## Test Independence

Tests use temporary data and cleanup helpers. Every todo test that could change data (create, update, delete, link, or a rejected request) saves the todos, projects and categories before it runs, compares them afterwards, and deletes whatever it created. All 114 passing tests were successfully executed in randomized order. Before-and-after comparisons confirmed that Projects, Todos, and Categories collection responses remained unchanged.
