import { expect } from "chai";
import {
    NONEXISTENT_ID,
    SEEDED_CATEGORY_ID,
    TODOS_URL,
    assertServiceRunning,
    expectNoSideEffects,
    idsOf,
    readJson,
    sendJson,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

// small helpers so the URL and the link request aren't repeated in every test
const categoriesUrl = todoId => `${TODOS_URL}/${todoId}/categories`;

function linkToCategory(todoId, categoryId) {
    return sendJson("POST", categoriesUrl(todoId), { id: categoryId });
}

async function categoryIdsOf(todoId) {
    const response = await fetch(categoriesUrl(todoId));
    expect(response.status).to.equal(200);
    return idsOf((await readJson(response)).categories);
}

describe("/todos/:id/categories & /todos/:id/categories/:id endpoint API Calls - JSON", function () {

    before(assertServiceRunning);

    // Test 36: a new todo has no categories
    it("T36 - GET /todos/:id/categories - Returns no categories for a new todo - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(categoriesUrl(todo.id));
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data).to.deep.equal({ categories: [] });
        });
    });

    // Test 37: put a todo in the existing category
    it("T37 - POST /todos/:id/categories - Links a todo to an existing category - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await linkToCategory(todo.id, SEEDED_CATEGORY_ID);

            expect(response.status).to.equal(201);
            expect(await categoryIdsOf(todo.id)).to.deep.equal([SEEDED_CATEGORY_ID]);
            // only the todo changes - the category side never shows the link (BUG-08)
            await expectNoSideEffects(afterSetup, { todos: [todo.id] });
        });
    });

    // Test 38: HEAD on the relationship
    it("T38 - HEAD /todos/:id/categories - Returns headers without a body - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(categoriesUrl(todo.id), { method: "HEAD" });

            expect(response.status).to.equal(200);
            expect(response.headers.get("content-type")).to.include("application/json");
            expect(await response.text()).to.equal("");
        });
    });

    // Test 39: removing the link keeps both the todo and the category
    it("T39 - DELETE /todos/:id/categories/:id - Removes the link only - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            await linkToCategory(todo.id, SEEDED_CATEGORY_ID);

            const response = await fetch(`${categoriesUrl(todo.id)}/${SEEDED_CATEGORY_ID}`, { method: "DELETE" });

            expect(response.status).to.equal(200);
            expect(await categoryIdsOf(todo.id)).to.be.empty;
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 40: removing the same link twice
    it("T40 - DELETE /todos/:id/categories/:id - Rejects removing a link twice - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const linkUrl = `${categoriesUrl(todo.id)}/${SEEDED_CATEGORY_ID}`;
            await linkToCategory(todo.id, SEEDED_CATEGORY_ID);
            await fetch(linkUrl, { method: "DELETE" });

            const response = await fetch(linkUrl, { method: "DELETE" });
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find any instances");
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 41: linking to a category that doesn't exist
    it("T41 - POST /todos/:id/categories - Rejects a nonexistent category - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await linkToCategory(todo.id, NONEXISTENT_ID);
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find thing matching value for id");
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 42: linking from a todo that doesn't exist
    it("T42 - POST /todos/:id/categories - Rejects a nonexistent todo - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await linkToCategory(NONEXISTENT_ID, SEEDED_CATEGORY_ID);
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find parent thing");
            await expectNoSideEffects(before);
        });
    });

});