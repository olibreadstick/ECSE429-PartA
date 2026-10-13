
import { expect } from "chai";

import {
    BASE_URL,
    assertServerReady,
    withProject,
    withExistingTodoProject,
    linkTodo,
    unlinkTodo,
    readJSON,
    getTodo,
    ids,
    containsId
} from "../testHelpers.js";

describe("/projects/:id/tasks & /projects/:id/tasks/:id endpoint API Calls - JSON", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 28: GET tasks for a newly created project
    it("28 - GET /projects/:id/tasks - Returns no tasks for a new project - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/tasks`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data).to.deep.equal({ todos: [] });

        });
    });

    // Test 29: POST associate an existing Todo
    it("29 - POST /projects/:id/tasks - Associates an existing Todo - Capability", async function () {

        await withExistingTodoProject(async ({ project, todoId }) => {

            const response = await linkTodo(project.id, todoId);

            expect(response.status).to.equal(201);

        });
    });

    // Test 30: GET tasks after association
    it("30 - GET /projects/:id/tasks - Returns the associated Todo - Capability", async function () {

        await withExistingTodoProject(async ({ project, todoId }) => {

            const association = await linkTodo(project.id, todoId);

            expect(association.status).to.equal(201);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/tasks`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.todos).to.be.an("array");
            expect(containsId(data.todos, todoId)).to.equal(true);

        });
    });

    // Test 31: GET Todo project relationships after association
    it("31 - GET /todos/:id/tasksof - References the temporary project - Capability", async function () {

        await withExistingTodoProject(async ({
            project,
            todoId,
            originalIds
        }) => {

            const association = await linkTodo(project.id, todoId);

            expect(association.status).to.equal(201);

            const response = await fetch(
                `${BASE_URL}/todos/${todoId}/tasksof`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.projects).to.be.an("array");

            // The temporary project should now be associated.
            expect(
                containsId(data.projects, project.id)
            ).to.equal(true);

            // All original project relationships must remain.
            for (const id of originalIds) {
                expect(
                    containsId(data.projects, id)
                ).to.equal(true);
            }

        });
    });

    // Test 32: HEAD tasks for an existing project
    it("32 - HEAD /projects/:id/tasks - Returns headers without body - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/tasks`,
                {
                    method: "HEAD"
                }
            );

            const body = await response.text();

            expect(response.status).to.equal(200);
            expect(body).to.equal("");

        });
    });

    // Test 33: DELETE existing project-Todo association
    it("33 - DELETE /projects/:id/tasks/:id - Removes an association - Capability", async function () {

        await withExistingTodoProject(async ({ project, todoId }) => {

            const association = await linkTodo(project.id, todoId);

            expect(association.status).to.equal(201);

            const response = await unlinkTodo(project.id, todoId);

            expect(response.status).to.equal(200);

        });
    });

    // Test 34: GET tasks after removal
    it("34 - GET /projects/:id/tasks - Confirms association removal - Capability", async function () {

        await withExistingTodoProject(async ({ project, todoId }) => {

            const association = await linkTodo(project.id, todoId);

            expect(association.status).to.equal(201);

            const deletion = await unlinkTodo(project.id, todoId);

            expect(deletion.status).to.equal(200);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/tasks`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.todos).to.be.an("array");

            expect(
                containsId(data.todos, todoId)
            ).to.equal(false);

        });
    });

    // Test 35: GET Todo after removal
    it("35 - GET /todos/:id - Preserves the Todo and original project relationships - Capability", async function () {

        await withExistingTodoProject(async ({
            project,
            todoId,
            original,
            originalIds
        }) => {

            const association = await linkTodo(project.id, todoId);

            expect(association.status).to.equal(201);

            const deletion = await unlinkTodo(project.id, todoId);

            expect(deletion.status).to.equal(200);

            // Verify the original Todo still exists and is unchanged.
            const todo = await getTodo(todoId);

            expect(String(todo.id)).to.equal(String(original.id));
            expect(todo.title).to.equal(original.title);
            expect(todo.description).to.equal(original.description);
            expect(todo.doneStatus).to.equal(original.doneStatus);

            // Verify its original project relationships were restored.
            const response = await fetch(
                `${BASE_URL}/todos/${todoId}/tasksof`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.projects).to.be.an("array");

            expect(ids(data.projects)).to.deep.equal(originalIds);

        });
    });

});
