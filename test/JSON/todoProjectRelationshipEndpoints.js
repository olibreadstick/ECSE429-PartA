import { expect } from "chai";
import {
    BASE_URL,
    NONEXISTENT_ID,
    SEEDED_PROJECT_ID,
    TODOS_URL,
    assertServiceRunning,
    expectNoSideEffects,
    idsOf,
    readJson,
    sendJson,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

const tasksofUrl = todoId => `${TODOS_URL}/${todoId}/tasksof`;

function linkToProject(todoId, projectId) {
    return sendJson("POST", tasksofUrl(todoId), { id: projectId });
}

async function projectIdsOf(todoId) {
    const response = await fetch(tasksofUrl(todoId));
    expect(response.status).to.equal(200);
    return idsOf((await readJson(response)).projects);
}

describe("/todos/:id/tasksof & /todos/:id/tasksof/:id endpoint API Calls - JSON", function () {

    before(assertServiceRunning);

    // Test 28: a brand new todo isn't part of any project
    it("T28 - GET /todos/:id/tasksof - Returns no projects for a new todo - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(tasksofUrl(todo.id));
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data).to.deep.equal({ projects: [] });
        });
    });

    // Test 29: link a todo to the existing project
    it("T29 - POST /todos/:id/tasksof - Links a todo to an existing project - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await linkToProject(todo.id, SEEDED_PROJECT_ID);

            expect(response.status).to.equal(201);
            expect(await projectIdsOf(todo.id)).to.deep.equal([SEEDED_PROJECT_ID]);
            // only the todo and the project it was linked to should change
            await expectNoSideEffects(afterSetup, { todos: [todo.id], projects: [SEEDED_PROJECT_ID] });
        });
    });

    // Test 30: the link should also show up from the project's side
    it("T30 - GET /projects/:id/tasks - Shows the linked todo (bidirectional) - Capability", async function () {
        await withTodo(async ({ todo }) => {
            await linkToProject(todo.id, SEEDED_PROJECT_ID);

            const response = await fetch(`${BASE_URL}/projects/${SEEDED_PROJECT_ID}/tasks`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(idsOf(data.todos)).to.include(todo.id);
        });
    });

    // Test 31: HEAD on the relationship
    it("T31 - HEAD /todos/:id/tasksof - Returns headers without a body - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(tasksofUrl(todo.id), { method: "HEAD" });

            expect(response.status).to.equal(200);
            expect(response.headers.get("content-type")).to.include("application/json");
            expect(await response.text()).to.equal("");
        });
    });

    // Test 32: removing the link should leave both the todo and the project in place
    it("T32 - DELETE /todos/:id/tasksof/:id - Removes the link only - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            await linkToProject(todo.id, SEEDED_PROJECT_ID);

            const response = await fetch(`${tasksofUrl(todo.id)}/${SEEDED_PROJECT_ID}`, { method: "DELETE" });

            expect(response.status).to.equal(200);
            expect(await projectIdsOf(todo.id)).to.be.empty;
            // back to exactly how it was before we linked them
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 33: removing the same link twice
    it("T33 - DELETE /todos/:id/tasksof/:id - Rejects removing a link twice - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const linkUrl = `${tasksofUrl(todo.id)}/${SEEDED_PROJECT_ID}`;
            await linkToProject(todo.id, SEEDED_PROJECT_ID);
            await fetch(linkUrl, { method: "DELETE" });

            const response = await fetch(linkUrl, { method: "DELETE" });
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find any instances");
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 34: linking to a project that doesn't exist
    it("T34 - POST /todos/:id/tasksof - Rejects a nonexistent project - Error Case", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await linkToProject(todo.id, NONEXISTENT_ID);
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find thing matching value for id");
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 35: linking from a todo that doesn't exist
    it("T35 - POST /todos/:id/tasksof - Rejects a nonexistent todo - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await linkToProject(NONEXISTENT_ID, SEEDED_PROJECT_ID);
            const data = await readJson(response);

            expect(response.status).to.equal(404);
            expect(data.errorMessages[0]).to.include("Could not find parent thing");
            await expectNoSideEffects(before);
        });
    });

});