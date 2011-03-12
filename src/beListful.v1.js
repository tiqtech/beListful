require("./rt");

var spec = RestfulThings.ResSpec.parse({
  "contains":{
    "users":{
      "thing":"user",
      "collection":true,
      "idFormat":RestfulThings.Format.Numeric,
      "contains":{
        "lists":{
          "thing":"list",
          "collection":true,
          "idFormat":RestfulThings.Format.Numeric,
          "contains":{
            "items":{
              "thing":"item",
              "collection":true
            },
            "owner":{
              "thing":"user",
              "rel":"owner",
              "ref":"/users"
            }
          }
        },
        "friends":{
          "thing":"user",
          "collection":true,
          "ref":"/users",
          "rel":"friend"
        }
      }
    },
    "applications":{
      "thing":"app",
      "collection":true,
      "contains":{
        "templates":{
          "thing":"template",
          "collection":true
        }
      }
    }
  }
});

var db = {
  getUser:function(id) {
    for(var i=0;i<this.users.length;i++) {
      if(this.users[i].id === id) {
        return this.users[i];
      }
    }

    throw -1;
  },
  getAllUsers:function() {
    return this.users;
  },
  "users":[
    {id:1,"username":"ryan",firstName:"Ryan",lastName:"Duffy"},
    {id:2,"username":"renee",firstName:"Renee",lastName:"Duffy"}
  ],
  "lists":[
    {id:1,"owner":1,name:"Groceries", items:[
      {"name":"Candy","quantity":5,"unit":"lbs",description:"Yummy"},
      {"name":"Cookies","quantity":"dozen","description":"chocolate chip"}
    ]}
  ]
};

var user = new RestfulThings.Thing({
  "rel":function(context) {
    if(context.spec.rel === "friend") {
      var id = context.ancestors[0].id;
      return (id%2)+1;
    }
  },
  "get":function(context) {
      try {
        return (context.id !== undefined) ? db.getUser(context.id) : db.getAllUsers();
      } catch(e) {
        if(e === -1) {
          throw RestfulThings.Errors.NotFound();
        } else {
          throw RestfulThings.Errors.ServerError(e);
        }
      }
    }
  }
);

var list = new RestfulThings.Thing({
  "rel":function(context) {
    if(context.spec.rel === "owner") {
      var id = context.ancestors[0].id;
      for(var i=0;i<db.lists.length;i++) {
        if(db.lists[i].id === id) {
          return db.lists[i].owner;
        }
      }
    }
  },
  "get":function(context) {
    if(context.id === undefined) {
      return db.lists;
    } else {
      for(var i=0;i<db.lists.length;i++) {
        if(db.lists[i].id === context.id) {
          return db.lists[i];
        }
      }

      throw RestfulThings.Errors.NotFound("List " + context.id + " does not exist");
    }
  },
  "post":function(context) {
    if(context.id === undefined) { // = PUT
      return {id:-1,title:"A New List"};
    } else {
      return {id:context.id,title:"An Updated List"};
    }
  }
});

var dispatcher = new RestfulThings.Dispatcher(spec, {"user":user,"list":list});
dispatcher.start(8080);
