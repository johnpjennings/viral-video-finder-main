/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1069553973")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1069553973")

  // remove field
  collection.fields.removeById("bool989355118")

  return app.save(collection)
})
