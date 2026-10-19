import { expect } from "chai";
import {
    BASE_URL,
    NONEXISTENT_ID,
    SEEDED_PROJECT_ID,
    TODOS_URL,
    assertServiceRunning,
    captureSystemState,
    createTodo,
    expectNoSideEffects,
    getTodo,
    idsOf,
    readJson,
    sendJson,
    withDeletedTodoId,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

describe("/todos/:id endpoint API Calls - JSON", function () {

    before(assertServiceRunning);

    // Test 15: GET one todo by id
    it("T15 - GET /todos/:id - Returns a specific todo - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(`${TODOS_URL}/${todo.id}`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            // the API still wraps a single todo in a list
            expect(data.todos).to.have.length(1);
            expect(data.todos[0]).to.deep.equal(todo);
        });
    });

    // Test 16: GET a todo that doesn't exist
    it("T16 - GET /todos/:id - Rejects a nonexistent todo - Error Case", async function () {
        const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}`);
        const data = await readJson(response);

        expect(response.status).to.equal(404);
        expect(data.errorMessages[0]).to.include(`todos/${NONEXISTENT_ID}`);
    });

    // Test 17: HEAD on an existing todo
    it("T17 - HEAD /todos/:id - Returns headers without a body - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(`${TODOS_URL}/${todo.id}`, { method: "HEAD" });

            expect(response.status).to.equal(200);
            expect(response.headers.get("content-type")).to.include("application/json");
            expect(await response.text()).to.equal("");
        });
    });

    // Test 18: HEAD on a todo that doesn't exist
    it("T18 - HEAD /todos/:id - Rejects a nonexistent todo - Error Case", async function () {
        const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}`, { method: "HEAD" });

        expect(response.status).to.equal(404);
    });

    // Test 19: POST with one field should only change that field
    it("T19 - POST /todos/:id - Amends only the given field - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendJson("POST", `${TODOS_URL}/${todo.id}`, { doneStatus: true });
            const updated = await readJson(response);

            expect(response.status).to.equal(200);
            // doneStatus comes back as a string, see session notes
            expect(updated).to.deep.equal({ ...todo, doneStatus: "true" });
            expect(await getTodo(todo.id)).to.deep.equal(updated);
            await expectNoSideEffects(afterSetup, { todos: [todo.id] });
        });
    });

    // Test 20: empty title on update is rejected and nothing is saved
    it("T20 - POST /todos/:id - Rejects an empty title and keeps the todo - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendJson("POST", `${TODOS_URL}/${todo.id}`, { title: "" });

            expect(response.status).to.equal(400);
            expect(await getTodo(todo.id)).to.deep.equal(todo);
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 21: POST update on a todo that doesn't exist
    it("T21 - POST /todos/:id - Rejects an update to a nonexistent todo - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await sendJson("POST", `${TODOS_URL}/${NONEXISTENT_ID}`, { title: "Cancel Saturday practice" });
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include(NONEXISTENT_ID);
            await expectNoSideEffects(before);
        });
    });

    // Test 22: PUT a new title
    // (PUT also wipes the other fields - that's covered separately in the bug tests, BUG-05)
    it("T22 - PUT /todos/:id - Updates the title - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const newTitle = "Book training pitch for Thursday";
            const response = await sendJson("PUT", `${TODOS_URL}/${todo.id}`, { title: newTitle });
            const updated = await readJson(response);

            expect(response.status).to.equal(200);
            expect(updated.id).to.equal(todo.id);
            expect(updated.title).to.equal(newTitle);
            expect((await getTodo(todo.id)).title).to.equal(newTitle);
            await expectNoSideEffects(afterSetup, { todos: [todo.id] });
        });
    });

    // Test 23: PUT without a title is rejected (title is mandatory for PUT, unlike POST)
    it("T23 - PUT /todos/:id - Rejects a body without a title - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendJson("PUT", `${TODOS_URL}/${todo.id}`, { description: "Bring cones and bibs" });
            const data = await readJson(response);

            expect(response.status).to.equal(400);
            expect(data.errorMessages[0]).to.include("title : field is mandatory");
            expect(await getTodo(todo.id)).to.deep.equal(todo);
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 24: PUT on a todo that doesn't exist
    it("T24 - PUT /todos/:id - Rejects an update to a nonexistent todo - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await sendJson("PUT", `${TODOS_URL}/${NONEXISTENT_ID}`, { title: "Cancel Saturday practice" });

            expect(response.status).to.equal(404);
            await expectNoSideEffects(before);
        });
    });

    // Test 25: DELETE removes the todo and nothing else
    it("T25 - DELETE /todos/:id - Deletes only the given todo - Capability", async function () {
        await withRestoredSystem(async ({ before, created }) => {
            const todo = await createTodo();
            created.todos.push(todo.id);

            const response = await fetch(`${TODOS_URL}/${todo.id}`, { method: "DELETE" });

            expect(response.status).to.equal(200);
            expect((await fetch(`${TODOS_URL}/${todo.id}`)).status).to.equal(404);
            // system should be exactly back to where it started
            expect(await captureSystemState()).to.deep.equal(before);
        });
    });

    // Test 26: deleting the same todo twice
    it("T26 - DELETE /todos/:id - Rejects deleting a todo twice - Error Case", async function () {
        await withDeletedTodoId(async ({ before, deletedId }) => {
            const response = await fetch(`${TODOS_URL}/${deletedId}`, { method: "DELETE" });
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include(`todos/${deletedId}`);
            await expectNoSideEffects(before);
        });
    });

    // Test 27: deleting a todo linked to a project should also clean up the project's task list
    it("T27 - DELETE /todos/:id - Removes the todo from its project's tasks - Capability", async function () {
        await withRestoredSystem(async ({ before, created }) => {
            const todo = await createTodo();
            created.todos.push(todo.id);
            const link = await sendJson("POST", `${TODOS_URL}/${todo.id}/tasksof`, { id: SEEDED_PROJECT_ID });
            expect(link.status).to.equal(201);

            await fetch(`${TODOS_URL}/${todo.id}`, { method: "DELETE" });

            const tasks = await readJson(await fetch(`${BASE_URL}/projects/${SEEDED_PROJECT_ID}/tasks`));
            expect(idsOf(tasks.todos)).to.not.include(todo.id);
            expect(await captureSystemState()).to.deep.equal(before);
        });
    });

});