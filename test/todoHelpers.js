import { expect } from "chai";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { host, todosEndpoint } from "./testConstants.js";

export const BASE_URL = host;
export const TODOS_URL = `${host}${todosEndpoint}`;
export const NONEXISTENT_ID = "999999";
export const SEEDED_PROJECT_ID = "1";
export const SEEDED_CATEGORY_ID = "1";

const JSON_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
};

const XML_HEADERS = {
    "Content-Type": "application/xml",
    "Accept": "application/xml"
};

// ---------- Readiness ----------

export async function assertServiceRunning() {
    let response;
    try {
        response = await fetch(TODOS_URL);
    } catch (error) {
        throw new Error(`TodoManager API is not running at ${BASE_URL}: ${error.message}`);
    }
    expect(response.status, "TodoManager API readiness check failed").to.equal(200);
}

// ---------- Requests ----------

export function sendJson(method, url, body) {
    return fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

export function sendRaw(method, url, body, contentType) {
    return fetch(url, {
        method,
        headers: { "Content-Type": contentType, "Accept": contentType },
        body
    });
}

export function sendXml(method, url, body) {
    return fetch(url, { method, headers: XML_HEADERS, body });
}

export function getXml(url) {
    return fetch(url, { headers: { "Accept": "application/xml" } });
}

export async function readJson(response) {
    const text = await response.text();
    expect(text, "Expected a JSON response body").to.not.equal("");
    return JSON.parse(text);
}

export async function readXml(response) {
    const xml = await response.text();
    expect(XMLValidator.validate(xml), "Response is not valid XML").to.equal(true);
    return new XMLParser({ parseTagValue: false }).parse(xml);
}

export function asArray(value) {
    if (value === undefined || value === null || value === "") {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

export function idsOf(items) {
    return asArray(items).map(item => String(item.id)).sort();
}

// ---------- Todo fixtures ----------

export const typicalTodo = Object.freeze({
    title: "Book training pitch",
    description: "Field 2, Tuesday 6pm",
    doneStatus: false
});

export async function createTodo(fields = typicalTodo) {
    const response = await sendJson("POST", TODOS_URL, fields);
    expect(response.status, "Todo setup failed").to.equal(201);
    return readJson(response);
}

export async function getTodo(id) {
    const response = await fetch(`${TODOS_URL}/${id}`);
    expect(response.status, `Todo ${id} should exist`).to.equal(200);
    const data = await readJson(response);
    return data.todos[0];
}

export async function todoExists(id) {
    const response = await fetch(`${TODOS_URL}/${id}`);
    return response.status === 200;
}

export async function deleteTodoIfPresent(id) {
    if (await todoExists(id)) {
        const response = await fetch(`${TODOS_URL}/${id}`, { method: "DELETE" });
        expect(response.status, `Cleanup of todo ${id} failed`).to.equal(200);
    }
}

export async function deleteProjectIfPresent(id) {
    const url = `${BASE_URL}/projects/${id}`;
    if ((await fetch(url)).status === 200) {
        const response = await fetch(url, { method: "DELETE" });
        expect(response.status, `Cleanup of project ${id} failed`).to.equal(200);
    }
}

// ---------- System state (save, compare, restore) ----------

function normalise(entities) {
    return asArray(entities)
        .map(entity => {
            const copy = { ...entity };
            for (const key of ["tasks", "tasksof", "categories", "todos", "projects"]) {
                if (copy[key]) {
                    copy[key] = idsOf(copy[key]);
                }
            }
            return copy;
        })
        .sort((a, b) => Number(a.id) - Number(b.id));
}

export async function captureSystemState() {
    const [todos, projects, categories] = await Promise.all(
        ["todos", "projects", "categories"].map(async name => {
            const response = await fetch(`${BASE_URL}/${name}`);
            expect(response.status).to.equal(200);
            return normalise((await readJson(response))[name]);
        })
    );
    return { todos, projects, categories };
}

function withoutIds(entities, excludedIds) {
    const excluded = new Set(excludedIds.map(String));
    return entities.filter(entity => !excluded.has(String(entity.id)));
}

/**
 * Side-effect check: every todo, project and category other than the ones
 * the operation is allowed to touch must be identical to the saved state.
 */
export async function expectNoSideEffects(before, allowed = {}) {
    const after = await captureSystemState();
    for (const collection of ["todos", "projects", "categories"]) {
        const allowedIds = allowed[collection] ?? [];
        expect(
            withoutIds(after[collection], allowedIds),
            `Unexpected change in ${collection}`
        ).to.deep.equal(withoutIds(before[collection], allowedIds));
    }
}

/**
 * Saves the system state, runs the test, then removes anything the test
 * created and confirms the system is exactly as it was before.
 */
export async function withRestoredSystem(testBody) {
    const before = await captureSystemState();
    const created = { todos: [], projects: [] };
    try {
        await testBody({ before, created });
    } finally {
        for (const id of created.todos) {
            await deleteTodoIfPresent(id);
        }
        for (const id of created.projects) {
            await deleteProjectIfPresent(id);
        }
        const after = await captureSystemState();
        expect(after, "System was not restored to its initial state").to.deep.equal(before);
    }
}

/** Creates a todo for one test and guarantees the system is restored afterwards. */
export async function withTodo(testBody, fields = typicalTodo) {
    await withRestoredSystem(async context => {
        const todo = await createTodo(fields);
        context.created.todos.push(todo.id);
        const afterSetup = await captureSystemState();
        await testBody({ ...context, todo, afterSetup });
    });
}

/** Provides the id of a todo that existed and has been deleted. */
export async function withDeletedTodoId(testBody) {
    await withRestoredSystem(async ({ before }) => {
        const todo = await createTodo();
        const response = await fetch(`${TODOS_URL}/${todo.id}`, { method: "DELETE" });
        expect(response.status).to.equal(200);
        await testBody({ before, deletedId: todo.id });
    });
}