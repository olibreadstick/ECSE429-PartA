
import { expect } from "chai";

import {
    BASE_URL,
    assertServerReady,
    withDeletedProject
} from "../testHelpers.js";

describe("/projects/:id relationship endpoints - Expected Specification Behavior", function () {

    before(async function () {
        await assertServerReady();
    });

    // BUG-01: GET tasks of a nonexistent project
    it("BUG-01 SPEC EXPECTED - GET /projects/:id/tasks - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/tasks`
            );

            expect(response.status).to.equal(404);

        });
    });

    // BUG-02: HEAD tasks of a nonexistent project
    it("BUG-02 SPEC EXPECTED - HEAD /projects/:id/tasks - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/tasks`,
                {
                    method: "HEAD"
                }
            );

            expect(response.status).to.equal(404);

        });
    });

    // BUG-03: GET categories of a nonexistent project
    it("BUG-03 SPEC EXPECTED - GET /projects/:id/categories - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/categories`
            );

            expect(response.status).to.equal(404);

        });
    });

    // BUG-04: HEAD categories of a nonexistent project
    it("BUG-04 SPEC EXPECTED - HEAD /projects/:id/categories - Rejects a nonexistent project - Error Case", async function () {

        await withDeletedProject(async id => {

            const response = await fetch(
                `${BASE_URL}/projects/${id}/categories`,
                {
                    method: "HEAD"
                }
            );

            expect(response.status).to.equal(404);

        });
    });

});

