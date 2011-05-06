beListful = {
	Config: {
		secure: false,
//		host: "belistful.no.de",
//		port: 8001
		host: "10.0.2.2",
		port: 9000
//		host: "ec2-50-16-63-167.compute-1.amazonaws.com",
//		port: 80
	},
	User: {
		username: null,
		token: "" // future auth token
	},
	url: function(){
		if (!this._url) {
			this._url = ((this.Config.secure) ? "https://" : "http://") + this.Config.host + ":" + this.Config.port;
		}
		
		return this._url;
	},
	get:function(url, callback) {
		this.call(url, "GET", undefined, callback)
	},
	post:function(url, body, callback) {
		this.call(url, "POST", body, callback)
	},
	put:function(url, body, callback) {
		this.call(url, "PUT", body, callback)
	},
	del:function(url, callback) {
		this.call(url, "DELETE", undefined, callback)
	},
	call:function(relativeUrl, method, body, callback) {
		var client = require('http').createClient(this.Config.port, this.Config.host);  
		var emitter = new require('events').EventEmitter();  
  
		var request = client.request(method, relativeUrl, {"host": this.Config.host, "Content-type": "application/json"});
		
		var onSuccess = this.onSuccess.bind(this, callback);
		var onFailure = this.onFailure.bind(this, callback);
		
		request.addListener("response", function(response) {  
			var responseBody = "";  
			response.addListener("data", function(data) {  
				responseBody += data;  
			});
  
			response.addListener("end", function() {
				if(response.statusCode == 204) {
					onSuccess();
				} else if(response.statusCode >= 200 && response.statusCode < 300) {
					onSuccess((responseBody) ? JSON.parse(responseBody) : undefined);
				} else if (response.statusCode >= 300 && response.statusCode < 305) {
					var location = response.headers["location"];
					location = location.replace(/https?:\/\/[^\/]*(.*)/, "$1");
					beListful.get(location, callback);
				} else {
					onFailure(response.statusCode);
				}
			});
		});
		
		request.end(JSON.stringify(body));
	},
	authenticate:function(username, password) {
		// not implemented
		this.User.username = "ryan";
	},
	onFailure:function(callback, status) {
		callback(undefined, status);
	},
	onSuccess:function(callback, data) {
		callback(data);
	}
}


