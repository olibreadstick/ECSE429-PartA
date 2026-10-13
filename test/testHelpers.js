
import { expect } from "chai";
import { host, projectsEndpoint } from "./testConstants.js";

export const BASE_URL = host;

export async function assertServerReady() {
    let response;
    try {
        response = await fetch(`${BASE_URL}${projectsEndpoint}`);
    } catch (error) {
        throw new Error(`TodoManager API is unavailable at ${BASE_URL}: ${error.message}`);
    }
    expect(response.status, "TodoManager API readiness check failed").to.equal(200);
}

export async function readJSON(response) {
    const text = await response.text();
    expect(text, "Expected a JSON response body").to.not.equal("");
    return JSON.parse(text);
}

export function oneProject(data) {
    return Array.isArray(data.projects) ? data.projects[0]
        : data.projects ?? data.project ?? data;
}

export function oneTodo(data) {
    return Array.isArray(data.todos) ? data.todos[0]
        : data.todos ?? data.todo ?? data;
}

export function ids(items = []) {
    return (items ?? []).map(item => String(item.id)).sort();
}

export function containsId(items, id) {
    return Array.isArray(items) && items.some(item => String(item.id) === String(id));
}

export function jsonOptions(method, body) {
    return {
        method,
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(body)
    };
}

export function xmlOptions(method, body) {
    return {
        method,
        headers: {
            "Content-Type": "application/xml",
            "Accept": "application/xml"
        },
        body
    };
}

export async function createProject() {
    const project = {
        title: `ECSE429 Temp ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: "Original project description"
    };

    const response = await fetch(
        `${BASE_URL}/projects`,
        jsonOptions("POST", project)
    );

    expect(response.status, "Project setup failed").to.equal(201);

    const data = oneProject(await readJSON(response));
    expect(data?.id, "Project setup did not return an ID").to.exist;

    return { id: data.id, ...project };
}

export async function deleteProject(id) {
    return fetch(`${BASE_URL}/projects/${id}`, {
        method: "DELETE"
    });
}

// Create a temporary project and clean it up after the test.
export async function withProject(testBody) {
    const project = await createProject();

    try {
        return await testBody(project);
    } finally {
        const check = await fetch(
            `${BASE_URL}/projects/${project.id}`
        );

        if (check.status === 200) {
            const cleanup = await deleteProject(project.id);

            expect(
                cleanup.status,
                "Temporary project cleanup failed"
            ).to.equal(200);
        } else {
            expect(
                check.status,
                "Unexpected status during cleanup"
            ).to.equal(404);
        }
    }
}

// Create a project, delete it, and use its ID for invalid-ID tests.
export async function withDeletedProject(testBody) {
    return withProject(async project => {
        const deletion = await deleteProject(project.id);

        expect(
            deletion.status,
            "Could not prepare deleted project"
        ).to.equal(200);

        return testBody(project.id);
    });
}

export async function getProject(id) {
    const response = await fetch(`${BASE_URL}/projects/${id}`);

    expect(response.status).to.equal(200);

    return oneProject(await readJSON(response));
}

export async function getTodo(id) {
    const response = await fetch(`${BASE_URL}/todos/${id}`);

    expect(
        response.status,
        `Unable to retrieve existing Todo ${id}`
    ).to.equal(200);

    return oneTodo(await readJSON(response));
}

export async function chooseExistingTodo() {
    const response = await fetch(`${BASE_URL}/todos`);

    expect(response.status).to.equal(200);

    const data = await readJSON(response);

    expect(
        data.todos,
        "GET /todos must return an array"
    ).to.be.an("array");

    expect(
        data.todos.length,
        "Tests need at least one existing Todo"
    ).to.be.greaterThan(0);

    return getTodo(data.todos[0].id);
}

export async function chooseExistingCategory() {
    const response = await fetch(`${BASE_URL}/categories`);

    expect(response.status).to.equal(200);

    const data = await readJSON(response);

    expect(
        data.categories,
        "GET /categories must return an array"
    ).to.be.an("array");

    expect(
        data.categories.length,
        "Tests need at least one existing category"
    ).to.be.greaterThan(0);

    return data.categories[0];
}

// Project-Todo relationship helpers.
export async function linkTodo(projectId, todoId) {
    return fetch(
        `${BASE_URL}/projects/${projectId}/tasks`,
        jsonOptions("POST", { id: String(todoId) })
    );
}

export async function unlinkTodo(projectId, todoId) {
    return fetch(
        `${BASE_URL}/projects/${projectId}/tasks/${todoId}`,
        { method: "DELETE" }
    );
}

// Project-Category relationship helpers.
export async function linkCategory(projectId, categoryId) {
    return fetch(
        `${BASE_URL}/projects/${projectId}/categories`,
        jsonOptions("POST", { id: String(categoryId) })
    );
}

export async function unlinkCategory(projectId, categoryId) {
    return fetch(
        `${BASE_URL}/projects/${projectId}/categories/${categoryId}`,
        { method: "DELETE" }
    );
}

// Preserve the original Todo and its existing project relationships.
export async function withExistingTodoProject(testBody) {
    const original = await chooseExistingTodo();
    const originalIds = ids(original.tasksof);

    return withProject(async project => {
        try {
            return await testBody({
                project,
                todoId: original.id,
                original,
                originalIds
            });
        } finally {
            const current = await getTodo(original.id);

            if (containsId(current.tasksof, project.id)) {
                const cleanup = await unlinkTodo(
                    project.id,
                    original.id
                );

                expect(
                    cleanup.status,
                    "Todo relationship cleanup failed"
                ).to.equal(200);
            }

            const preserved = await getTodo(original.id);

            expect(ids(preserved.tasksof))
                .to.deep.equal(originalIds);

            expect(String(preserved.id))
                .to.equal(String(original.id));

            expect(preserved.title)
                .to.equal(original.title);

            expect(preserved.description)
                .to.equal(original.description);

            expect(preserved.doneStatus)
                .to.equal(original.doneStatus);
        }
    });
}

// Preserve the original category and remove temporary relationships.
export async function withExistingCategoryProject(testBody) {
    const original = await chooseExistingCategory();

    return withProject(async project => {
        try {
            return await testBody({
                project,
                categoryId: original.id,
                original
            });
        } finally {
            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`
            );

            expect(
                response.status,
                "Unable to inspect category cleanup"
            ).to.equal(200);

            const data = await readJSON(response);

            if (containsId(data.categories, original.id)) {
                const cleanup = await unlinkCategory(
                    project.id,
                    original.id
                );

                expect(
                    cleanup.status,
                    "Category relationship cleanup failed"
                ).to.equal(200);
            }

            const detailResponse = await fetch(
                `${BASE_URL}/categories/${original.id}`
            );

            expect(
                detailResponse.status,
                "Original category must still exist"
            ).to.equal(200);

            const detail = await readJSON(detailResponse);

            const saved = Array.isArray(detail.categories)
                ? detail.categories[0]
                : detail.category ?? detail;

            expect(String(saved.id))
                .to.equal(String(original.id));

            expect(saved.title)
                .to.equal(original.title);

            expect(saved.description)
                .to.equal(original.description);
        }
    });
}
