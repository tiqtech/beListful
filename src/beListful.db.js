DBManager = {
  getDatabase:function(callback) {
    var db = new(require('cradle').Connection)().database("belistful");
    db.exists(function(err, exists) {
      if(!exists) {
        db.create();
      }

      callback(db);
    });    
  },
  onGet:function(context, oneResult, err, doc) {
    if(err) {
      context.onError(RestfulThings.Errors.ServerError(err.reason));
    } else {
      try {
        if(!!doc.forEach) {
          var newDoc = [];

          doc.forEach(function(d) {
            newDoc.push(this.scrub(d))
          }.bind(this));
 
          if(oneResult && newDoc.length === 0) {
            throw RestfulThings.Errors.NotFound();
          }

          doc = (oneResult) ? newDoc[0] : newDoc;

        } else {
          this.scrub(doc);
        }
      } catch(e) {
        context.onError(e);
      }

      context.onComplete(doc);
    }
  },
  scrub:function(d) {
  	// map couch _id to id
    d.id = d._id;

	// remove any couch-specific fields
    for(var k in d) {
		if(k.substring(0,1) === "_") {
			delete d[k];
		}
	}
	
	delete d.doctype;

    return d;
  },
  encode:function(o) {
  	var s = encodeURIComponent(JSON.stringify(o));
	console.log(s);
	return s;
  }
}