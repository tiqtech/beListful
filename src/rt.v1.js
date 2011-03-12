RestfulThings = {};

RestfulThings.Methods = {
  Get:"GET",
  Post:"POST",
  Put:"PUT",
  Delete:"DELETE",
  All:["GET","POST","PUT","DELETE"]
}

RestfulThings.Thing = function(o) {
  this.handlers = {
    "get":(o.get) ? o.get.bind(this) : undefined,
    "post":(o.post) ? o.post.bind(this) : undefined,
    "put":(o.put) ? o.put.bind(this) : undefined,
    "delete":(o.del) ? o.del.bind(this) : undefined
  }
}

RestfulThings.Thing.prototype = {
  isValid:function(id) {
  },
  isAuthorized:function(action) {
  }
}

RestfulThings.ResSpec = function(thingId, supports, isCollection) {
  this.thing = thingId;
  this.path = null;
  this.methods = supports || RestfulThings.Methods.Get
  this.collection = isCollection || false;
  this.specs = {};
  this.parent = null;
  this.handlers = {};
  this.idFormat = RestfulThings.Format.Any;
}

RestfulThings.ResSpec.prototype = {
  isCollection:function() {
    return this.collection;
  },
  isSecured:function() {
    return true;
  },
  supports:function(method) {
    if(!!this.methods) {
      for(var i=0;i<this.methods.length;i++) {
        if(this.methods[i] === method) {
          return true;
        }
      }
    }
    
    return false;
  },
  contains:function(path) {
    return this.specs[path];
  }
}

RestfulThings.ResSpec.parse = function(o) {
  var rs;
  
  try {
    rs = new RestfulThings.ResSpec();
    
    if(!!o.thing) rs.thing = o.thing;
    if(!!o.supports) rs.methods = o.supports;
    if(!!o.collection) rs.collection = o.collection;
    if(!!o.idFormat) rs.idFormat = o.idFormat;

    if(!!o.handlers) {
      if(!!o.handlers.get) rs.handlers["get"] = o.handlers.get.bind(rs);
      if(!!o.handlers.post) rs.handlers["post"] = o.handlers.post.bind(rs);
      if(!!o.handlers.put) rs.handlers["put"] = o.handlers.put.bind(rs);
      if(!!o.handlers.delete) rs.handlers["delete"] = o.handlers.delete.bind(rs);
    }
    
    if (!!o.contains) {
      for (var path in o.contains) {
        var childSpec = RestfulThings.ResSpec.parse(o.contains[path]);
        if (!!childSpec) {
          rs.specs[path] = childSpec;
          rs.specs[path].parent = rs;
          rs.specs[path].path = path;
        }
      }
    }
  } catch(e) {
    // log it ...
    throw e;
  }
  
  return rs;
}

RestfulThings.Dispatcher = function(spec, things) {  this.spec = spec;
  this.things = things;
  this.server = require('express').createServer(RestfulThings.Dispatcher.baseFilter.bind(this));

  this.buildRoute(spec);
}

RestfulThings.Dispatcher.prototype = {
  start:function(port) {
    this.server.listen(port);
  },
  buildRoute:function(rs, parents) {
    if(!parents) {
      parents = ["^"];
    }

    for(var k in rs.specs) {
      var s = rs.specs[k];
      var path = parents.slice(0, parents.length);

      path.push(k);
      this.bindMethods(new RegExp(path.join("/") + "/?$", "i"), s, false);

      if(s.isCollection()) {
        path.push(s.idFormat);
        this.bindMethods(new RegExp(path.join("/") + "/?$", "i"), s, true);
      }

      this.buildRoute(rs.specs[k], path);
    }
  },
  bindMethods:function(path, spec, isItem) {
    var thing = this.things[spec.thing];
    if(!thing) return;

    var methods = ["get","put","post","delete"];
    var binder = {
      spec:spec,
      isItem:isItem,
      thing:thing,
      dispatcher:this
    };
    var context = RestfulThings.Dispatcher.contextFilter.bind(binder);
    var auth = RestfulThings.Dispatcher.authorizationFilter.bind(binder);

    for(var i=0;i<methods.length;i++) {
      var method = methods[i];
      var f = thing.handlers[method] || spec.handlers[method];

      if(!!f) {
        console.log("binding",method,"for",path);
        this.server[method](path, context, auth, this.wrap(f));
      }
    }
  },
  wrap:function(f) {
    return function(req, res) {
      try {
        var o = f(req.rt);

        var url = require("url").parse(req.url, true);

        if(o instanceof Object) {
          if(o.constructor === Array) {
            for(var i=0;i<o.length;i++) {
              o[i].links = req.rt.dispatcher.buildLinks(req.rt.spec, url.pathname + "/" + o[i].id)
            }
          } else {
            o.links = req.rt.dispatcher.buildLinks(req.rt.spec, url.pathname);
          }
        }

        res.send(JSON.stringify(o) + "\n");
      } catch(e) {
        res.send(e.message + "\n");
      }
    };
  },
  buildLinks:function(spec, url) {
    var links = {
      self:url
    }

    var u = url + "/";
    for(var path in spec.specs) {
      var s = spec.specs[path];
      links[s.rel || path] = u + path
    }

    return links;
  }
}

RestfulThings.Dispatcher.baseFilter = function(req, res, next) {
  console.log("> baseFilter");
  req.rt = {
    dispatcher:this
  };
  next();
};

RestfulThings.Dispatcher.contextFilter = function(req, res, next) {
  console.log("> contextFilter");

  var formatId = function(spec, id) {
    try {
      if(spec.idFormat === RestfulThings.Format.Numeric) {
        return parseInt(id);  
      } else {
        return id;
      }
    } catch(e) {
      throw RestfulThings.Error.ServerError(e);
    }
  };

  req.rt.id = (this.isItem) ? formatId(this.spec, req.params.pop()) : undefined;
  req.rt.spec = this.spec;

  var p = this.spec.parent;
  var ancestors = [];

  while(!!p && !!p.thing) {
    var pid = p.isCollection() ? formatId(req.params.pop()) : undefined;

    ancestors.push({
      spec:p,
      id:pid
    });

    p = p.parent;
  }

  req.rt.ancestors = ancestors;  

  next();
};

RestfulThings.Dispatcher.authorizationFilter = function(req, res, next) {
  for(var i=0;i<req.rt.ancestors.length;i++) {
    var a = req.rt.ancestors[i];
    if(a.spec.isSecured()) {
      console.log("checking security for", a.spec.thing,"with id",a.id);
    }
  }

  next();
};

RestfulThings.Errors = {
  NotFound:function(message) {
    return {status:404,message:message || "Not Found"};
  },
  ServerError:function(message) {
    return {status:500, message:message || "Server Error"};
  }
};

RestfulThings.Format = {
  Numeric:"([0-9]+)",
  Any:"([^/]+)"
};
