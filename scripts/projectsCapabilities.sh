#!/usr/bin/env bash
# ECSE 429 Part A — Projects API capability demonstration
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4567}"
response_file=$(mktemp)
project_id=""
xml_project_id=""
titleless_project_id=""
deleted_project_id=""
linked_task_id=""
linked_category_id=""
status=""

cleanup() {
    # First unlink relationships, then delete the temporary projects.
    # This also handles interruption or failure during a relationship test.
    if [[ -n "$project_id" && -n "$linked_task_id" ]]; then
        code=$(curl -sS -o /dev/null -w '%{http_code}' \
            -X DELETE "$BASE_URL/projects/$project_id/tasks/$linked_task_id" 2>/dev/null) || code="unreachable"
        echo "Cleanup: DELETE project-task association -> HTTP $code"
    fi
    if [[ -n "$project_id" && -n "$linked_category_id" ]]; then
        code=$(curl -sS -o /dev/null -w '%{http_code}' \
            -X DELETE "$BASE_URL/projects/$project_id/categories/$linked_category_id" 2>/dev/null) || code="unreachable"
        echo "Cleanup: DELETE project-category association -> HTTP $code"
    fi
    for id in "$project_id" "$xml_project_id" "$titleless_project_id"; do
        if [[ -n "$id" ]]; then
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -X DELETE "$BASE_URL/projects/$id" 2>/dev/null) || code="unreachable"
            echo "Cleanup: DELETE /projects/$id -> HTTP $code"
        fi
    done
    rm -f "$response_file"
}
trap cleanup EXIT

step=0
heading() {
    step=$((step + 1))
    printf '\n========== Test %d: %s ==========\n' "$step" "$1"
}

request() {
    local method="$1" path="$2" accept="${3:-application/json}"
    local body="${4:-}" content_type="${5:-}"
    local -a args=(-sS -o "$response_file" -w '%{http_code}' -H "Accept: $accept")

    if [[ "$method" == "HEAD" ]]; then
        args+=(-I)
    else
        args+=(-X "$method")
    fi
    if [[ -n "$body" ]]; then
        args+=(-H "Content-Type: $content_type" --data "$body")
    fi
    status=$(curl "${args[@]}" "$BASE_URL$path")
    echo "$method $path -> HTTP $status"
    if [[ "$method" != "HEAD" ]]; then
        cat "$response_file"
        echo
    fi
}

expect_status() {
    local expected="$1"
    if [[ "$status" != "$expected" ]]; then
        echo "FAIL: Expected HTTP $expected, received $status" >&2
        exit 1
    fi
    echo "PASS: HTTP $expected"
}

# Assert attributes in either a JSON project object, a JSON {projects:[...]}
# response, or the equivalent XML project representation.
verify_project() {
    python3 - "$response_file" "$1" "$2" "$3" "$4" <<'PY'
import json
import sys
import xml.etree.ElementTree as ET

path, expected_id, expected_title, expected_description, format_name = sys.argv[1:]
if format_name == "json":
    with open(path, encoding="utf-8") as source:
        payload = json.load(source)
    project = payload["projects"][0] if "projects" in payload else payload
    values = {field: str(project.get(field, "")) for field in ("id", "title", "description")}
else:
    root = ET.parse(path).getroot()
    node = root if root.tag == "project" else root.find("project")
    if node is None:
        raise AssertionError("No project element found")
    values = {field: node.findtext(field, default="") or "" for field in ("id", "title", "description")}

expected = {"id": expected_id, "title": expected_title, "description": expected_description}
assert values == expected, f"Expected {expected}, got {values}"
print("PASS: Project ID, title, and description match")
PY
}

get_created_id() {
    python3 - "$response_file" "$1" <<'PY'
import json
import sys
import xml.etree.ElementTree as ET

path, fmt = sys.argv[1:]
if fmt == "json":
    with open(path, encoding="utf-8") as source:
        value = json.load(source)["id"]
else:
    value = ET.parse(path).getroot().findtext("id")
if not value or not str(value).isdigit():
    raise ValueError("Response did not include a valid numeric project ID")
print(value)
PY
}

printf '========================================\nECSE 429 - Projects API Capabilities\n========================================\n'

heading 'GET /projects - list existing projects'
request GET '/projects'
expect_status 200

heading 'POST /projects - create JSON project'
request POST '/projects' 'application/json' \
    '{"title":"ECSE429 Capability Demo","description":"Temporary project for API testing"}' \
    'application/json'
expect_status 201
project_id=$(get_created_id json)
echo "Created Project ID: $project_id"
verify_project "$project_id" 'ECSE429 Capability Demo' 'Temporary project for API testing' json

heading 'GET /projects/:id - retrieve the newly created project'
request GET "/projects/$project_id"
expect_status 200
verify_project "$project_id" 'ECSE429 Capability Demo' 'Temporary project for API testing' json

heading 'POST /projects/:id - partial JSON update'
request POST "/projects/$project_id" 'application/json' \
    '{"description":"Updated description using POST"}' 'application/json'
expect_status 200
verify_project "$project_id" 'ECSE429 Capability Demo' 'Updated description using POST' json

heading 'GET /projects/:id - verify POST update persisted'
request GET "/projects/$project_id"
expect_status 200
verify_project "$project_id" 'ECSE429 Capability Demo' 'Updated description using POST' json

heading 'PUT /projects/:id - update title, reset omitted description'
request PUT "/projects/$project_id" 'application/json' \
    '{"title":"Updated ECSE429 Capability Demo"}' 'application/json'
expect_status 200
verify_project "$project_id" 'Updated ECSE429 Capability Demo' '' json

heading 'GET /projects/:id - verify PUT update persisted'
request GET "/projects/$project_id"
expect_status 200
verify_project "$project_id" 'Updated ECSE429 Capability Demo' '' json

heading 'HEAD /projects - inspect collection headers'
request HEAD '/projects'
expect_status 200

heading 'HEAD /projects/:id - existing project'
request HEAD "/projects/$project_id"
expect_status 200

heading 'GET /projects/:id - nonexistent project'
request GET '/projects/99999'
expect_status 404

heading 'HEAD /projects/:id - nonexistent project'
request HEAD '/projects/99999'
expect_status 404

heading 'GET /projects?title=... - matching filter'
request GET '/projects?title=Updated%20ECSE429%20Capability%20Demo'
expect_status 200
python3 - "$response_file" "$project_id" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    projects = json.load(source)["projects"]
assert any(str(project["id"]) == sys.argv[2] for project in projects)
print("PASS: Filter result contains the temporary project")
PY

heading 'GET /projects?title=... - nonmatching filter'
request GET '/projects?title=NonexistentProject429Capability'
expect_status 200
python3 - "$response_file" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    projects = json.load(source)["projects"]
assert projects == [], f"Expected an empty list, got {projects}"
print("PASS: Unknown title returned an empty list")
PY

heading 'POST /projects - omitted title (observed behavior)'
request POST '/projects' 'application/json' \
    '{"description":"Project created without a title"}' 'application/json'
expect_status 201
titleless_project_id=$(get_created_id json)
verify_project "$titleless_project_id" '' 'Project created without a title' json

heading 'POST /projects - malformed JSON'
request POST '/projects' 'application/json' \
    '{"title":"Malformed Project","description":"Invalid",}' 'application/json'
expect_status 400

heading 'GET /projects - XML response format'
request GET '/projects' 'application/xml'
expect_status 200
python3 - "$response_file" <<'PY'
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
assert root.tag == "projects", f"Unexpected XML root: {root.tag}"
print("PASS: Valid XML projects response")
PY

heading 'GET /projects/:id - XML response format'
request GET "/projects/$project_id" 'application/xml'
expect_status 200
verify_project "$project_id" 'Updated ECSE429 Capability Demo' '' xml

heading 'POST /projects - create XML project'
request POST '/projects' 'application/xml' \
    '<project><title>ECSE429 XML Demo</title><description>Temporary XML project</description></project>' \
    'application/xml'
expect_status 201
xml_project_id=$(get_created_id xml)
echo "Created XML Project ID: $xml_project_id"
verify_project "$xml_project_id" 'ECSE429 XML Demo' 'Temporary XML project' xml

heading 'GET /projects/:id - retrieve XML-created project'
request GET "/projects/$xml_project_id" 'application/xml'
expect_status 200
verify_project "$xml_project_id" 'ECSE429 XML Demo' 'Temporary XML project' xml

heading 'POST /projects/:id - partial XML update'
request POST "/projects/$xml_project_id" 'application/xml' \
    '<project><description>Updated using XML POST</description></project>' 'application/xml'
expect_status 200
verify_project "$xml_project_id" 'ECSE429 XML Demo' 'Updated using XML POST' xml

heading 'PUT /projects/:id - XML replacement-style update'
request PUT "/projects/$xml_project_id" 'application/xml' \
    '<project><title>Updated ECSE429 XML Demo</title></project>' 'application/xml'
expect_status 200
verify_project "$xml_project_id" 'Updated ECSE429 XML Demo' '' xml

heading 'GET /projects/:id - verify XML PUT persisted'
request GET "/projects/$xml_project_id" 'application/xml'
expect_status 200
verify_project "$xml_project_id" 'Updated ECSE429 XML Demo' '' xml

heading 'GET /projects/:id - nonexistent project, XML error'
request GET '/projects/99999' 'application/xml'
expect_status 404
python3 - "$response_file" <<'PY'
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
assert root.tag == "errorMessages"
print("PASS: XML error payload returned")
PY

heading 'POST /projects - malformed XML'
request POST '/projects' 'application/xml' \
    '<project><title>Malformed XML Project</title><description>Invalid</project>' \
    'application/xml'
expect_status 400

# Project-task and project-category relationship demonstrations below use
# the temporary JSON project. They never change Project 1. We select existing
# related objects dynamically instead of assuming that IDs 1 and 2 exist.

heading 'GET /projects/:id/tasks - new project initially has no tasks'
request GET "/projects/$project_id/tasks"
expect_status 200
python3 - "$response_file" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    assert json.load(f)["todos"] == [], "Expected empty task list"
print("PASS: Newly created project has no linked tasks")
PY_CHECK

heading 'GET /todos - identify an existing task for relationship testing'
request GET '/todos'
expect_status 200
task_id=$(python3 - "$response_file" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["todos"]
if not items:
    raise SystemExit("FAIL: No existing todos to associate; add a todo before testing relationships")
print(items[0]["id"])
PY_CHECK
)
echo "Using existing Task ID: $task_id (task will not be deleted)"

heading 'POST /projects/:id/tasks - associate existing task'
request POST "/projects/$project_id/tasks" 'application/json' \
    "{\"id\":\"$task_id\"}" 'application/json'
expect_status 201
linked_task_id="$task_id"

heading 'GET /projects/:id/tasks - verify task association'
request GET "/projects/$project_id/tasks"
expect_status 200
python3 - "$response_file" "$task_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["todos"]
assert any(str(item["id"]) == sys.argv[2] for item in items)
print("PASS: New project contains the associated task")
PY_CHECK

heading 'GET /todos/:id - verify task-project association from todo side'
request GET "/todos/$task_id"
expect_status 200
python3 - "$response_file" "$project_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    payload = json.load(f)
items = payload["todos"] if "todos" in payload else [payload]
assert any(str(rel["id"]) == sys.argv[2]
           for item in items for rel in item.get("tasksof", []))
print("PASS: Task lists the temporary project")
PY_CHECK

heading 'HEAD /projects/:id/tasks - existing project relationship endpoint'
request HEAD "/projects/$project_id/tasks"
expect_status 200

heading 'DELETE /projects/:id/tasks/:taskId - remove task association'
request DELETE "/projects/$project_id/tasks/$task_id"
expect_status 200
linked_task_id=""

heading 'GET /projects/:id/tasks - confirm task association removed'
request GET "/projects/$project_id/tasks"
expect_status 200
python3 - "$response_file" "$task_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["todos"]
assert not any(str(item["id"]) == sys.argv[2] for item in items)
print("PASS: Task relationship was removed")
PY_CHECK

heading 'GET /todos/:id - verify todo remains after unlinking'
request GET "/todos/$task_id"
expect_status 200
python3 - "$response_file" "$project_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    payload = json.load(f)
items = payload["todos"] if "todos" in payload else [payload]
assert items, "Task should still exist"
assert not any(str(rel["id"]) == sys.argv[2]
               for item in items for rel in item.get("tasksof", []))
print("PASS: Task still exists and is no longer linked to temporary project")
PY_CHECK

heading 'GET /projects/:id/categories - new project initially has no categories'
request GET "/projects/$project_id/categories"
expect_status 200
python3 - "$response_file" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    assert json.load(f)["categories"] == [], "Expected empty category list"
print("PASS: Temporary project has no linked categories")
PY_CHECK

heading 'GET /categories - identify existing category for relationship testing'
request GET '/categories'
expect_status 200
category_id=$(python3 - "$response_file" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["categories"]
if not items:
    raise SystemExit("FAIL: No existing categories to associate; add one before testing relationships")
print(items[0]["id"])
PY_CHECK
)
echo "Using existing Category ID: $category_id (category will not be deleted)"

heading 'POST /projects/:id/categories - associate existing category'
request POST "/projects/$project_id/categories" 'application/json' \
    "{\"id\":\"$category_id\"}" 'application/json'
expect_status 201
linked_category_id="$category_id"

heading 'GET /projects/:id/categories - verify category association'
request GET "/projects/$project_id/categories"
expect_status 200
python3 - "$response_file" "$category_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["categories"]
assert any(str(item["id"]) == sys.argv[2] for item in items)
print("PASS: Category is linked to temporary project")
PY_CHECK

heading 'HEAD /projects/:id/categories - existing project endpoint'
request HEAD "/projects/$project_id/categories"
expect_status 200

heading 'DELETE /projects/:id/categories/:categoryId - remove category association'
request DELETE "/projects/$project_id/categories/$category_id"
expect_status 200
linked_category_id=""

heading 'GET /projects/:id/categories - confirm association removed'
request GET "/projects/$project_id/categories"
expect_status 200
python3 - "$response_file" "$category_id" <<'PY_CHECK'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)["categories"]
assert not any(str(item["id"]) == sys.argv[2] for item in items)
print("PASS: Category association removed")
PY_CHECK

# These four checks demonstrate the suspicious responses discovered in
# the exploratory charter. Repeatability/frequency is assessed separately.
# Unlike the positive tests, we REPORT these statuses rather than treating
# a 200 as correct behavior.
heading 'GET /projects/99999/tasks - investigate BUG-01 (JSON)'
request GET '/projects/99999/tasks'
echo "OBSERVED: HTTP $status (404 would indicate invalid project)"

heading 'GET /projects/99999/tasks - investigate BUG-01 (XML)'
request GET '/projects/99999/tasks' 'application/xml'
echo "OBSERVED: HTTP $status (JSON/XML comparison)"

heading 'HEAD /projects/99999/tasks - investigate BUG-02'
request HEAD '/projects/99999/tasks'
echo "OBSERVED: HTTP $status (404 would indicate invalid project)"

heading 'GET /projects/99999/categories - investigate BUG-03'
request GET '/projects/99999/categories'
echo "OBSERVED: HTTP $status (404 would indicate invalid project)"

heading 'HEAD /projects/99999/categories - investigate BUG-04'
request HEAD '/projects/99999/categories'
echo "OBSERVED: HTTP $status (404 would indicate invalid project)"

heading 'DELETE /projects/:id - delete XML-created project'
request DELETE "/projects/$xml_project_id" 'application/xml'
expect_status 200
# Keep the ID recorded until successful cleanup confirmation; repeated DELETE is safe.
request GET "/projects/$xml_project_id" 'application/xml'
expect_status 404
xml_project_id=""
echo 'PASS: XML-created project is gone'

heading 'DELETE /projects/:id - delete JSON-created project'
request DELETE "/projects/$project_id"
expect_status 200
request GET "/projects/$project_id"
expect_status 404
deleted_project_id="$project_id"
project_id=""
echo 'PASS: JSON-created project is gone'

heading 'DELETE /projects/:id - repeat deletion of removed project'
# Use the project we deleted in the preceding demonstration.
request DELETE "/projects/$deleted_project_id"
expect_status 404

heading 'DELETE /projects/:id - delete untitled temporary project'
request DELETE "/projects/$titleless_project_id"
expect_status 200
request GET "/projects/$titleless_project_id"
expect_status 404
titleless_project_id=""

echo
echo "SUCCESS: All $step Projects API capability demonstrations completed."
echo 'Temporary projects were deleted. Existing projects were not modified.'
