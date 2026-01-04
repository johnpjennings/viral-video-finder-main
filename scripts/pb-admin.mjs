#!/usr/bin/env node

const PB_URL =
  process.env.PB_ADMIN_URL ||
  process.env.VITE_POCKETBASE_URL ||
  "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const usage = `
PocketBase Admin Helper

Usage:
  node scripts/pb-admin.mjs list-collections
  node scripts/pb-admin.mjs get-collection <nameOrId>
  node scripts/pb-admin.mjs add-field <collection> <fieldName> <type> [optionsJson]
  node scripts/pb-admin.mjs set-public <collection>

Env:
  PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD (required)
  PB_ADMIN_URL (optional, defaults to VITE_POCKETBASE_URL or http://127.0.0.1:8090)

Examples:
  PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret \n    node scripts/pb-admin.mjs list-collections

  PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret \n    node scripts/pb-admin.mjs add-field video_productions sort_order number '{"min":0}'
`;

function fail(message) {
  console.error(message);
  console.error(usage);
  process.exit(1);
}

function requireEnv() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD.");
  }
}

async function authWithPassword(path) {
  const res = await fetch(`${PB_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Auth failed (${res.status}): ${text}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data?.token;
}

async function auth() {
  requireEnv();

  try {
    return await authWithPassword("/api/admins/auth-with-password");
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  return await authWithPassword(
    "/api/collections/_superusers/auth-with-password"
  );
}

async function request(method, path, token, body) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}) ${path}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function listCollections() {
  const token = await auth();
  const data = await request("GET", "/api/collections", token);
  console.log(JSON.stringify(data, null, 2));
}

async function getCollection(nameOrId) {
  const token = await auth();
  const data = await request(
    "GET",
    `/api/collections/${encodeURIComponent(nameOrId)}`,
    token
  );
  console.log(JSON.stringify(data, null, 2));
}

async function addField(collectionName, fieldName, type, optionsJson) {
  const token = await auth();
  const collection = await request(
    "GET",
    `/api/collections/${encodeURIComponent(collectionName)}`,
    token
  );

  const fields = Array.isArray(collection.fields)
    ? collection.fields
    : Array.isArray(collection.schema)
    ? collection.schema
    : [];

  if (fields.some((field) => field.name === fieldName)) {
    throw new Error(`Field already exists: ${fieldName}`);
  }

  let required = false;
  let extras = {};
  if (optionsJson) {
    try {
      const parsed = JSON.parse(optionsJson);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.required === "boolean") {
          required = parsed.required;
        }
        if (parsed.options && typeof parsed.options === "object") {
          extras = parsed.options;
        } else {
          extras = { ...parsed };
        }
      }
    } catch (error) {
      throw new Error(`Invalid options JSON: ${error.message}`);
    }
  }

  const field = {
    name: fieldName,
    type,
    required,
    ...extras,
  };

  delete field.options;

  fields.push(field);

  const updated = await request(
    "PATCH",
    `/api/collections/${collection.id}`,
    token,
    { fields }
  );

  console.log(JSON.stringify(updated, null, 2));
}

async function setPublic(collectionName) {
  const token = await auth();
  const collection = await request(
    "GET",
    `/api/collections/${encodeURIComponent(collectionName)}`,
    token
  );

  const updated = await request(
    "PATCH",
    `/api/collections/${collection.id}`,
    token,
    {
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    }
  );

  console.log(JSON.stringify(updated, null, 2));
}

async function run() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) fail("Missing command.");

  try {
    if (command === "list-collections") {
      await listCollections();
      return;
    }

    if (command === "get-collection") {
      if (!args[0]) fail("Missing collection name/id.");
      await getCollection(args[0]);
      return;
    }

    if (command === "add-field") {
      if (args.length < 3) fail("Missing arguments for add-field.");
      const [collectionName, fieldName, type, optionsJson] = args;
      await addField(collectionName, fieldName, type, optionsJson);
      return;
    }

    if (command === "set-public") {
      if (!args[0]) fail("Missing collection name/id.");
      await setPublic(args[0]);
      return;
    }

    fail(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
