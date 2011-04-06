var daemon = require('daemon');
var fs = require('fs');
var sys = require('sys');
require("./rt");

// pull in other required source files
['schemas','db','user','list','app'].forEach(function(x) {
  require("./beListful." + x);
});

var config = {
    lockFile: '/var/run/beListful.pid',
	logFile: '/var/log/beListful.log'
};
 
var args = process.argv;
var dPID;

switch(args[2]) {
    case "stop":
        process.kill(parseInt(fs.readFileSync(config.lockFile)));
        process.exit(0);
        break;
 
    case "start":
		new RestfulThings.Dispatcher(user, list, app).start(8080);
		process.title = "beListful";
	    if(args[3] !== "no-daemon") {
			daemon.daemonize(config.logFile, config.lockFile, function(err, started){
		        if (err) {
		            console.dir(err.stack);
		            return sys.puts('Error starting daemon: ' + err);
		        }
				
		        sys.puts('Successfully started daemon');
		    });
		}
		break;
 
    default:
        sys.puts('Usage: [start|stop]');
        process.exit(0);
}

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
