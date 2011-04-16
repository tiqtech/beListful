require("./src/rt");

// pull in other required source files
['schemas','db','user','list','app'].forEach(function(x) {
  require("./src/beListful." + x);
});

new RestfulThings.Dispatcher(user, list, app).start(80);