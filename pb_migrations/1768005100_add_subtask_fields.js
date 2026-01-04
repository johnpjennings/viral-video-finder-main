/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const productionSubtasks = app.findCollectionByNameOrId("pbc_3659748582")
  const editingSubtasks = app.findCollectionByNameOrId("pbc_200399143")

  productionSubtasks.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3387693286",
    "hidden": false,
    "id": "relation700514382",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "todo_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  productionSubtasks.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1384045349",
    "max": 1000,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  productionSubtasks.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  editingSubtasks.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2268795105",
    "hidden": false,
    "id": "relation700514382",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "todo_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  editingSubtasks.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1384045349",
    "max": 1000,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  editingSubtasks.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  app.save(productionSubtasks)
  return app.save(editingSubtasks)
}, (app) => {
  const productionSubtasks = app.findCollectionByNameOrId("pbc_3659748582")
  const editingSubtasks = app.findCollectionByNameOrId("pbc_200399143")

  productionSubtasks.fields.removeById("relation700514382")
  productionSubtasks.fields.removeById("text1384045349")
  productionSubtasks.fields.removeById("bool989355118")

  editingSubtasks.fields.removeById("relation700514382")
  editingSubtasks.fields.removeById("text1384045349")
  editingSubtasks.fields.removeById("bool989355118")

  app.save(productionSubtasks)
  return app.save(editingSubtasks)
})
