
import { expect } from "chai";

import {
    BASE_URL,
    assertServerReady,
    withProject,
    withExistingCategoryProject,
    linkCategory,
    unlinkCategory,
    readJSON,
    containsId
} from "../testHelpers.js";

describe("/projects/:id/categories & /projects/:id/categories/:id endpoint API Calls - JSON", function () {

    before(async function () {
        await assertServerReady();
    });

    // Test 37: GET categories for a new project
    it("37 - GET /projects/:id/categories - Returns no categories for a new project - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data).to.deep.equal({ categories: [] });

        });
    });

    // Test 38: POST associate an existing category
    it("38 - POST /projects/:id/categories - Associates an existing category - Capability", async function () {

        await withExistingCategoryProject(async ({ project, categoryId }) => {

            const response = await linkCategory(project.id, categoryId);

            expect(response.status).to.equal(201);

        });
    });

    // Test 39: GET categories after association
    it("39 - GET /projects/:id/categories - Returns the associated category - Capability", async function () {

        await withExistingCategoryProject(async ({ project, categoryId }) => {

            const association = await linkCategory(project.id, categoryId);

            expect(association.status).to.equal(201);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.categories).to.be.an("array");

            expect(
                containsId(data.categories, categoryId)
            ).to.equal(true);

        });
    });

    // Test 40: HEAD categories for existing project
    it("40 - HEAD /projects/:id/categories - Returns headers without body - Capability", async function () {

        await withProject(async project => {

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`,
                {
                    method: "HEAD"
                }
            );

            const body = await response.text();

            expect(response.status).to.equal(200);
            expect(body).to.equal("");

        });
    });

    // Test 41: DELETE project-category association
    it("41 - DELETE /projects/:id/categories/:id - Removes an association - Capability", async function () {

        await withExistingCategoryProject(async ({ project, categoryId }) => {

            const association = await linkCategory(project.id, categoryId);

            expect(association.status).to.equal(201);

            const response = await unlinkCategory(project.id, categoryId);

            expect(response.status).to.equal(200);

        });
    });

    // Test 42: GET categories after removal
    it("42 - GET /projects/:id/categories - Confirms association removal - Capability", async function () {

        await withExistingCategoryProject(async ({ project, categoryId }) => {

            const association = await linkCategory(project.id, categoryId);

            expect(association.status).to.equal(201);

            const deletion = await unlinkCategory(project.id, categoryId);

            expect(deletion.status).to.equal(200);

            const response = await fetch(
                `${BASE_URL}/projects/${project.id}/categories`
            );

            expect(response.status).to.equal(200);

            const data = await readJSON(response);

            expect(data.categories).to.be.an("array");

            expect(
                containsId(data.categories, categoryId)
            ).to.equal(false);

        });
    });

});
