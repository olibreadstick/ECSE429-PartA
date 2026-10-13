
import { expect } from "chai";

import {
    BASE_URL,
    assertServerReady,
    withProject,
    withDeletedProject,
    deleteProject,
    readJSON,
    oneProject,
    jsonOptions,
    getProject
} from "../testHelpers.js";

describe("/projects/:id endpoint API Calls - JSON", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 11: GET existing project
    it("11 - GET /projects/:id - Returns an existing project - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`
            );

            const data = oneProject(await readJSON(response));

            expect(response.status).to.equal(200);
            expect(String(data.id)).to.equal(String(project.id));
            expect(data.title).to.equal(project.title);
            expect(data.description).to.equal(project.description);

        });
    });

    // Test 12: GET nonexistent project
    it("12 - GET /projects/:id - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}`
            );

            expect(response.status).to.equal(404);

            const data = await response.json();
            expect(data.errorMessages).to.be.an("array");

        });
    });

    // Test 13: HEAD existing project
    it("13 - HEAD /projects/:id - Returns project headers without a body - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                { method: "HEAD" }
            );

            const body = await response.text();

            expect(response.status).to.equal(200);
            expect(body).to.equal("");

        });
    });

    // Test 14: HEAD nonexistent project
    it("14 - HEAD /projects/:id - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}`,
                { method: "HEAD" }
            );

            const body = await response.text();

            expect(response.status).to.equal(404);
            expect(body).to.equal("");

        });
    });

    // Test 15: POST update description
    it("15 - POST /projects/:id - Updates the project description - Capability", async function () {

        await withProject(async project => {

            const body = {
                description: "Updated project description"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                jsonOptions("POST", body)
            );

            const data = await response.json();

            expect(response.status).to.equal(200);
            expect(data.description).to.equal(body.description);

        });
    });

    // Test 16: POST preserves an unspecified title
    it("16 - POST /projects/:id - Preserves an unspecified title - Capability", async function () {

        await withProject(async project => {

            const body = {
                description: "Only the description changes"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                jsonOptions("POST", body)
            );

            expect(response.status).to.equal(200);

            const updated = await getProject(project.id);

            expect(updated.title).to.equal(project.title);
            expect(updated.description).to.equal(body.description);

        });
    });

    // Test 17: PUT updates the project title
    it("17 - PUT /projects/:id - Updates the project title - Capability", async function () {

        await withProject(async project => {

            const body = {
                title: "Updated project title"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                jsonOptions("PUT", body)
            );

            expect(response.status).to.equal(200);

            const updated = await getProject(project.id);

            expect(updated.title).to.equal(body.title);

        });
    });

    // Test 18: PUT resets an omitted description
    it("18 - PUT /projects/:id - Resets omitted description - Capability", async function () {

        await withProject(async project => {

            const body = {
                title: "Replacement title"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                jsonOptions("PUT", body)
            );

            expect(response.status).to.equal(200);

            const updated = await getProject(project.id);

            expect(updated.title).to.equal(body.title);
            expect(updated.description).to.equal("");

        });
    });

    // Test 19: GET after update
    it("19 - GET /projects/:id - Returns persisted updates - Capability", async function () {

        await withProject(async project => {

            const body = {
                description: "Persisted after update"
            };

            const update = await fetch(
                `${BASE_URL}/projects/${project.id}`,
                jsonOptions("POST", body)
            );

            expect(update.status).to.equal(200);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`
            );

            expect(response.status).to.equal(200);

            const data = oneProject(await readJSON(response));

            expect(data.description).to.equal(body.description);

        });
    });

    // Test 20: POST update nonexistent project
    it("20 - POST /projects/:id - Rejects an update to a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const body = {
                description: "Invalid update"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${id}`,
                jsonOptions("POST", body)
            );

            expect(response.status).to.equal(404);

            const data = await response.json();

            expect(data.errorMessages).to.be.an("array");

        });
    });

    // Test 21: PUT update nonexistent project
    it("21 - PUT /projects/:id - Rejects replacement of a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const body = {
                title: "Invalid replacement"
            };

            const response = await fetch(
                `${BASE_URL}/projects/${id}`,
                jsonOptions("PUT", body)
            );

            expect(response.status).to.equal(404);

            const data = await response.json();

            expect(data.errorMessages).to.be.an("array");

        });
    });

    // Test 25: DELETE existing project
    it("25 - DELETE /projects/:id - Deletes an existing project - Capability", async function () {

        await withProject(async project => {

            const response = await deleteProject(project.id);

            expect(response.status).to.equal(200);

        });
    });

    // Test 26: GET deleted project
    it("26 - GET /projects/:id - Rejects a deleted project - Error Case", async function () {

        await withProject(async project => {

            const deletion = await deleteProject(project.id);

            expect(deletion.status).to.equal(200);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}`
            );

            expect(response.status).to.equal(404);

        });
    });

    // Test 27: DELETE already-deleted project
    it("27 - DELETE /projects/:id - Rejects deleting a project twice - Error Case", async function () {

        await withProject(async project => {

            const firstDeletion = await deleteProject(project.id);

            expect(firstDeletion.status).to.equal(200);

            const response = await deleteProject(project.id);

            expect(response.status).to.equal(404);

            const data = await response.json();

            expect(data.errorMessages).to.be.an("array");

        });
    });

});
