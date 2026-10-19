import { expect } from "chai";
import {
    SEEDED_PROJECT_ID,
    TODOS_URL,
    assertServiceRunning,
    asArray,
    expectNoSideEffects,
    getXml,
    readXml,
    sendJson,
    withTodo
} from "../todoHelpers.js";

// Creating the link with an XML body doesn't work (BUG-09, see the bug files),
// so these tests create it with JSON and then read / remove it using XML.

describe("/todos/:id/tasksof endpoint API Calls - XML", function () {

    before(assertServiceRunning);

    // Test 58: read a todo's projects as XML
    it("T58 - GET /todos/:id/tasksof - Returns the linked project as XML - Capability", async function () {
        await withTodo(async ({ todo }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}/tasksof`, { id: SEEDED_PROJECT_ID });

            const response = await getXml(`${TODOS_URL}/${todo.id}/tasksof`);
            const data = await readXml(response);
            const projects = asArray(data.projects.project);

            expect(response.status).to.equal(200);
            expect(projects.map(project => project.id)).to.deep.equal([SEEDED_PROJECT_ID]);
        });
    });

    // Test 59: remove the link while asking for XML
    it("T59 - DELETE /todos/:id/tasksof/:id - Removes the link (XML accept) - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}/tasksof`, { id: SEEDED_PROJECT_ID });

            const response = await fetch(`${TODOS_URL}/${todo.id}/tasksof/${SEEDED_PROJECT_ID}`, {
                method: "DELETE",
                headers: { "Accept": "application/xml" }
            });

            expect(response.status).to.equal(200);
            const remaining = await readXml(await getXml(`${TODOS_URL}/${todo.id}/tasksof`));
            expect(asArray(remaining.projects.project)).to.be.empty;
            await expectNoSideEffects(afterSetup);
        });
    });

});