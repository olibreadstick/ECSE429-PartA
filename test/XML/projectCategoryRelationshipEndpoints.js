
import { expect } from "chai";
import { XMLValidator } from "fast-xml-parser";

import {
    BASE_URL,
    assertServerReady,
    withProject
} from "../testHelpers.js";

describe("/projects/:id/categories endpoint API Calls - XML", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 43: GET categories requesting XML
    it("43 - GET /projects/:id/categories - Returns valid XML - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`,
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
