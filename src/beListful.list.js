ListManager = {
	schemaCache:{},
	noop:function() {},
	addList:function(owner, list, callback) {
		callback = callback || ListManager.noop;
		if(!owner) callback("Owner required");
		if(!list) callback("List required");
		if(typeof(list) !== "object") callback("List must be an object");
		
		list.owner = owner;
		list.doctype = "list";
		
		var validation = schemas.list.validate(list);
		if (validation.errors.length > 0) {
			callback("Invalid List object");
			return;
		}
		
		DBManager.getDatabase(function(db){
			db.get(list.template, function(err, res){
				if(err) {
					callback("Template is not defined");
				} else {
					db.save(list, function(err, res){
						if(err) {
							callback(err);
						} else {
							callback(undefined, res.id);
						}
					});							
				}
			});					
		});
	},
	updateList:function(list, callback) {
		DBManager.getDatabase(function(db) {
			db.get(id, function(err,res) {
				if(err) {
					callback("List does not exist");
				} else {
					rev = res._rev;
					var o = DBManager.scrub(res);
					db.remove(id, res, function(err, res) {
						if(err) {
							callback("Unable to delete list");
						} else {
							callback(undefined, o);
						}
					});
				}
			})
		});
	},
	deleteList:function(id, callback) {
		callback = callback || ListManager.noop;
		if(!id) callback("List ID required");
		
		DBManager.getDatabase(function(db) {
			db.get(id, function(err,res) {
				if(err) {
					callback("List does not exist");
				} else {
					rev = res._rev;
					var o = DBManager.scrub(res);
					db.remove(id, res, function(err, res) {
						if(err) {
							callback("Unable to delete list");
						} else {
							callback(undefined, o);
						}
					});
				}
			})
		});
	},
	getList:function(owner, id, callback) {
		callback = callback || ListManager.noop;
		if(!id) callback("List ID required");
		if(!owner) callback("Owner required");
		
		DBManager.getDatabase(function(db){
			db.get(id, function(err, res) {
				if(err) {
					callback(err);
				} else {
					if(res.owner !== owner) {
						callback("List not found for owner");
					} else {
						callback(undefined, res);
					}
				}
			});
		});
	},
	getLists:function(owner, callback) {
		callback = callback || ListManager.noop;
		if(!owner) callback("Owner required");
		
		DBManager.getDatabase(function(db){
			db.view("lists/byOwner", owner, callback);
		});
	},
	getSchema:function(templateId, callback) {
		var schema = ListManager.schemaCache[templateId];
		if(schema) {
			callback(undefined, schema);
		} else {
			DBManager.getDatabase(function(db){
				db.get(templateId, function(templateErr, template){
                    if (templateErr) {
						callback(templateErr);
					} else {
						try {
							schema = require("schema").create(template.schema);
							ListManager.schemaCache[list.template] = schema;
							callback(undefined, schema)
						} catch(e) {
							callback("Invalid schema");
						}
					}
				});
			});
		}
	},
	addItem:function(listId, item, callback) {
		DBManager.getDatabase(function(db){
			db.get(listId, function(listErr, list) {
				if(listErr) {
					callback(listErr);
				} else {
                    ListManager.getSchema(list.template, function(schemaErr, schema){
                        if (schemaErr) {
							callback(schemaErr);
						} else {
                    		var validation = schema.validate(item);
							
							if(validation.errors.length > 0) {
								callback("Invalid Item");
								return;
							}
							
							item.list = listId;
							item.doctype = "item";
							db.save(item, function(err, res) {
								if(err) {
									callback(err);
								} else {
									callback(undefined, res.id);
								}
							});
                        }
                    });
				}
			});
        });
	},
	getItems:function(listId, callback) {
		callback = callback || ListManager.noop;
		if(!listId) callback("List ID required");
		
		DBManager.getDatabase(function(db){
	        db.view("lists/items", {
	            startkey: [listId, 1],
				endkey: [listId, {}]
	        }, callback);
		});
	},
	getItem:function(listId, itemId, callback) {
		callback = callback || ListManager.noop;
		if(!listId) callback("List ID required");
		if(!itemId) callback("Item ID required");
		
		DBManager.getDatabase(function(db){
			db.get(itemId, function(err, res) {
				if(err) {
					callback(err); 
				} else {
					if(res.list !== listId) {
						callback("Item not found in list");
					} else {
						callback(undefined, res);
					}
				}
			});
		});
	},
	deleteItem:function(listId, itemId, callback) {
		callback = callback || ListManager.noop;
		if(!listId) callback("List ID required");
		if(!itemId) callback("Item ID required");
		
		DBManager.getDatabase(function(db) {
			db.get(itemId, function(getErr, getRes) {
				if(getErr || getRes.list !== listId) {
					callback("Item does not exist");
				} else {
					var rev = getRes._rev;
					var o = DBManager.scrub(getRes);
					db.remove(itemId, rev, function(removeErr, removeRes) {
						if(removeErr) {
							callback("Unable to delete item");
						} else {
							callback(undefined, o);
						}
					});
				}
			});
		});
	},
	deleteItems:function(listId, callback) {
		callback = callback || ListManager.noop;
		if(!listId) callback("List ID required");
		
		DBManager.getDatabase(function(db) {
			db.view("lists/items", {
                startkey: [listId, 1],
				endkey: [listId, {}]
            },function(err, res) {
				if(err) {
					callback("Unexpected error");
				} else {
					var deleteSetList = new Array(res.length)
					var deleteSetCallback = function(count, index, err, res) {
						deleteSetList[index] = (!err);
						var complete = true;
						var successful = true;
						for(var i=0;i<deleteSetList.length;i++) {
							if(deleteSetList[i] === undefined) {
								complete = false;
								break;
							} else if(deleteSetList[i] === false){
								successful = false;
							}
						}
						
						if(complete) {
							if(successful) {
								callback();
							} else {
								callback("Unable to delete items");
							}
						}
					}
					
					for(var i=0;i<res.length;i++) {
						db.remove(res[i].value._id, res[i].value._rev, deleteSetCallback.bind(this, res.length, i));
					}
				}
			});
		});
	}
}
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
				var listId = context.ancestors[0].id;
                // either pass id of item (if provided) or range for list items
                if (!!context.id) {
                    ListManager.getItem(listId, context.id, DBManager.onGet.bind(DBManager, context, true));
                } else {
					ListManager.getItems(listId, DBManager.onGet.bind(DBManager, context, false))
                }
            } else {
				var owner = context.ancestors[0].id;
                if (context.id === undefined) {
					ListManager.getLists(owner, DBManager.onGet.bind(DBManager, context, false));
                } else {
                    ListManager.getList(owner, context.id, DBManager.onGet.bind(DBManager, context, null));
                }
            }
        });
    },
	"put": function(context) {
		if (!context.body) {
            context.onError();
            return;
        }
		
		if (context.spec.path === "lists" && context.id) {
			ListManager.updateList(context.id, function(err, res){
				if(err) {
					context.onError(RestfulThings.Errors.ServerError(err));
				} else {
					context.redirect();
				}
			});
		} else if(context.spec.path === "items") {
			context.onError(RestfulThings.Errors.ServerError("Not Implemented"))
			//check if it's an array
			
//			DBManager.getDatabase(function(db){
//				db.get(context.ancestors[0].id, function(err, res) {
//					if(err) {
//						context.onError(RestfulThings.Errors.ServerError(err));
//						return;
//					} else {
//	                    db.get(res.template, function(err, res){
//	                        if (err) {
//								context.onError(RestfulThings.Errors.ServerError(err));
//							} else {
//								var s = require("schema").create(res.schema);
//								for(var i=0;i<context.body.length;i++) {
//									var item = context.body[i];
//									var validation = s.validate(item);
//									
//									if(validation.errors.length > 0) {
//										context.onError(RestfulThings.Errors.ServerError("Invalid Item: " + JSON.stringify(item) + "\n" + JSON.stringify(validation.errors)));
//										return;
//									}
//									
//									console.log("validated",context.body[i])
//								}
//								
//                    db.view("lists/items", {
//                        startkey: [context.ancestors[0].id, 1],
//						endkey: [context.ancestors[0].id, {}]
//                    }, DBManager.onGet.bind(DBManager, context, false));
//								
//								db.save(context.body, function(saveErr, saveRes) {
//									console.log(saveErr,saveRes);
//									if(saveErr) {
//										context.onError(RestfulThings.Errors.ServerError(saveRes));
//									} else {
//										context.redirect();
//									}
//								});
//	                        }
//	                    });
//					}
//				});
//            });
		}
	},
    "post": function(context){
        if (!context.body) {
            context.onError(RestfulThings.Errors.ServerError("No object"));
            return;
        }
		
		var method; 
        if (context.spec.path === "lists") {
			method = ListManager.addList;
		} else if (context.spec.path === "items" && !context.id) {
			method = ListManager.addItem;
		} else {
			context.onError(RestfulThings.Errors.ServerError("Method not supported"));
			return;
		}
			
		method(context.ancestors[0].id, context.body, function(err, id){
			if (err) {
				context.onError(RestfulThings.Errors.ServerError(err));
			}
			else {
				context.redirect(id);
			}
		});
    },
	"del":function(context) {
		var id = context.id;
		var handler = function(err, list) {
			if(err) {
				context.onError(RestfulThings.Errors.ServerError(err));
			} else {
				context.onComplete(list);
			}
		}
			
		if(context.spec.path === "lists" && id) {
			ListManager.deleteList(id, handler);
		} else if (context.spec.path === "items") {
			var listId = context.ancestors[0].id;
			
			if(!!id) {
				ListManager.deleteItem(listId, id, handler);
			} else {
				ListManager.deleteItems(listId, handler);
			}
		}
	}
});
