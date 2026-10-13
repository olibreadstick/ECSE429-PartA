# ECSE 429 — Unit Test Suite Video

This video demonstrates the automated Projects API tests developed using JavaScript, Mocha, and Chai.

The demonstration is divided into three parts:

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

All tests use temporary data and cleanup functions to preserve the original API state.
