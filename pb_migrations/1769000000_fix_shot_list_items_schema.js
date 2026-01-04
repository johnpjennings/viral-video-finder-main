/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("shooting_shot_list_items");

  collection.fields.addAt(collection.fields.length, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_77162866",
    "hidden": false,
    "id": "relation_shot_video",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "video_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_shot_number",
    "max": 50,
    "min": 0,
    "name": "shot_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_shot_type",
    "max": 200,
    "min": 0,
    "name": "shot_type",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_shot_desc",
    "max": 2000,
    "min": 0,
    "name": "shot_description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("shooting_shot_list_items");

  collection.fields.removeById("relation_shot_video");
  collection.fields.removeById("text_shot_number");
  collection.fields.removeById("text_shot_type");
  collection.fields.removeById("text_shot_desc");

  return app.save(collection);
});
