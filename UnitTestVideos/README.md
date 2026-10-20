# ECSE 429 — Unit Test Suite Videos

There are two videos in this folder:

- `UnitTestProjects.mov` — the Projects API tests (Olivia), recorded before the Todos tests were added.
- `UnitTestsTodos.mov` — the full combined suite with the Projects and Todos tests (Yanick).

Both demonstrate the automated tests developed using JavaScript, Mocha, and Chai, and are divided into the same three parts.

## UnitTestProjects.mov

### 1. Regular Unit Tests

First, the complete passing test suite is executed, covering Projects endpoints, JSON/XML requests, and relationships with Todos and Categories.

**Result: 47 passing tests, 0 failing.**

Command:

`npx mocha "test/{JSON,XML}/*.js" --ignore "test/JSON/projectBugsExpected.js"`

### 2. Bug Verification

Next, the four expected-behavior bug tests are executed separately. These tests expect HTTP 404 for nonexistent project relationships, but the API returns HTTP 200.

**Result: 4 failing tests, demonstrating the identified behavioral discrepancies.**

Command:

`npx mocha test/JSON/projectBugsExpected.js`

The 47-test suite already includes the four passing observed-behavior tests.

### 3. Randomized Test Execution

Finally, the passing test suite is executed in a randomized order to demonstrate test independence.

**Result: 47 passing tests.**

Command:

`node scripts/runRandomizedTests.mjs`

## UnitTestsTodos.mov

### 1. Regular Unit Tests

The full passing suite is run, now covering both the Projects and Todos endpoints, JSON/XML requests, and the relationships between todos, projects and categories.

**Result: 114 passing tests, 0 failing.**

Command:

`npx mocha "test/{JSON,XML}/*.js" --ignore "test/JSON/projectBugsExpected.js" --ignore "test/JSON/todoBugsExpected.js"`

Note: now that the Todos tests are in the same folders, this is the command to use for the regular suite. The command above would also pick up `todoBugsExpected.js`.

### 2. Bug Verification

Both expected-behavior modules are run on their own. They check what the documentation describes, so they fail against the current API.

**Result
