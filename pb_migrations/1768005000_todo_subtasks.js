migrate((db) => {
  const productionTodoSubtasks = new Collection({
    name: "production_todo_subtasks",
    type: "base",
    system: false,
    schema: [
      {
        name: "todo_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "pbc_3387693286",
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "title", type: "text", required: true, options: { max: 1000 } },
      { name: "completed", type: "bool", required: false },
    ],
  });

  productionTodoSubtasks.listRule = "";
  productionTodoSubtasks.viewRule = "";
  productionTodoSubtasks.createRule = "";
  productionTodoSubtasks.updateRule = "";
  productionTodoSubtasks.deleteRule = "";

  db.save(productionTodoSubtasks);

  const editingTodoSubtasks = new Collection({
    name: "editing_todo_subtasks",
    type: "base",
    system: false,
    schema: [
      {
        name: "todo_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "pbc_2268795105",
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "title", type: "text", required: true, options: { max: 1000 } },
      { name: "completed", type: "bool", required: false },
    ],
  });

  editingTodoSubtasks.listRule = "";
  editingTodoSubtasks.viewRule = "";
  editingTodoSubtasks.createRule = "";
  editingTodoSubtasks.updateRule = "";
  editingTodoSubtasks.deleteRule = "";

  db.save(editingTodoSubtasks);
}, (db) => {
  const collections = [
    "production_todo_subtasks",
    "editing_todo_subtasks",
  ];
  collections.forEach((name) => {
    const collection = db.findCollectionByNameOrId(name);
    if (collection) db.delete(collection);
  });
});
