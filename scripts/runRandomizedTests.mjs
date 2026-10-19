
import Mocha from "mocha";
import path from "node:path";

// All passing tests projects and todos.
// Specification-expected failures are tested separately.
const testFiles = [
    "test/JSON/projectsEndpoint.js",
    "test/XML/projectsEndpoint.js",
    "test/JSON/specificProjectEndpoint.js",
    "test/XML/specificProjectEndpoint.js",
    "test/JSON/projectTodoRelationshipEndpoints.js",
    "test/XML/projectTodoRelationshipEndpoints.js",
    "test/JSON/projectCategoryRelationshipEndpoints.js",
    "test/XML/projectCategoryRelationshipEndpoints.js",
    "test/JSON/projectBugsObserved.js",
    // todos (yanick)
    "test/JSON/todosEndpoint.js",
    "test/XML/todosEndpoint.js",
    "test/JSON/specificTodoEndpoint.js",
    "test/XML/specificTodoEndpoint.js",
    "test/JSON/todoProjectRelationshipEndpoints.js",
    "test/XML/todoProjectRelationshipEndpoints.js",
    "test/JSON/todoCategoryRelationshipEndpoints.js",
    "test/XML/todoCategoryRelationshipEndpoints.js",
    "test/JSON/todoUndocumentedEndpoints.js",
    "test/JSON/todoBugsObserved.js"
];

// Use a seed so a failed random order can be reproduced.
const seed = Number(process.env.TEST_SEED ?? Date.now()) >>> 0;
let state = seed;

function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Randomize individual tests and nested suites.
function shuffleSuite(suite) {
    shuffle(suite.tests);
    shuffle(suite.suites);

    for (const childSuite of suite.suites) {
        shuffleSuite(childSuite);
    }
}

const mocha = new Mocha({
    reporter: "spec",
    timeout: 10000
});

for (const file of testFiles) {
    mocha.addFile(path.resolve(file));
}

await mocha.loadFilesAsync();

shuffleSuite(mocha.suite);

console.log(`Random execution seed: ${seed}`);

mocha.run(failures => {
    process.exitCode = failures === 0 ? 0 : 1;
});

