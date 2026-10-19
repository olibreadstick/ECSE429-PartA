import { expect } from "chai";
import {
    BASE_URL,
    NONEXISTENT_ID,
    SEEDED_CATEGORY_ID,
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
    sendXml,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

// Same bugs as todoBugsExpected.js, but these tests assert what the API
// ACTUALLY does, so they pass. If one of these starts failing, the bug was fixed.

// For a todo that doesn't exist, the relationship endpoints return one entry for
// every link of that type that exists on ANY todo - so the output depends on the data.
function countLinks(todos, relationship) {
    return todos.reduce((total, todo) => total + (todo[relationship]?.length ?? 0), 0);
}

describe("/todos endpoints - Observed BUG Behavior", function () {

    before(assertServiceRunning);

    // BUG-05: PUT replaces the whole todo, anything not sent goes back to its default
    it("BUG-05 OBSERVED - PUT /todos/:id - Resets fields that are not in the body - BUG", async function () {
        await withTodo(async ({ todo }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}`, { doneStatus: true });

            const response = await sendJson("PUT", `${TODOS_URL}/${todo.id}`, { title: "Book training pitch for Thursday" });
            const saved = await getTodo(todo.id);

            expect(response.status).to.equal(200);
            expect(saved.title).to.equal("Book training pitch for Thursday");
            // description and doneStatus were wiped even though we never sent them
            expect(saved.description).to.equal("");
            expect(saved.doneStatus).to.equal("false");
        });
    });

    // BUG-06: 200 with projects from other todos instead of a 404
    it("BUG-06 OBSERVED - GET /todos/:id/tasksof - Returns 200 and unrelated projects - BUG", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/tasksof`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data.projects).to.have.length(countLinks(before.todos, "tasksof"));
            // none of these projects actually has the fake todo in it
            for (const project of data.projects) {
                expect(idsOf(project.tasks)).to.not.include(NONEXISTENT_ID);
            }
            // with the default data project 1 shows up more than once
            expect(new Set(idsOf(data.projects)).size).to.be.below(data.projects.length);

            const head = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/tasksof`, { method: "HEAD" });
            expect(head.status).to.equal(200);
            await expectNoSideEffects(before);
        });
    });

    // BUG-07: same thing for categories
    it("BUG-07 OBSERVED - GET /todos/:id/categories - Returns 200 and unrelated categories - BUG", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/categories`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data.categories).to.not.be.empty;
            expect(data.categories).to.have.length(countLinks(before.todos, "categories"));

            const head = await fetch(`${TODOS_URL}/${NONEXISTENT_ID}/categories`, { method: "HEAD" });
            expect(head.status).to.equal(200);
            await expectNoSideEffects(before);
        });
    });

    // BUG-08: the todo says it's in the category, the category doesn't list the todo
    it("BUG-08 OBSERVED - GET /categories/:id/todos - Does not show the linked todo - BUG", async function () {
        await withTodo(async ({ todo }) => {
            const link = await sendJson("POST", `${TODOS_URL}/${todo.id}/categories`, { id: SEEDED_CATEGORY_ID });
            expect(link.status).to.equal(201);
            expect(idsOf((await getTodo(todo.id)).categories)).to.deep.equal([SEEDED_CATEGORY_ID]);

            const response = await fetch(`${BASE_URL}/categories/${SEEDED_CATEGORY_ID}/todos`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(idsOf(data.todos)).to.not.include(todo.id);
        });
    });

    // BUG-09: XML link request fails with a 404 even though both objects exist
    it("BUG-09 OBSERVED - POST /todos/:id/tasksof - XML body is rejected with 404 - BUG", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendXml("POST", `${TODOS_URL}/${todo.id}/tasksof`,
                `<project><id>${SEEDED_PROJECT_ID}</id></project>`);

            expect(response.status).to.equal(404);
            expect(await response.text()).to.include("Could not find thing matching value for id");
            // and nothing was half-saved
            expect(idsOf((await getTodo(todo.id)).tasksof)).to.be.empty;
            await expectNoSideEffects(afterSetup);
        });
    });

    // BUG-10: the rejected create still bumps the id counter
    it("BUG-10 OBSERVED - POST /todos - A rejected create uses up an id - BUG", async function () {
        await withRestoredSystem(async ({ created }) => {
            const first = await createTodo({ title: "Print the match schedule" });
            created.todos.push(first.id);

            const rejected = await sendJson("POST", TODOS_URL, { title: "" });
            expect(rejected.status).to.equal(400);

            const second = await createTodo({ title: "Print the league table" });
            created.todos.push(second.id);

            // one id was skipped
            expect(Number(second.id)).to.equal(Number(first.id) + 2);
            const state = await captureSystemState();
            expect(idsOf(state.todos)).to.not.include(String(Number(first.id) + 1));
        });
    });

});