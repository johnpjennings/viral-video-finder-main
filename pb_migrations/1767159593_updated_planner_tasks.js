/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_862406278")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date3866337329",
    "max": "",
    "min": "",
    "name": "due_date",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_862406278")

  // remove field
  collection.fields.removeById("date3866337329")

  return app.save(collection)
})
