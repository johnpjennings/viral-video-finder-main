/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const productionTodos = app.findCollectionByNameOrId("pbc_3387693286")
  const editingTodos = app.findCollectionByNameOrId("pbc_2268795105")

  productionTodos.fields.addAt(productionTodos.fields.length, new Field({
    "hidden": false,
    "id": "date901010201",
    "max": "",
    "min": "",
    "name": "created_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  productionTodos.fields.addAt(productionTodos.fields.length, new Field({
    "hidden": false,
    "id": "date901010202",
    "max": "",
    "min": "",
    "name": "updated_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  editingTodos.fields.addAt(editingTodos.fields.length, new Field({
    "hidden": false,
    "id": "date901010203",
    "max": "",
    "min": "",
    "name": "created_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  editingTodos.fields.addAt(editingTodos.fields.length, new Field({
    "hidden": false,
    "id": "date901010204",
    "max": "",
    "min": "",
    "name": "updated_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  app.save(productionTodos)
  return app.save(editingTodos)
}, (app) => {
  const productionTodos = app.findCollectionByNameOrId("pbc_3387693286")
  const editingTodos = app.findCollectionByNameOrId("pbc_2268795105")

  productionTodos.fields.removeById("date901010201")
  productionTodos.fields.removeById("date901010202")
  editingTodos.fields.removeById("date901010203")
  editingTodos.fields.removeById("date901010204")

  app.save(productionTodos)
  return app.save(editingTodos)
})
