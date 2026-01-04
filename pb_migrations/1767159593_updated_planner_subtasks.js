/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1069553973")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_862406278",
    "hidden": false,
    "id": "relation2377515398",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "task_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1069553973")

  // remove field
  collection.fields.removeById("relation2377515398")

  return app.save(collection)
})
