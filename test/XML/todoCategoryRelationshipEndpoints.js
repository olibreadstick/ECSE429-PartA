import { expect } from "chai";
import {
    SEEDED_CATEGORY_ID,
    TODOS_URL,
    assertServiceRunning,
    asArray,
    expectNoSideEffects,
    getXml,
    readXml,
    sendJson,
    withTodo
} from "../todoHelpers.js";

// Same as the project version: linking with an XML body fails (BUG-09),
// so the link is made with JSON and then read / removed with XML.

describe("/todos/:id/categories endpoint API Calls - XML", function () {

    before(assertServiceRunning);

    // Test 60: read a todo's categories as XML
    it("T60 - GET /todos/:id/categories - Returns the linked category as XML - Capability", async function () {
        await withTodo(async ({ todo }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}/categories`, { id: SEEDED_CATEGORY_ID });

            const response = await getXml(`${TODOS_URL}/${todo.id}/categories`);
            const data = await readXml(response);
            const categories = asArray(data.categories.category);

            expect(response.status).to.equal(200);
            expect(categories.map(category => category.id)).to.deep.equal([SEEDED_CATEGORY_ID]);
        });
    });

    // Test 61: remove the link while asking for XML
    it("T61 - DELETE /todos/:id/categories/:id - Removes the link (XML accept) - Capability", async function () {
        await withTodo(async ({ todo, afterSetup }) => {
            await sendJson("POST", `${TODOS_URL}/${todo.id}/categories`, { id: SEEDED_CATEGORY_ID });

            const response = await fetch(`${TODOS_URL}/${todo.id}/categories/${SEEDED_CATEGORY_ID}`, {
                method: "DELETE",
                headers: { "Accept": "application/xml" }
            });

            expect(response.status).to.equal(200);
            const remaining = await readXml(await getXml(`${TODOS_URL}/${todo.id}/categories`));
            expect(asArray(remaining.categories.category)).to.be.empty;
            await expectNoSideEffects(afterSetup);
        });
    });

});