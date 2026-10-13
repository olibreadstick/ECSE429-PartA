
import { expect } from "chai";
import { XMLParser, XMLValidator } from "fast-xml-parser";

import {
    BASE_URL,
    assertServerReady,
    withProject,
    xmlOptions,
    getProject
} from "../testHelpers.js";

describe("/projects/:id endpoint API Calls - XML", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 22: GET a specific project using XML
    it("22 - GET /projects/:id - Returns a valid XML project response - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                {
                    headers: {
                        "Accept": "application/xml"
                    }
                }
            );

            const xml = await response.text();

            expect(response.status).to.equal(200);
            expect(response.headers.get("content-type")).to.include("xml");
            expect(XMLValidator.validate(xml)).to.equal(true);

            const data = new XMLParser({
                parseTagValue: false
            }).parse(xml);

            expect(data.projects).to.exist;
            expect(xml).to.include(project.title);

        });
    });

    // Test 23: POST partial update using XML
    it("23 - POST /projects/:id - Partially updates a project using XML - Capability", async function () {

        await withProject(async project => {

            const body = `<project>
                <description>Updated using XML POST</description>
            </project>`;

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                xmlOptions("POST", body)
            );

            expect(response.status).to.equal(200);

            const updated = await getProject(project.id);

            expect(updated.description).to.equal("Updated using XML POST");
            expect(updated.title).to.equal(project.title);

        });
    });

    // Test 24: PUT replacement update using XML
    it("24 - PUT /projects/:id - Replaces project fields using XML - Capability", async function () {

        await withProject(async project => {

            const body = `<project>
                <title>XML Replacement Title</title>
            </project>`;

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                xmlOptions("PUT", body)
            );

            expect(response.status).to.equal(200);

            const updated = await getProject(project.id);

            expect(updated.title).to.equal("XML Replacement Title");
            expect(updated.description).to.equal("");

        });
    });

});
