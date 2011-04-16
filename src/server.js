require("./rt");

// pull in other required source files
['schemas','db','user','list','app'].forEach(function(x) {
  require("./beListful." + x);
});

new RestfulThings.Dispatcher(user, list, app).start(8080);