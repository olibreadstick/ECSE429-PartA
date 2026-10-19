import { expect } from "chai";
import {
    BASE_URL,
    TODOS_URL,
    assertServiceRunning,
    captureSystemState,
    expectNoSideEffects,
    getTodo,
    idsOf,
    readJson,
    sendJson,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

// The behaviour in this file isn't in the API docs - it was found during the
// exploratory session (OPTIONS, unsupported methods, creating a project
// through the tasksof relationship).

function allowedMethods(response) {
    return response.headers.get("allow").split(",").map(method => method.trim()).sort();
}

describe("Undocumented /todos behaviour - JSON", function () {

    before(assertServiceRunning);

    // Test 43: OPTIONS on the collection lists what it supports
    it("T43 - OPTIONS /todos - Lists the allowed methods - Undocumented", async function () {
        const response = await fetch(TODOS_URL, { method: "OPTIONS" });

        expect(response.status).to.equal(200);
        expect(allowedMethods(response)).to.deep.equal(["GET", "HEAD", "OPTIONS", "POST"]);
    });

    // Test 44: OPTIONS on a single todo also allows PUT and DELETE
    it("T44 - OPTIONS /todos/:id - Lists the allowed methods - Undocumented", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(`${TODOS_URL}/${todo.id}`, { method: "OPTIONS" });

            expect(response.status).to.equal(200);
            expect(allowedMethods(response)).to.deep.equal(["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"]);
        });
    });

    // Test 45: PATCH isn't supported (and isn't in the Allow list above)
    it("T45 - PATCH /todos/:id - Is not allowed - Undocumented", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendJson("PATCH", `${TODOS_URL}/${todo.id}`, { title: "Pump up the balls" });

            expect(response.status).to.equal(405);
            expect(await getTodo(todo.id)).to.deep.equal(todo);
            await expectNoSideEffects(afterSetup);
        });
    });

    // Test 46: PUT on the whole collection isn't supported
    it("T46 - PUT /todos - Is not allowed on the collection - Undocumented", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await sendJson("PUT", TODOS_URL, { title: "Rename every todo" });

            expect(response.status).to.equal(405);
            await expectNoSideEffects(before);
        });
    });

    // Test 47: DELETE on the whole collection is refused - good, that would wipe everything
    it("T47 - DELETE /todos - Is not allowed on the collection - Undocumented", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await fetch(TODOS_URL, { method: "DELETE" });

            expect(response.status).to.equal(405);
            await expectNoSideEffects(before);
        });
    });

    // Test 48: sending a title instead of an id to tasksof creates a brand new
    // project and links it to the todo in one call
    it("T48 - POST /todos/:id/tasksof - Creates and links a new project from a title - Undocumented", async function () {
        await withTodo(async ({ todo, afterSetup, created }) => {
            const response = await sendJson("POST", `${TODOS_URL}/${todo.id}/tasksof`, { title: "Spring tournament" });
            const project = await readJson(response);
            created.projects.push(project.id);

            expect(response.status).to.equal(201);
            expect(response.headers.get("location")).to.equal(`projects/${project.id}`);
            expect(project.title).to.equal("Spring tournament");
            expect(idsOf(project.tasks)).to.deep.equal([todo.id]);

            // the new project really exists and the todo points to it
            const saved = await readJson(await fetch(`${BASE_URL}/projects/${project.id}`));
            expect(saved.projects[0].title).to.equal("Spring tournament");
            expect(idsOf((await getTodo(todo.id)).tasksof)).to.deep.equal([project.id]);

            // one new project, and only our todo changed
            const after = await captureSystemState();
            expect(after.projects).to.have.length(afterSetup.projects.length + 1);
            await expectNoSideEffects(afterSetup, { todos: [todo.id], projects: [project.id] });
        });
    });

});