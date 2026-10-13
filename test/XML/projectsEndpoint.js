
import { expect } from "chai";
import { XMLParser, XMLValidator } from "fast-xml-parser";

import {
    BASE_URL,
    assertServerReady,
    deleteProject,
    xmlOptions
} from "../testHelpers.js";

describe("/projects endpoint API Calls - XML", function () {

    before(async function () {
        await assertServerReady();
    });

    beforeEach(function () {
        this.projectId = null;
    });

    afterEach(async function () {
        if (this.projectId !== null) {
            const response = await fetch(
                `${BASE_URL}/projects/${this.projectId}`
            );

            if (response.status === 200) {
                const cleanup = await deleteProject(this.projectId);
                expect(cleanup.status).to.equal(200);
            } else {
                expect(response.status).to.equal(404);
            }
        }
    });

    // Test 4: Create a project using XML
    it("4 - POST /projects - Creates a project using XML - Capability", async function () {

        const body = `
            <project>
                <title>ECSE429 XML Unit Test</title>
                <description>Testing XML creation</description>
            </project>
        `;

        const response = await fetch(
            `${BASE_URL}/projects`,
            xmlOptions("POST", body)
        );

        const xml = await response.text();

        const parser = new XMLParser({
            parseTagValue: false
        });

        const data = parser.parse(xml);
        const project = data.project;

        this.projectId = project?.id ?? null;

        expect(response.status).to.equal(201);
        expect(response.headers.get("content-type"))
            .to.include("application/xml");

        expect(XMLValidator.validate(xml)).to.equal(true);
        expect(project.title).to.equal("ECSE429 XML Unit Test");
        expect(project.description).to.equal("Testing XML creation");
        expect(project.id).to.exist;
    });

    // Test 9: Submit malformed XML
    it("9 - POST /projects - Rejects malformed XML - Error Case", async function () {

        const body = `<project>
            <title>ECSE429 Invalid XML</title>
            <description>Testing malformed XML</description>`;

        expect(XMLValidator.validate(body)).to.not.equal(true);

        const response = await fetch(
            `${BASE_URL}/projects`,
            xmlOptions("POST", body)
        );

        const xml = await response.text();

        expect(response.status).to.equal(400);

        // Verify that the server returned an error message.
        expect(xml).to.include("errorMessage");
    });

    // Test 10: Retrieve all projects in XML
    it("10 - GET /projects - Returns all project instances using XML - Capability", async function () {

        const response = await fetch(`${BASE_URL}/projects`, {
            headers: {
                "Accept": "application/xml"
            }
        });

        const xml = await response.text();

        expect(response.status).to.equal(200);
        expect(response.headers.get("content-type"))
            .to.include("application/xml");

        expect(XMLValidator.validate(xml)).to.equal(true);

        const parser = new XMLParser({
            parseTagValue: false
        });

        const data = parser.parse(xml);

        expect(data).to.have.property("projects");
    });

});
