require("./rt");

// pull in other required source files
['schemas','db','user','list','app'].forEach(function(x) {
  require("./beListful." + x);
});

var dispatcher = new RestfulThings.Dispatcher(user, list, app);
dispatcher.start(8080);

/*
- PUT a new dev user
- POST/PUT a new application in 'DEV' status
- POST a new template
- PUT a new regular user
- POST a new list instance 
- POST item(s)
- DELETE item(s)
- 


Application
- must have:
  - id (in namespace format)
  - vendor
  - title
  - description
  - status (DEV, BETA, PROD)
  - contact email(s), either string or obj
    - if string, then string must be valid email
    - if obj, must be a map of purposes to email
      (e.g. { "Marketing":"m@a.com", "Technical Support":"t@a.com" })






*/
