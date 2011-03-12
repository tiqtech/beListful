list = new RestfulThings.Thing("list", {
    "collection": true,
    "idFormat": RestfulThings.Format.UUID,
    "contains": [{
        "path": "items",
        "collection": true,
        "idFormat": RestfulThings.Format.UUID
    }, {
        "path": "owner",
        "thing": "user",
        "mapTo": "user"
    }]
}, {
    "get": function(context){
        DBManager.getDatabase(function(db){
            if (context.spec.path === "items") {
                // either pass id of item (if provided) or range for list items
                if (!!context.id) {
                    db.get(context.id, DBManager.onGet.bind(DBManager, context, true));
                }
                else {
                    db.view("lists/items", {
                        startkey: [context.ancestors[0].id, 1],
						endkey: [context.ancestors[0].id, {}]
                    }, DBManager.onGet.bind(DBManager, context, false));
                }
            }
            else {
                if (context.id === undefined) {
                    db.view("lists/all", DBManager.onGet.bind(DBManager, context, false));
                }
                else {
                    db.get(context.id, DBManager.onGet.bind(DBManager, context, null));
                }
            }
        });
    },
    "post": function(context){
		console.log("> list.post");
		
        if (!context.body) {
            context.onError(RestfulThings.Errors.ServerError("No object"));
            return;
        }
        
        if (!context.spec.path) {
			var validation = schemas.list.validate(context.body);
			if(validation.errors.length > 0) {
				context.onError(RestfulThings.Errors.ServerError("invalid object"));
				return;
			}
			
        	DBManager.getDatabase(function(db) {
				db.save(context.body, function(err, res) {
					context.onComplete(DBManager.scrub(res));
				});
			});
        }
        else if (context.spec.path === "items") {
            if (context.id === undefined) {
				console.log(context.body);
				
                DBManager.getDatabase(function(db){
					db.get(context.ancestors[0].id, function(err, res) {
						if(err) {
							context.onError(RestfulThings.Errors.ServerError(err));
						} else {
		                    db.get(res.template, function(err, res){
		                        if (err) {
									context.onError(RestfulThings.Errors.ServerError(err));
								} else {
									var s = require("schema").create(res.schema);
		                    		var validation = s.validate(context.body);
									
									if(validation.errors.length === 0) {
										context.body.list = context.ancestors[0].id;
										context.body.doctype = "item";
										db.save(context.body, function(err, res) {
											if(err) {
												context.onError(RestfulThings.Errors.ServerError(err));
											} else {
												context.onComplete(DBManager.scrub(res));
											}
										});
									} else {
										context.onError(RestfulThings.Errors.ServerError("invalid item"));
									}
		                        }
		                    });
						}
					});
                });
            }
        }
    },
	"del":function(context) {
		var id = context.id;
		if (context.spec.path === "items") {
			if(!!id) {
				// deleting one item
				DBManager.getDatabase(function(db) {
					db.get(id, function(err, res) {
						if(err) {
							// doesn't exist?
							context.onError(RestfulThings.Errors.ServerError(err));
						} else {
							var rev = res._rev;
							var o = DBManager.scrub(res);
							db.remove(id, rev, function(err, res) {
								if(err) {
									context.onError(RestfulThings.Errors.ServerError("Unable to delete resource"));
								} else {
									context.onComplete(o);
								}
							});
						}
					});
				});
			} else {
				// deleting collection
			}
		}
	}
});
