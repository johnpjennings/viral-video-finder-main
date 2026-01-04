/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3787721993")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1280174292",
    "hidden": false,
    "id": "relation2713720912",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "script_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3787721993")

  // remove field
  collection.fields.removeById("relation2713720912")

  return app.save(collection)
})
