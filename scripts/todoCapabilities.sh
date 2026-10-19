#!/usr/bin/env bash
# ECSE 429 Part A - Todos capabilities (session 1, Yanick Wiaderek)
# Goes through the todo capabilities I found during the session, using a
# clothing shopping list as the data. Start the API on localhost:4567 first.
# Anything created here gets deleted at the end.
# stop at the first check that fails (cleanup still runs)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4567}"
response_file=$(mktemp)
status=""

# keep track of what we create so it can be deleted even if the script stops early
created_todos=""
created_projects=""

cleanup() {
    # deleting a todo also removes its links to projects/categories
    for id in $created_todos; do
        code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/todos/$id") || code="unreachable"
        echo "Cleanup: DELETE /todos/$id -> HTTP $code"
    done
    for id in $created_projects; do
        code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/projects/$id") || code="unreachable"
        echo "Cleanup: DELETE /projects/$id -> HTTP $code"
    done
    rm -f "$response_file"
}
trap cleanup EXIT

# take a todo off the cleanup list once the script deleted it itself
forget_todo() {
    local kept="" id
    for id in $created_todos; do
        if [[ "$id" != "$1" ]]; then kept="$kept $id"; fi
    done
    created_todos="$kept"
}

step=0
heading() {
    step=$((step + 1))
    printf '\n========== Test %d: %s ==========\n' "$step" "$1"
}

# request METHOD PATH [ACCEPT] [BODY] [CONTENT_TYPE]
# saves the body in $response_file and the status code in $status
request() {
    local method="$1" path="$2" accept="${3:-application/json}"
    local body="${4:-}" content_type="${5:-application/json}"
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

fail() {
    echo "FAIL: $1" >&2
    exit 1
}

expect_status() {
    [[ "$status" == "$1" ]] || fail "expected HTTP $1, got $status"
    echo "PASS: HTTP $1"
}

# python is only used to read the JSON/XML responses, the rest is plain bash

# prints the id of whatever was just created (json or xml)
created_id() {
    python3 -c '
import json, sys, xml.etree.ElementTree as ET
path, fmt = sys.argv[1:]
print(json.load(open(path))["id"] if fmt == "json" else ET.parse(path).getroot().findtext("id"))
' "$response_file" "$1"
}

# prints the ids in a list response like {"todos":[...]}, one per line
ids_in() {
    python3 -c '
import json, sys
print("\n".join(str(item["id"]) for item in json.load(open(sys.argv[1]))[sys.argv[2]]))
' "$response_file" "$1"
}

expect_in_list() {
    local ids
    ids=$(ids_in "$1")
    grep -qx "$2" <<< "$ids" || fail "$1 list does not contain id $2"
    echo "PASS: $1 list contains id $2"
}

expect_not_in_list() {
    local ids
    ids=$(ids_in "$1")
    ! grep -qx "$2" <<< "$ids" || fail "$1 list still contains id $2"
    echo "PASS: $1 list does not contain id $2"
}

expect_empty() {
    [[ -z "$(ids_in "$1")" ]] || fail "expected an empty $1 list"
    echo "PASS: $1 list is empty"
}

# verify_todo ID TITLE DESCRIPTION DONESTATUS json|xml
# checks the todo in the last response (single todo or {"todos":[...]}, json or xml)
verify_todo() {
    python3 - "$response_file" "$@" <<'PY'
import json, sys
import xml.etree.ElementTree as ET

path, fmt = sys.argv[1], sys.argv[6]
fields = ["id", "title", "description", "doneStatus"]
expected = dict(zip(fields, sys.argv[2:6]))

if fmt == "json":
    data = json.load(open(path))
    todo = data["todos"][0] if "todos" in data else data
    actual = {f: str(todo.get(f, "")) for f in fields}
else:
    root = ET.parse(path).getroot()
    todo = root if root.tag == "todo" else root.find("todo")
    actual = {f: todo.findtext(f) or "" for f in fields}

if actual != expected:
    sys.exit(f"FAIL: expected {expected}\n      got      {actual}")
print("PASS: todo fields match")
PY
}

echo '=== ECSE 429 - Todos API capabilities ==='

# --- basic CRUD (JSON) ---

heading 'GET /todos - list existing todos'
request GET '/todos'
expect_status 200

heading 'HEAD /todos - collection headers'
request HEAD '/todos'
expect_status 200

heading 'POST /todos - create a todo with all fields'
request POST '/todos' 'application/json' \
    '{"title":"Buy winter jacket","description":"Check the outlet store first","doneStatus":false}'
expect_status 201
todo_id=$(created_id json)
created_todos="$created_todos $todo_id"
echo "Created todo id: $todo_id"
verify_todo "$todo_id" 'Buy winter jacket' 'Check the outlet store first' 'false' json

heading 'POST /todos - create a todo with only a title (defaults)'
request POST '/todos' 'application/json' '{"title":"Buy wool socks"}'
expect_status 201
socks_id=$(created_id json)
created_todos="$created_todos $socks_id"
verify_todo "$socks_id" 'Buy wool socks' '' 'false' json

heading 'GET /todos/:id - retrieve the new todo'
request GET "/todos/$todo_id"
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket' 'Check the outlet store first' 'false' json

heading 'HEAD /todos/:id - existing todo'
request HEAD "/todos/$todo_id"
expect_status 200

heading 'POST /todos/:id - amend only doneStatus'
request POST "/todos/$todo_id" 'application/json' '{"doneStatus":true}'
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket' 'Check the outlet store first' 'true' json

heading 'GET /todos/:id - POST amend was saved, other fields kept'
request GET "/todos/$todo_id"
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket' 'Check the outlet store first' 'true' json

heading 'PUT /todos/:id - update title (observed: omitted fields reset, BUG-05)'
request PUT "/todos/$todo_id" 'application/json' '{"title":"Buy winter jacket and boots"}'
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket and boots' '' 'false' json

heading 'GET /todos/:id - PUT result was saved'
request GET "/todos/$todo_id"
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket and boots' '' 'false' json

heading 'GET /todos/:id - nonexistent todo'
request GET '/todos/99999'
expect_status 404

heading 'HEAD /todos/:id - nonexistent todo'
request HEAD '/todos/99999'
expect_status 404

# --- filtering ---

heading 'GET /todos?doneStatus=false - filter by done status'
request GET '/todos?doneStatus=false'
expect_status 200
expect_in_list todos "$socks_id"

heading 'GET /todos?title=... - matching title'
request GET '/todos?title=Buy%20wool%20socks'
expect_status 200
expect_in_list todos "$socks_id"

heading 'GET /todos?title=... - no match gives an empty list'
request GET '/todos?title=Buy%20a%20tuxedo%20for%20the%20gym'
expect_status 200
expect_empty todos

# --- validation / errors ---

heading 'POST /todos - missing title'
request POST '/todos' 'application/json' '{"description":"Size medium"}'
expect_status 400

heading 'POST /todos - empty title'
request POST '/todos' 'application/json' '{"title":""}'
expect_status 400

heading 'POST /todos - doneStatus sent as a string'
request POST '/todos' 'application/json' '{"title":"Buy scarf","doneStatus":"false"}'
expect_status 400

heading 'POST /todos - client tries to choose the id'
request POST '/todos' 'application/json' '{"id":"500","title":"Buy scarf"}'
expect_status 400

heading 'POST /todos - unknown field'
request POST '/todos' 'application/json' '{"title":"Buy scarf","size":"M"}'
expect_status 400

heading 'POST /todos - malformed JSON'
request POST '/todos' 'application/json' '{"title":"Buy scarf",}'
expect_status 400

# --- XML ---

heading 'GET /todos - XML response'
request GET '/todos' 'application/xml'
expect_status 200
grep -q '^<todos>' "$response_file" || fail "response is not a <todos> XML document"
echo "PASS: got XML back"

heading 'GET /todos/:id - XML response'
request GET "/todos/$todo_id" 'application/xml'
expect_status 200
verify_todo "$todo_id" 'Buy winter jacket and boots' '' 'false' xml

heading 'POST /todos - create a todo from an XML body'
request POST '/todos' 'application/xml' \
    '<todo><title>Buy rain boots</title><description>Black, size 10</description><doneStatus>false</doneStatus></todo>' \
    'application/xml'
expect_status 201
xml_id=$(created_id xml)
created_todos="$created_todos $xml_id"
echo "Created XML todo id: $xml_id"
verify_todo "$xml_id" 'Buy rain boots' 'Black, size 10' 'false' xml

heading 'POST /todos/:id - amend with an XML body'
request POST "/todos/$xml_id" 'application/xml' \
    '<todo><doneStatus>true</doneStatus></todo>' 'application/xml'
expect_status 200
verify_todo "$xml_id" 'Buy rain boots' 'Black, size 10' 'true' xml

heading 'PUT /todos/:id - XML update (observed: same reset as JSON, BUG-05)'
request PUT "/todos/$xml_id" 'application/xml' \
    '<todo><title>Buy rain boots and umbrella</title></todo>' 'application/xml'
expect_status 200
verify_todo "$xml_id" 'Buy rain boots and umbrella' '' 'false' xml

heading 'GET /todos/:id - nonexistent todo, XML error'
request GET '/todos/99999' 'application/xml'
expect_status 404
grep -q '<errorMessages>' "$response_file" || fail "error is not in XML"
echo "PASS: error came back as XML"

heading 'POST /todos - malformed XML'
request POST '/todos' 'application/xml' '<todo><title>Buy hat</todo>' 'application/xml'
expect_status 400

# --- todo <-> project (tasksof) ---
# picks a project that already exists instead of assuming id 1 is there

heading 'GET /todos/:id/tasksof - new todo has no projects'
request GET "/todos/$socks_id/tasksof"
expect_status 200
expect_empty projects

heading 'GET /projects - pick an existing project to link'
request GET '/projects'
expect_status 200
project_ids=$(ids_in projects)
project_id=${project_ids%%$'\n'*}
[[ -n "$project_id" ]] || fail "no project to link to"
echo "Using project $project_id (the link is removed again below)"

heading 'POST /todos/:id/tasksof - link todo to the project'
request POST "/todos/$socks_id/tasksof" 'application/json' "{\"id\":\"$project_id\"}"
expect_status 201

heading 'GET /todos/:id/tasksof - link shows on the todo side'
request GET "/todos/$socks_id/tasksof"
expect_status 200
expect_in_list projects "$project_id"

heading 'GET /projects/:id/tasks - link also shows on the project side'
request GET "/projects/$project_id/tasks"
expect_status 200
expect_in_list todos "$socks_id"

heading 'HEAD /todos/:id/tasksof'
request HEAD "/todos/$socks_id/tasksof"
expect_status 200

heading 'DELETE /todos/:id/tasksof/:id - remove the link'
request DELETE "/todos/$socks_id/tasksof/$project_id"
expect_status 200

heading 'GET /todos/:id/tasksof - link removed'
request GET "/todos/$socks_id/tasksof"
expect_status 200
expect_not_in_list projects "$project_id"

# --- todo <-> category ---

heading 'GET /categories - pick an existing category to link'
request GET '/categories'
expect_status 200
category_ids=$(ids_in categories)
category_id=${category_ids%%$'\n'*}
[[ -n "$category_id" ]] || fail "no category to link to"
echo "Using category $category_id"

heading 'GET /todos/:id/categories - new todo has no categories'
request GET "/todos/$socks_id/categories"
expect_status 200
expect_empty categories

heading 'POST /todos/:id/categories - link todo to the category'
request POST "/todos/$socks_id/categories" 'application/json' "{\"id\":\"$category_id\"}"
expect_status 201

heading 'GET /todos/:id/categories - link shows on the todo side'
request GET "/todos/$socks_id/categories"
expect_status 200
expect_in_list categories "$category_id"

heading 'HEAD /todos/:id/categories'
request HEAD "/todos/$socks_id/categories"
expect_status 200

heading 'GET /categories/:id/todos - category side (investigate BUG-08)'
request GET "/categories/$category_id/todos"
if grep -qx "$socks_id" <<< "$(ids_in todos)"; then
    echo "OBSERVED: todo $socks_id is listed on the category side"
else
    echo "OBSERVED: todo $socks_id is NOT listed on the category side (expected it to be)"
fi

heading 'DELETE /todos/:id/categories/:id - remove the link'
request DELETE "/todos/$socks_id/categories/$category_id"
expect_status 200

heading 'GET /todos/:id/categories - link removed'
request GET "/todos/$socks_id/categories"
expect_status 200
expect_not_in_list categories "$category_id"

# --- undocumented ---

heading 'OPTIONS /todos and /todos/:id - allowed methods'
for path in '/todos' "/todos/$todo_id"; do
    allow=$(curl -sS -X OPTIONS -D - -o /dev/null "$BASE_URL$path" | grep -i '^allow:' | tr -d '\r')
    echo "OPTIONS $path -> $allow"
    [[ -n "$allow" ]] || fail "no Allow header for $path"
done
echo "PASS: Allow header returned"

heading 'PATCH /todos/:id - not allowed'
request PATCH "/todos/$todo_id" 'application/json' '{"title":"Buy jacket"}'
expect_status 405

heading 'DELETE /todos - deleting the whole collection is not allowed'
request DELETE '/todos'
expect_status 405

heading 'POST /todos/:id/tasksof with a title - creates a new project and links it'
request POST "/todos/$socks_id/tasksof" 'application/json' '{"title":"Winter wardrobe"}'
expect_status 201
new_project_id=$(created_id json)
created_projects="$created_projects $new_project_id"
echo "New project id: $new_project_id"
request GET "/todos/$socks_id/tasksof"
expect_status 200
expect_in_list projects "$new_project_id"

# --- bugs from the session ---
# these just print what the API does, they don't fail the script.
# the write-ups are in Bug Summaries/

heading 'GET /todos/99999/tasksof - investigate BUG-06'
request GET '/todos/99999/tasksof'
echo "OBSERVED: HTTP $status (404 expected, the todo does not exist)"

heading 'GET /todos/99999/categories - investigate BUG-07'
request GET '/todos/99999/categories'
echo "OBSERVED: HTTP $status (404 expected, the todo does not exist)"

heading 'POST /todos/:id/tasksof with an XML body - investigate BUG-09'
request POST "/todos/$todo_id/tasksof" 'application/xml' \
    "<project><id>$project_id</id></project>" 'application/xml'
echo "OBSERVED: HTTP $status (201 expected, same link works in JSON)"

heading 'POST /todos rejected in between two creates - investigate BUG-10'
request POST '/todos' 'application/json' '{"title":"Buy belt"}'
expect_status 201
first_id=$(created_id json)
created_todos="$created_todos $first_id"
request POST '/todos' 'application/json' '{"title":""}'
expect_status 400
request POST '/todos' 'application/json' '{"title":"Buy tie"}'
expect_status 201
second_id=$(created_id json)
created_todos="$created_todos $second_id"
echo "OBSERVED: ids $first_id then $second_id (the rejected create still used up an id in between)"

# --- delete ---

heading 'DELETE /todos/:id - delete the XML todo'
request DELETE "/todos/$xml_id"
expect_status 200
request GET "/todos/$xml_id"
expect_status 404
forget_todo "$xml_id"
echo 'PASS: XML todo is gone'

heading 'DELETE /todos/:id - delete the JSON todo'
request DELETE "/todos/$todo_id"
expect_status 200
request GET "/todos/$todo_id"
expect_status 404
forget_todo "$todo_id"
echo 'PASS: JSON todo is gone'

heading 'DELETE /todos/:id - deleting it again'
request DELETE "/todos/$todo_id"
expect_status 404

echo
echo "Done: ran all $step capability checks."
echo "PASS means the result matched what was checked (the PUT checks match the BUG-05 behaviour)."
echo "OBSERVED lines show the behaviour behind BUG-06 to BUG-10, they don't fail the script."
echo "Deleting what's left of the test data:"