import { expect } from "chai";
import {
    TODOS_URL,
    assertServiceRunning,
    captureSystemState,
    expectNoSideEffects,
    readJson,
    sendJson,
    sendRaw,
    typicalTodo,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

async function expectCreationRejected(body, expectedMessage) {
    await withRestoredSystem(async ({ before }) => {
        const response = await sendJson("POST", TODOS_URL, body);
        const data = await readJson(response);

        expect(response.status).to.equal(400);
        expect(data.errorMessages.join(" ")).to.include(expectedMessage);
        await expectNoSideEffects(before);
    });
}

describe("/todos endpoint API Calls - JSON", function () {

    before(assertServiceRunning);

    it("T1 - GET /todos - Returns all todo instances - Capability", async function () {
        const response = await fetch(TODOS_URL);
        const data = await readJson(response);

        expect(response.status).to.equal(200);
        expect(response.headers.get("content-type")).to.include("application/json");
        expect(data.todos).to.be.an("array");
        for (const todo of data.todos) {
            expect(todo).to.include.all.keys("id", "title", "doneStatus", "description");
        }
    });

    it("T2 - HEAD /todos - Returns headers without a body - Capability", async function () {
        const response = await fetch(TODOS_URL, { method: "HEAD" });

        expect(response.status).to.equal(200);
        expect(response.headers.get("content-type")).to.include("application/json");
        expect(await response.text()).to.equal("");
    });

    it("T3 - POST /todos - Creates a todo with typical data - Capability", async function () {
        await withRestoredSystem(async ({ before, created }) => {
            const response = await sendJson("POST", TODOS_URL, typicalTodo);
            const todo = await readJson(response);
            created.todos.push(todo.id);

            expect(response.status).to.equal(201);
            expect(response.headers.get("location")).to.equal(`todos/${todo.id}`);
            expect(todo).to.deep.include({
                title: typicalTodo.title,
                description: typicalTodo.description,
                doneStatus: "false"
            });

            const after = await captureSystemState();
            expect(after.todos).to.have.length(before.todos.length + 1);
            await expectNoSideEffects(before, { todos: [todo.id] });
        });
    });

    it("T4 - POST /todos - Applies defaults when only a title is given - Capability", async function () {
        await withRestoredSystem(async ({ created }) => {
            const response = await sendJson("POST", TODOS_URL, { title: "Order new match balls" });
            const todo = await readJson(response);
            created.todos.push(todo.id);

            expect(response.status).to.equal(201);
            expect(todo.doneStatus).to.equal("false");
            expect(todo.description).to.equal("");
        });
    });

    it("T5 - POST /todos - Rejects a todo without a title - Error Case", async function () {
        await expectCreationRejected({ description: "Bring the first aid kit" }, "title : field is mandatory");
    });

    it("T6 - POST /todos - Rejects an empty title - Error Case", async function () {
        await expectCreationRejected({ title: "" }, "title : can not be empty");
    });

    it("T7 - POST /todos - Rejects doneStatus sent as a string - Error Case", async function () {
        await expectCreationRejected({ title: "Collect registration fees", doneStatus: "true" }, "doneStatus should be BOOLEAN");
    });

    it("T8 - POST /todos - Rejects a client-supplied id - Error Case", async function () {
        await expectCreationRejected({ id: "50", title: "Send lineup to the referee" }, "Not allowed to create with id");
    });

    it("T9 - POST /todos - Rejects an unknown field - Error Case", async function () {
        await expectCreationRejected({ title: "Wash team jerseys", jerseyNumber: "10" }, "Could not find field: jerseyNumber");
    });

    it("T10 - POST /todos - Rejects malformed JSON - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await sendRaw("POST", TODOS_URL, '{"title": "Plan halftime talk",}', "application/json");
            const data = await readJson(response);

            expect(response.status).to.equal(400);
            expect(data.errorMessages[0]).to.include("MalformedJsonException");
            await expectNoSideEffects(before);
        });
    });

    it("T11 - GET /todos?doneStatus=true - Filters by done status - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await fetch(`${TODOS_URL}?doneStatus=true`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data.todos.map(t => t.id)).to.include(todo.id);
            expect(data.todos.every(t => t.doneStatus === "true")).to.equal(true);
        }, { title: "Submit match report", doneStatus: true });
    });

    it("T12 - GET /todos?title - Filters by exact title - Capability", async function () {
        const uniqueTitle = `Scout the opposing team ${Date.now()}`;
        await withTodo(async ({ todo }) => {
            const response = await fetch(`${TODOS_URL}?title=${encodeURIComponent(uniqueTitle)}`);
            const data = await readJson(response);

            expect(response.status).to.equal(200);
            expect(data.todos.map(t => t.id)).to.deep.equal([todo.id]);
        }, { title: uniqueTitle });
    });

    it("T13 - GET /todos?title - Returns no todos for an unmatched title - Capability", async function () {
        const response = await fetch(`${TODOS_URL}?title=${encodeURIComponent("No such training drill")}`);
        const data = await readJson(response);

        expect(response.status).to.equal(200);
        expect(data.todos).to.be.an("array").that.is.empty;
    });

    it("T14 - GET /todos?doneStatus&title - Combines two filters - Capability", async function () {
        const uniqueTitle = `Organize team dinner ${Date.now()}`;
        await withTodo(async ({ todo }) => {
            const matching = await readJson(await fetch(
                `${TODOS_URL}?doneStatus=false&title=${encodeURIComponent(uniqueTitle)}`));
            const notMatching = await readJson(await fetch(
                `${TODOS_URL}?doneStatus=true&title=${encodeURIComponent(uniqueTitle)}`));

            expect(matching.todos.map(t => t.id)).to.deep.equal([todo.id]);
            expect(notMatching.todos).to.be.empty;
        }, { title: uniqueTitle, doneStatus: false });
    });

});