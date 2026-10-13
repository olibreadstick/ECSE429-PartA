
import { expect } from "chai";
import { XMLValidator } from "fast-xml-parser";

import {
    BASE_URL,
    assertServerReady,
    withProject
} from "../testHelpers.js";

describe("/projects/:id/tasks endpoint API Calls - XML", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 36: GET tasks requesting XML
    it("36 - GET /projects/:id/tasks - Returns valid XML - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/tasks`,
                {
                    headers: {
                        "Accept": "application/xml"
                    }
                }
            );

            const xml = await response.text();

            expect(response.status).to.equal(200);

            expect(
                response.headers.get("content-type")
            ).to.include("xml");

            expect(XMLValidator.validate(xml)).to.equal(true);

        });
    });

});
