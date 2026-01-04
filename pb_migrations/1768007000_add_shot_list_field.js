/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010301",
    "max": 0,
    "min": 0,
    "name": "shooting_shot_list",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")
  collection.fields.removeById("text901010301")
  return app.save(collection)
})
