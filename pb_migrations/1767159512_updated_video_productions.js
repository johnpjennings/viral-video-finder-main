/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "idea",
      "scripting",
      "in_process",
      "editing",
      "released"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  // remove field
  collection.fields.removeById("select2063623452")

  return app.save(collection)
})
