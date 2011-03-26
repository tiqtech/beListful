AppManager = {
    add: function(context, id, db){
        db.head(id, function(err, res, status){
            if (status === 200) {
                context.onError(RestfulThings.Errors.ServerError("Resource exists"));
            }
            else 
                if (status === 404) {
                    db.save(context.body, function(err, res){
                        if (err) {
                            context.onError(RestfulThings.Errors.ServerError(err));
                        }
                        else {
                            context.onComplete(DBManager.scrub(res));
                        }
                    })
                }
                else {
                    context.onError(RestfulThings.Errors.ServerError(err));
                }
        });
    },
	get:function(context, id, db) {
		db.get(id, DBManager.onGet.bind(DBManager, context, null))
	},
	getAll:function(context, db) {
		db.view("applications/all", DBManager.onGet.bind(DBManager, context, false));		
	},
	addTemplate:function(context, id, db) {
        db.head(id, function(err, res, status) {
            if (status === 200) {
				context.onError(RestfulThings.Errors.ServerError("Resource exists"));
			} else if (status === 404) {
				db.save(context.body, function(err, res){
					if (err) {
						context.onError(RestfulThings.Errors.ServerError(err));
					} else {
						context.onComplete(DBManager.scrub(res));
					}
				})
			} else {
				context.onError(RestfulThings.Errors.ServerError(err));
			}
        });	
	},
	getTemplate:function(context, id, db) {
		db.get(id, DBManager.onGet.bind(DBManager, context, null))
	},
	getTemplates:function(context, appId, db) {
		db.view("applications/templates", {key:[appId,1]}, DBManager.onGet.bind(DBManager, context, false));		
	}
}

app = new RestfulThings.Thing("app", {
    "path": "applications",
    "collection": true,
    "contains": [{
        "path": "templates",
        "collection": true
    }]
}, {
    "get": function(context){
        var callback;
		var appid = (context.spec.path === "applications") ? context.id : context.ancestors[0].id;
		
		if(context.spec.path === "templates") {
			if (!!context.id) {
				callback = AppManager.getTemplate.bind(AppManager, context, context.id);
			} else {
				callback = AppManager.getTemplates.bind(AppManager, context, appid);
			}
		} else if(!!context.id) {
			callback = AppManager.get.bind(AppManager, context, appid);
		} else {
			callback = AppManager.getAll.bind(AppManager, context);
		}

		DBManager.getDatabase(callback);
    },
    "post": function(context){
		// TODO: need to authorize user to add new app
		
		var schema = "application", handler = "add", doctype = "app";
		
		if(context.spec.path === "templates") {
			schema = "template";
			handler = "addTemplate";
			doctype = "template"
		}
		
		if(!context.body) {
			context.onError(RestfulThings.Errors.ServerError("Empty request body received"));
			return;
		}
		
		var validation = schemas[schema].validate(context.body);
		if(validation.errors.length > 0) {
			context.onError(RestfulThings.Errors.ServerError("Invalid object"));
			return;
		}
		
		// convert to db format
		if (context.body.id) {
			context.body._id = context.body.id;
			delete context.body.id;
		}
		context.body.doctype = doctype;
		
		DBManager.getDatabase(AppManager[handler].bind(AppManager, context, context.body._id));
    },
	"put": function(context){
		// TODO: need to authorize user to add new app
		
		var schema = "application", handler = "add", doctype = "app";
		
		if(context.spec.path === "templates") {
			schema = "template";
			handler = "addTemplate";
			doctype = "template"
		}
		
		if(context.id === undefined) {
			context.onError(RestfulThings.Errors.ServerError("Cannot PUT without id"));
			return;
		}
		
		if(!context.body) {
			context.onError(RestfulThings.Errors.ServerError("Empty request body received"));
			return;
		}
		
		var validation = schemas[schema].validate(context.body);
		if(validation.errors.length > 0) {
			context.onError(RestfulThings.Errors.ServerError("Invalid object"));
			return;
		}
		
		if(context.body.id !== context.id) {
			context.onError(RestfulThings.Errors.ServerError("Object id does not match URI id"));
			return;
		}

		// convert to db format
		context.body._id = context.body.id;
		delete context.body.id;
		context.body.doctype = doctype;
		
		DBManager.getDatabase(AppManager[handler].bind(AppManager, context, context.body._id));
    }
});
