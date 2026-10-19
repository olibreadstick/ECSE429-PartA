import { expect } from "chai";
import {
    TODOS_URL,
    assertServiceRunning,
    asArray,
    expectNoSideEffects,
    getTodo,
    getXml,
    readXml,
    sendXml,
    withRestoredSystem,
    withTodo
} from "../todoHelpers.js";

describe("/todos endpoint API Calls - XML", function () {

    before(assertServiceRunning);

    // Test 49: GET all todos as XML
    it("T49 - GET /todos - Returns all todo instances as XML - Capability", async function () {
        const response = await getXml(TODOS_URL);
        const data = await readXml(response);

        expect(response.status).to.equal(200);
        expect(response.headers.get("content-type")).to.include("application/xml");
        // the seeded todos should be in there
        const titles = asArray(data.todos.todo).map(todo => todo.title);
        expect(titles).to.include.members(["scan paperwork", "file paperwork"]);
    });

    // Test 50: create a todo from an XML body
    it("T50 - POST /todos - Creates a todo from an XML body - Capability", async function () {
        await withRestoredSystem(async ({ before, created }) => {
            const body = `<todo>
                <title>Pick up the new goalkeeper gloves</title>
                <description>Sports store on Main St</description>
                <doneStatus>false</doneStatus>
            </todo>`;

            const response = await sendXml("POST", TODOS_URL, body);
            const todo = (await readXml(response)).todo;
            created.todos.push(todo.id);

            expect(response.status).to.equal(201);
            expect(response.headers.get("content-type")).to.include("application/xml");
            expect(todo.title).to.equal("Pick up the new goalkeeper gloves");

            // check it was really saved (reading it back as JSON)
            const saved = await getTodo(todo.id);
            expect(saved.description).to.equal("Sports store on Main St");
            await expectNoSideEffects(before, { todos: [todo.id] });
        });
    });

    // Test 51: validation errors come back as XML too
    it("T51 - POST /todos - Rejects an XML todo without a title - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const response = await sendXml("POST", TODOS_URL, "<todo><description>Bring extra socks</description></todo>");
            const data = await readXml(response);

            expect(response.status).to.equal(400);
            expect(data.errorMessages.errorMessage).to.include("title : field is mandatory");
            await expectNoSideEffects(before);
        });
    });

    // Test 52: malformed XML (closing tag doesn't match)
    it("T52 - POST /todos - Rejects malformed XML - Error Case", async function () {
        await withRestoredSystem(async ({ before }) => {
            const brokenXml = "<todo><title>Book the team bus</todo>";
            const response = await sendXml("POST", TODOS_URL, brokenXml);

            expect(response.status).to.equal(400);
            expect(await response.text()).to.include("Mismatched");
            await expectNoSideEffects(before);
        });
    });

    // Test 53: query filters work the same way with XML
    it("T53 - GET /todos?doneStatus=true - Filters by done status as XML - Capability", async function () {
        await withTodo(async ({ todo }) => {
            const response = await getXml(`${TODOS_URL}?doneStatus=true`);
            const data = await readXml(response);
            const todos = asArray(data.todos.todo);

            expect(response.status).to.equal(200);
            expect(todos.map(t => t.id)).to.include(todo.id);
            expect(todos.every(t => t.doneStatus === "true")).to.equal(true);
        }, { title: "Send out the match photos", doneStatus: true });
    });

});