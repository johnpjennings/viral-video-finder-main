migrate((db) => {
    const apiCache = new Collection({
    name: "api_cache",
    type: "base",
    system: false,
    schema: [
      { name: "cache_key", type: "text", required: true, options: { min: 1, max: 255 } },
      { name: "cache_type", type: "text", required: true, options: { min: 1, max: 100 } },
      { name: "data", type: "json", required: true },
      { name: "expires_at", type: "date", required: true },
    ]
  });
  db.save(apiCache);

  const sessions = new Collection({
    name: "sessions",
    type: "base",
    system: false,
    schema: [
      { name: "token", type: "text", required: true, options: { min: 1, max: 128 } },
      { name: "expires_at", type: "date", required: true },
      { name: "ip_address", type: "text", required: false, options: { max: 255 } },
      { name: "user_agent", type: "text", required: false, options: { max: 255 } },
    ]
  });
  db.save(sessions);
}, (db) => {
    const collections = ["sessions", "api_cache"];
  collections.forEach((name) => {
    const collection = db.findCollectionByNameOrId(name);
    if (collection) db.delete(collection);
  });
});
