
import { expect } from "chai";

import {
    BASE_URL,
    assertServerReady,
    withDeletedProject,
    readJSON,
    containsId
} from "../testHelpers.js";

describe("/projects/:id relationship endpoints - Observed BUG Behavior", function () {

    before(async function () {
        await assertServerReady();
    });

    // BUG-01: GET tasks of a nonexistent project
    it("BUG-01 OBSERVED - GET /projects/:id/tasks - Returns 200 and unrelated Todos - BUG", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/tasks`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.todos).to.be.an("array").that.is.not.empty;

            // Confirm the returned Todos are not associated
            // with the deleted project.
            for (const todo of data.todos) {

                const relationshipResponse = await fetch(
                    `${BASE_URL}/todos/${todo.id}/tasksof`
                );

                expect(relationshipResponse.status).to.equal(200);

                const relationships = await readJSON(
                    relationshipResponse
                );

                expect(relationships.projects).to.be.an("array");

                expect(
                    containsId(relationships.projects, id)
                ).to.equal(false);
            }

        });
    });

    // BUG-02: HEAD tasks of a nonexistent project
    it("BUG-02 OBSERVED - HEAD /projects/:id/tasks - Returns 200 - BUG", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/tasks`,
                {
                    method: "HEAD"
                }
            );

            const body = await response.text();

            expect(response.status).to.equal(200);
            expect(body).to.equal("");

        });
    });

    // BUG-03: GET categories of a nonexistent project
    it("BUG-03 OBSERVED - GET /projects/:id/categories - Returns 200 and empty list - BUG", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/categories`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.categories).to.be.an("array").that.is.empty;

        });
    });

    // BUG-04: HEAD categories of a nonexistent project
    it("BUG-04 OBSERVED - HEAD /projects/:id/categories - Returns 200 - BUG", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/categories`,
                {
                    method: "HEAD"
                }
            );

            const body = await response.text();

            expect(response.status).to.equal(200);
            expect(body).to.equal("");

        });
    });

});

