migrate((db) => {
  const collections = [
    "video_productions",
    "scripts",
    "script_versions",
    "production_todos",
    "editing_todos",
    "editing_notes",
    "planner_tasks",
    "planner_subtasks",
    "api_cache",
    "sessions",
  ];

  collections.forEach((name) => {
    const collection = db.findCollectionByNameOrId(name);
    if (!collection) return;
    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";
    db.save(collection);
  });
}, (db) => {
  const collections = [
    "video_productions",
    "scripts",
    "script_versions",
    "production_todos",
    "editing_todos",
    "editing_notes",
    "planner_tasks",
    "planner_subtasks",
    "api_cache",
    "sessions",
  ];

  collections.forEach((name) => {
    const collection = db.findCollectionByNameOrId(name);
    if (!collection) return;
    collection.listRule = null;
    collection.viewRule = null;
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;
    db.save(collection);
  });
});
