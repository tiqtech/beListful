UserManager = {
	get:function(context, id, db) {
		db.get(id, DBManager.onGet.bind(DBManager, context, null))
	},
	getAll:function(context, db) {
		db.view("users/all", DBManager.onGet.bind(DBManager, context, false));		
	},
	getFriends:function(context, id, db) {
		db.view("users/friends", {
	        key: id
	    }, function(err, res){
	        var keys = [];
	        res.forEach(function(d){
	            keys.push(d)
	        });
	        
	        db.get(keys, DBManager.onGet.bind(DBManager, context, false));
	    });		
	},
	getLists:function(context, id, db) {
        db.view("lists/byOwner", {
            key: id
        }, DBManager.onGet.bind(DBManager, context, false));		
	},
	add:function(context, id, db) {
		db.head(id, function(err, res, status) {
			if(status === 200) {
				context.onError(RestfulThings.Errors.ServerError("Resource exists"));
			} else if(status === 404) {
				db.save(context.body, function(err, res) {
					if(err) {
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
	remove:function(context, id, db) {
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
	}
}

user = new RestfulThings.Thing("user", { // spec
    "path": "users",
    "collection": true,
    "contains": [{
        "path": "lists",
        "thing": "list",
        "import": true
    }, {
        "path": "friends",
        "mapTo": "user"
    }]
}, {
	"put": function(context) {
		if(context.id === undefined) {
			context.onError(RestfulThings.Errors.ServerError("Cannot PUT without user id"));
			return;
		}
		
		if(!context.body) {
			context.onError(RestfulThings.Errors.ServerError("Empty request body received"));
			return;
		}
		
		var validation = schemas.user.validate(context.body);
		if(validation.errors.length > 0) {
			context.onError(RestfulThings.Errors.ServerError("Invalid user object"));
			return;
		}
		
		if(context.body.id !== context.id) {
			context.onError(RestfulThings.Errors.ServerError("Object id does not match URI id"));
			return;
		}
		
		// convert to db format
		context.body._id = context.body.id;
		delete context.body.id;
		context.body.doctype = "user";
		
		
		// TODO: change to test if id == user.id once auth is sorted out
		// so that a PUT request will update a user if it's the same (or admin)
		DBManager.getDatabase(UserManager.add.bind(UserManager, context, context.body._id));
	},
	"del": function(context) {
		// if context.id == user.id || user.isAdmin()
		DBManager.getDatabase(UserManager.remove.bind(UserManager, context, context.id));
	},
    "get": function(context){
		var callback;
		var userId = (context.spec.path === "users") ? context.id : context.ancestors[0].id;
		
		if(context.spec.path === "friends") {
			callback = UserManager.getFriends.bind(UserManager, context, userId)
		} else if (context.spec.path === "lists") {
			callback = UserManager.getLists.bind(UserManager, context, userId)			
		} else if(!!context.id) {
			callback = UserManager.get.bind(UserManager, context, userId);
		} else {
			callback = UserManager.getAll.bind(UserManager, context);
		}

		DBManager.getDatabase(callback);
    },
	"post":function(context) {
		if (!context.body) {
            context.onError(RestfulThings.Errors.ServerError("No object"));
            return;
        }
        
        if (context.spec.path === "lists") {
			var validation = schemas.list.validate(context.body);
			if(validation.errors.length > 0) {
				context.onError(RestfulThings.Errors.ServerError("invalid object"));
				return;
			}
			
        	DBManager.getDatabase(function(db) {
				context.body.doctype = "list";
				db.save(context.body, function(err, res) {
					context.onComplete(DBManager.scrub(res));
				});
			});
        }
	}
});
