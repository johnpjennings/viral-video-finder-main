migrate((db) => {
    const videoProductions = new Collection({
    name: "video_productions",
    type: "base",
    system: false,
    schema: [
      { name: "title", type: "text", required: true, options: { min: 1, max: 255 } },
      { name: "description", type: "text", required: false, options: { max: 5000 } },
      {
        name: "status",
        type: "select",
        required: true,
        options: { values: ["idea", "scripting", "in_process", "editing", "scheduled", "released"], maxSelect: 1 },
      },
      { name: "scheduled_date", type: "date", required: false },
      { name: "thumbnail_url", type: "url", required: false },
      { name: "thumbnail", type: "file", required: false, options: { maxSelect: 1, maxSize: 5242880 } },
      { name: "sort_order", type: "number", required: true, options: { min: 0 } },
    ]
  });
  db.save(videoProductions);

  const scripts = new Collection({
    name: "scripts",
    type: "base",
    system: false,
    schema: [
      {
        name: "video_id",
        type: "relation",
        required: true,
        options: {
          collectionId: videoProductions.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "content", type: "text", required: true, options: { max: 50000 } },
    ],
  });
  db.save(scripts);

  const scriptVersions = new Collection({
    name: "script_versions",
    type: "base",
    system: false,
    schema: [
      {
        name: "script_id",
        type: "relation",
        required: true,
        options: {
          collectionId: scripts.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "content", type: "text", required: true, options: { max: 50000 } },
      { name: "version_number", type: "number", required: true, options: { min: 1 } },
    ],
  });
  db.save(scriptVersions);

  const productionTodos = new Collection({
    name: "production_todos",
    type: "base",
    system: false,
    schema: [
      {
        name: "video_id",
        type: "relation",
        required: true,
        options: {
          collectionId: videoProductions.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "task", type: "text", required: true, options: { max: 1000 } },
      { name: "completed", type: "bool", required: true },
    ],
  });
  db.save(productionTodos);

  const editingTodos = new Collection({
    name: "editing_todos",
    type: "base",
    system: false,
    schema: [
      {
        name: "video_id",
        type: "relation",
        required: true,
        options: {
          collectionId: videoProductions.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "task", type: "text", required: true, options: { max: 1000 } },
      { name: "completed", type: "bool", required: true },
    ],
  });
  db.save(editingTodos);

  const editingNotes = new Collection({
    name: "editing_notes",
    type: "base",
    system: false,
    schema: [
      {
        name: "video_id",
        type: "relation",
        required: true,
        options: {
          collectionId: videoProductions.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "content", type: "text", required: true, options: { max: 10000 } },
    ],
  });
  db.save(editingNotes);

  const plannerTasks = new Collection({
    name: "planner_tasks",
    type: "base",
    system: false,
    schema: [
      { name: "title", type: "text", required: true, options: { max: 255 } },
      { name: "description", type: "text", required: false, options: { max: 2000 } },
      {
        name: "task_type",
        type: "select",
        required: true,
        options: { values: ["daily", "weekly", "monthly"], maxSelect: 1 },
      },
      { name: "due_date", type: "date", required: true },
      { name: "completed", type: "bool", required: true },
    ],
  });
  db.save(plannerTasks);

  const plannerSubtasks = new Collection({
    name: "planner_subtasks",
    type: "base",
    system: false,
    schema: [
      {
        name: "task_id",
        type: "relation",
        required: true,
        options: {
          collectionId: plannerTasks.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "title", type: "text", required: true, options: { max: 255 } },
      { name: "completed", type: "bool", required: true },
    ],
  });
  db.save(plannerSubtasks);
}, (db) => {
    const collections = [
    "planner_subtasks",
    "planner_tasks",
    "editing_notes",
    "editing_todos",
    "production_todos",
    "script_versions",
    "scripts",
    "video_productions",
  ];
  collections.forEach((name) => {
    const collection = db.findCollectionByNameOrId(name);
    if (collection) db.delete(collection);
  });
});
