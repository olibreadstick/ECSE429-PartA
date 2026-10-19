import { expect } from "chai";
import {
    BASE_URL,
    NONEXISTENT_ID,
    SEEDED_CATEGORY_ID,
    SEEDED_PROJECT_ID,
    TODOS_URL,
    assertServiceRunning,
    createTodo,
    getTodo,
    idsOf,
    readJson,
    sendJson,
    sendXml,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

// These tests check what the API SHOULD do according to the documentation.
// They are expected to FAIL - each one matches a bug summary (BUG-05 to BUG-10).
// The matching tests that pass with the actual behaviour are in todoBugsObserved.js.

describe("/todos endpoints - Expected Specification Behavior", function () {

    before(assertServiceRunning);

    // BUG-05: docs say PUT "amends" the todo with the fields given, like POST
    it("BUG-05 SPEC EXPECTED - PUT /todos/:id - Keeps fields that are not in the body - Error Case", async function () {
        await withTodo(async ({ todo }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}`, { doneStatus: true });

            const response = await sendJson("PUT", `${TODOS_URL}/${todo.id}`, { title: "Book training pitch for Thursday" });
            const saved = await getTodo(todo.id);

            expect(response.status).to.equal(200);
            expect(saved.description).to.equal(todo.description);
            expect(saved.doneStatus).to.equal("true");
        });
    });

    // BUG-06: projects of a todo that doesn't exist
    it("BUG-06 SPEC EXPECTED - GET /todos/:id/tasksof - Rejects a nonexistent todo - Error Case", async function () {
        const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/tasksof`);

        expect(response.status).to.equal(404);
    });

    // BUG-07: categories of a todo that doesn't exist
    it("BUG-07 SPEC EXPECTED - GET /todos/:id/categories - Rejects a nonexistent todo - Error Case", async function () {
        const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/categories`);

        expect(response.status).to.equal(404);
    });

    // BUG-08: a todo -> category link should be visible from the category too
    it("BUG-08 SPEC EXPECTED - GET /categories/:id/todos - Shows a todo linked from the todo side - Error Case", async function () {
        await withTodo(async ({ todo }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}/categories`, { id: SEEDED_CATEGORY_ID });

            const response = await fetch(`${BASE_URL}/categories/${SEEDED_CATEGORY_ID}/todos`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(idsOf(data.todos)).to.include(todo.id);
        });
    });

    // BUG-09: the docs say XML bodies are accepted, so linking with XML should work like JSON
    it("BUG-09 SPEC EXPECTED - POST /todos/:id/tasksof - Links a project from an XML body - Error Case", async function () {
        await withTodo(async ({ todo }) => {
            const response = await sendXml("POST", `${TODOS_URL}/${todo.id}/tasksof`,
                `<project><id>${SEEDED_PROJECT_ID}</id></project>`);

            expect(response.status).to.equal(201);
            expect(idsOf((await getTodo(todo.id)).tasksof)).to.deep.equal([SEEDED_PROJECT_ID]);
        });
    });

    // BUG-10: a rejected create shouldn't change anything, including the id counter
    it("BUG-10 SPEC EXPECTED - POST /todos - A rejected create does not use up an id - Error Case", async function () {
        await withRestoredSystem(async ({ created }) => {
            const first = await createTodo({ title: "Print the match schedule" });
            created.todos.push(first.id);

            const rejected = await sendJson("POST", TODOS_URL, { title: "" });
            expect(rejected.status).to.equal(400);

            const second = await createTodo({ title: "Print the league table" });
            created.todos.push(second.id);

            expect(Number(second.id)).to.equal(Number(first.id) + 1);
        });
    });

});