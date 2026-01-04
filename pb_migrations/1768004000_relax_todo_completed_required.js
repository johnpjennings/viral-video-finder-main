/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const productionTodos = app.findCollectionByNameOrId("pbc_3387693286")
  const editingTodos = app.findCollectionByNameOrId("pbc_2268795105")

  productionTodos.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  editingTodos.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  app.save(productionTodos)
  return app.save(editingTodos)
}, (app) => {
  const productionTodos = app.findCollectionByNameOrId("pbc_3387693286")
  const editingTodos = app.findCollectionByNameOrId("pbc_2268795105")

  productionTodos.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  editingTodos.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool989355118",
    "name": "completed",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  app.save(productionTodos)
  return app.save(editingTodos)
})
