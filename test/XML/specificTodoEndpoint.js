import { expect } from "chai";
import {
    NONEXISTENT_ID,
    TODOS_URL,
    assertServiceRunning,
    expectNoSideEffects,
    getTodo,
    getXml,
    readXml,
    sendXml,
    withTodo
} from "../todoHelpers.js";

describe("/todos/:id endpoint API Calls - XML", function () {

    before(assertServiceRunning);

    // Test 54: GET one todo as XML
    it("T54 - GET /todos/:id - Returns a specific todo as XML - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await getXml(`${TODOS_URL}/${todo.id}`);
            const data = await readXml(response);

            expect(response.status).to.equal(200);
            // same wrapping as JSON: <todos><todo>...</todo></todos>
            expect(data.todos.todo.id).to.equal(todo.id);
            expect(data.todos.todo.title).to.equal(todo.title);
        });
    });

    // Test 55: POST with an XML body only changes the field we send
    it("T55 - POST /todos/:id - Amends a todo from an XML body - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendXml("POST", `${TODOS_URL}/${todo.id}`, "<todo><doneStatus>true</doneStatus></todo>");
            const updated = (await readXml(response)).todo;

            expect(response.status).to.equal(200);
            expect(updated.doneStatus).to.equal("true");
            expect(await getTodo(todo.id)).to.deep.equal({ ...todo, doneStatus: "true" });
            await expectNoSideEffects(afterSetup, { todos: [todo.id] });
        });
    });

    // Test 56: PUT with an XML body
    it("T56 - PUT /todos/:id - Updates the title from an XML body - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            const response = await sendXml("PUT", `${TODOS_URL}/${todo.id}`, "<todo><title>Book pitch for the cup final</title></todo>");

            expect(response.status).to.equal(200);
            expect((await getTodo(todo.id)).title).to.equal("Book pitch for the cup final");
            await expectNoSideEffects(afterSetup, { todos: [todo.id] });
        });
    });

    // Test 57: errors are returned as XML when we ask for XML
    it("T57 - GET /todos/:id - Rejects a nonexistent todo with an XML error - Error Case", async function () {
        const response = await getXml(`${TODOS_URL}/${NONEXISTENT_ID}`);
        const data = await readXml(response);

        expect(response.status).to.equal(404);
        expect(response.headers.get("content-type")).to.include("application/xml");
        expect(data.errorMessages.errorMessage).to.include(`todos/${NONEXISTENT_ID}`);
    });

});