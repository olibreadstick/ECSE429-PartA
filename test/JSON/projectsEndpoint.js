
import { expect } from "chai";
import {
    BASE_URL,
    assertServerReady,
    deleteProject,
    jsonOptions
} from "../testHelpers.js";

describe("/projects endpoint API Calls - JSON", function () {

    before(async function () {
        await assertServerReady();
    });

    beforeEach(function () {
        this.projectId = null;
    });

    afterEach(async function () {
        if (this.projectId != null) {
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

    // Test 1: GET all projects
    it("1 - GET /projects - Returns all project instances - Capability", async function () {
        const response = await fetch(`${BASE_URL}/projects`);
        const data = await response.json();

        expect(response.status).to.equal(200);
        expect(data.projects).to.be.an("array");
    });

    // Test 2: HEAD all projects
    it("2 - HEAD /projects - Returns headers without a response body - Capability", async function () {
        const response = await fetch(`${BASE_URL}/projects`, {
            method: "HEAD"
        });

        const body = await response.text();

        expect(response.status).to.equal(200);
        expect(body).to.equal("");
        expect(response.headers.get("content-type"))
            .to.include("application/json");
    });

    // Test 3: Create a project using JSON
    it("3 - POST /projects - Creates a project using JSON - Capability", async function () {
        const body = {
            title: "ECSE429 Unit Test",
            description: "Testing project creation using JSON"
        };

        const response = await fetch(
            `${BASE_URL}/projects`,
            jsonOptions("POST", body)
        );

        const data = await response.json();
        this.projectId = data.id ?? null;

        expect(response.status).to.equal(201);
        expect(data.title).to.equal(body.title);
        expect(data.description).to.equal(body.description);
        expect(data.id).to.exist;
    });

    // Test 5: Filter projects by an existing title
    it("5 - GET /projects?title - Filters projects by an existing title - Capability", async function () {
        const body = {
            title: `ECSE429 Filter Test ${Date.now()}`,
            description: "Testing project filtering"
        };

        const createResponse = await fetch(
            `${BASE_URL}/projects`,
            jsonOptions("POST", body)
        );

        const created = await createResponse.json();
        this.projectId = created.id ?? null;

        expect(createResponse.status).to.equal(201);
        expect(created.id).to.exist;

        const response = await fetch(
            `${BASE_URL}/projects?title=${encodeURIComponent(body.title)}`
        );

        const data = await response.json();

        expect(response.status).to.equal(200);
        expect(data.projects).to.be.an("array");

        expect(data.projects.some(project =>
            String(project.id) === String(this.projectId)
        )).to.equal(true);

        expect(data.projects.every(project =>
            project.title === body.title
        )).to.equal(true);
    });

    // Test 6: Filter projects by a nonexistent title
    it("6 - GET /projects?title - Returns no projects for a nonexistent title - Capability", async function () {
        const nonexistentTitle = `ECSE429 Nonexistent ${Date.now()}`;

        const response = await fetch(
            `${BASE_URL}/projects?title=${encodeURIComponent(nonexistentTitle)}`
        );

        const data = await response.json();

        expect(response.status).to.equal(200);
        expect(data.projects).to.be.an("array").that.is.empty;
    });

    // Test 7: Create a project without a title
    it("7 - POST /projects - Creates a project without a title - Capability", async function () {
        const body = {
            description: "Testing project creation without a title"
        };

        const response = await fetch(
            `${BASE_URL}/projects`,
            jsonOptions("POST", body)
        );

        const data = await response.json();
        this.projectId = data.id ?? null;

        expect(response.status).to.equal(201);
        expect(data.title).to.equal("");
        expect(data.description).to.equal(body.description);
        expect(data.id).to.exist;
    });

    // Test 8: Submit malformed JSON
    it("8 - POST /projects - Rejects malformed JSON - Error Case", async function () {
        const malformedJSON = '{"title": "ECSE429 Invalid JSON",}';

        const response = await fetch(`${BASE_URL}/projects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: malformedJSON
        });

        const data = await response.json();

        expect(response.status).to.equal(400);
        expect(data.errorMessages).to.be.an("array").that.is.not.empty;
    });

});
