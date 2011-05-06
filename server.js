require("restful-things");
var simplate = require("simplate");

// pull in other required source files
['schemas','db','user','list','app'].forEach(function(x) {
  require("./src/beListful." + x);
});

function getContent(options, callback) {
	var req = require("https").request(options, function(res) {
		var body = "";
		res.on('data', function (chunk) {
			body += chunk;
		});
		
		res.on('end', function() {
			callback(body);
		});
	});
	
	req.end();
}

simplate.addFromFile("register", "templates/register.html")
	.addFromFile("header", "templates/header.html")
	.addFromFile("footer", "templates/footer.html");

var dispatcher = new RestfulThings.Dispatcher(user, list, app);
dispatcher.setStaticPath(__dirname + '/static');
dispatcher.server.get("/fbauth", function(req, res) {
	var appId = "APPID";
    var appSecret = "SECRET";
    var myUrl = "http://beListful.no.de/fbauth";

	var url = require("url").parse(req.url, true);
    var code = url.query.code;

    if(!code) {
        var dialogUrl = "http://www.facebook.com/dialog/oauth?client_id=" + appId + "&redirect_uri=" + encodeURIComponent(myUrl);
        res.redirect(dialogUrl);
		return;
    }

    var tokenUrl = {
		host: "graph.facebook.com",
		method: "GET",
		path: "/oauth/access_token?client_id=" + appId + "&redirect_uri=" + encodeURIComponent(myUrl) + "&client_secret=" + appSecret + "&code=" + code
	}

    getContent(tokenUrl, function(token) {
		var graphUrl = {
			host: "graph.facebook.com",
			method: "GET",
			path: "/me?" + token
		};
		
		getContent(graphUrl, function(user) {
			user = (user) ? JSON.parse(user) : {};
			var o = {
				page:{
					title:"Registration"
				},
				user:user
			}
			res.send(simplate.render("register", o));
		})
	});
});

dispatcher.start(80);

