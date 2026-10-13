
# ECSE 429 — API Unit Tests

## Overview

Automated tests for the TodoManager REST API using **JavaScript, Mocha, and Chai**. Tests cover Projects endpoints, including CRUD operations, filtering, JSON/XML requests, and Todo/Category relationships.

## Structure

- `JSON/` — JSON endpoint tests and bug verification.
- `XML/` — XML endpoint tests.
- `testHelpers.js` — Shared setup and cleanup functions.
- `testConstants.js` — API configuration.

## Running Tests

Ensure the API is running at `http://localhost:4567` and install dependencies using `npm install`.

Run the following commands from the project root.

**Regular test suite (47 passing):**

```bash
npx mocha "test/{JSON,XML}/*.js" --ignore "test/JSON/projectBugsExpected.js"
```

**Expected-behavior bug tests (4 failing):**

```bash
npx mocha test/JSON/projectBugsExpected.js
```

**Randomized execution (47 passing):**

```bash
node scripts/runRandomizedTests.mjs
```

## Results

- **43 passing** Projects API tests.
- **4 passing** observed-behavior bug tests.
- **4 failing** expected-behavior tests, where the API returns HTTP 200 instead of the proposed HTTP 404 for nonexistent project relationships.

The HTTP 404 expectations require confirmation against the API documentation.

## Test Independence

Tests use temporary project data and cleanup helpers. All 47 passing tests were successfully executed in randomized order. Before-and-after comparisons confirmed that Projects, Todos, and Categories collection responses remained unchanged.
