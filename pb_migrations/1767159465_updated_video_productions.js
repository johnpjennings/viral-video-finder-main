/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date1700753491",
    "max": "",
    "min": "",
    "name": "scheduled_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  // remove field
  collection.fields.removeById("date1700753491")

  return app.save(collection)
})
