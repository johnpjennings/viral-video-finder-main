migrate((db) => {
  const shotListItems = new Collection({
    name: "shooting_shot_list_items",
    type: "base",
    system: false,
    schema: [
      {
        name: "video_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "pbc_77162866",
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      { name: "shot_number", type: "text", required: true, options: { max: 50 } },
      { name: "shot_type", type: "text", required: false, options: { max: 200 } },
      { name: "shot_description", type: "text", required: true, options: { max: 2000 } },
    ],
  });

  shotListItems.listRule = "";
  shotListItems.viewRule = "";
  shotListItems.createRule = "";
  shotListItems.updateRule = "";
  shotListItems.deleteRule = "";

  db.save(shotListItems);
}, (db) => {
  const collection = db.findCollectionByNameOrId("shooting_shot_list_items");
  if (collection) db.delete(collection);
});
