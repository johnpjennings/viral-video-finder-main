/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_862406278");

  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_862406278");

  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }));

  return app.save(collection);
});
