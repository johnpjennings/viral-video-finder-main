/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_77162866")

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010101",
    "max": 0,
    "min": 0,
    "name": "idea_notes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010102",
    "max": 0,
    "min": 0,
    "name": "shooting_notes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "date901010103",
    "max": "",
    "min": "",
    "name": "filming_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010104",
    "max": 0,
    "min": 0,
    "name": "scheduled_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010105",
    "max": 0,
    "min": 0,
    "name": "scheduled_description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010106",
    "max": 0,
    "min": 0,
    "name": "scheduled_tags",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010107",
    "max": 0,
    "min": 0,
    "name": "scheduled_thumbnail_a_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010108",
    "max": 0,
    "min": 0,
    "name": "scheduled_thumbnail_b_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text901010109",
    "max": 0,
    "min": 0,
    "name": "scheduled_thumbnail_c_url",
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

  collection.fields.removeById("text901010101")
  collection.fields.removeById("text901010102")
  collection.fields.removeById("date901010103")
  collection.fields.removeById("text901010104")
  collection.fields.removeById("text901010105")
  collection.fields.removeById("text901010106")
  collection.fields.removeById("text901010107")
  collection.fields.removeById("text901010108")
  collection.fields.removeById("text901010109")

  return app.save(collection)
})
