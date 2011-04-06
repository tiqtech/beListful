require("./beListful.js");
var assert = require('assert');

var indent = 1;

function run(suite, param, additions) {
	var passthrough = function(param, callback) { callback(param); };
	
	var t = suite.shift();
	if(!t) return;
	
	if(!param) {
		param = {};
	}
	
	for(var k in additions) {
		param[k] = additions[k]
	}
	
	var type;
	var indentString = new Array(indent).join("  ");
	
	if(t.test) {
		type = "Test";
	} else {
		type = "Suite";
		t.test = passthrough;
		if(t.endSuite) {
			indent--;
			indentString = new Array(indent).join("  ");
		} else {
			indent++;
		}
	}
	
	console.log(indentString,(t.endSuite) ? "Completed" : "Running", type, t.name);
	t.test(param, run.bind(run, suite, param));
}

function buildTestSuite(t, suiteName) {
	var suite = suiteName || "Main";
	var tests = [{name:suite}];
	
	for(var name in t) {
		if(typeof(t[name]) === "object") {
			tests = tests.concat(buildTestSuite(t[name], name));
		} else {
			tests.push({name: name, test: t[name]});
		}
	}
	
	tests.push({name:suite,endSuite:true});
	
	return tests;
}

var tests = {
	"Users":{
		"Add New User":function(param, callback) {
			var o = param.objects["Test User"];
			beListful.put(param.config.userPath, o, function(res, err){
				assert.equal(err, undefined, "PUT failed");
				callback({user:res});
			});
		},
		"Get New User":function(param, callback) {
			beListful.get(param.user.links.self, function(res,err){
				assert.equal(err, undefined, "GET failed");
				assert.notEqual(res, undefined, "GET failed (no response object)");
				callback();
			});
		},
		"Update User": function(param, callback){
			param.user.firstName = "New User";
			beListful.put(param.user.links.self, param.user, function(res, err) {
				assert.equal(err, undefined, "PUT failed");
				assert.equal(res.firstName, "New User", "Name not updated");
				callback({user:res});
			})
		},
		"Add Dev User":function(param, callback) {
			var o = param.objects["Dev User"];
			beListful.put(param.config.devUserPath, o, function(res, err){
				assert.equal(err, undefined, "PUT failed");
				callback({devuser:res});
			});
		}
	},
	"Applications":{
		"Add com.tiqtech.testapp":function(param, callback) {
			var o = param.objects["Test App"];
			beListful.put(param.config.appPath, o, function(res, err) {
				assert.equal(err, undefined, "PUT failed");
				callback({app:res});
			});
		},
		"Add Template":function(param, callback) {
			var o = param.objects["Template"];
			beListful.post(param.app.links.templates, o, function(res, err) {
				assert.equal(err, undefined, "POST failed");
				callback({template:res});
			});
		}
	},
	"Lists":{
		"Add New List":function(param, callback) {
			var o = param.objects["Basic List"];
			o.template = param.template.id;
			beListful.post(param.user.links.lists, o, function(res, err) {
				assert.equal(err,undefined, "POST failed");
				callback({list:res});
			});
		},
		"Check For New List":function(param, callback) {
			beListful.get(param.user.links.lists, function(res, err){
				assert.equal(err, undefined, "GET failed");
				assert.notEqual(res.length,0,"No lists for user")
				
				var found = -1;
				for(var i=0;i<res.length;i++) {
					if(res[i].id === param.list.id) {
						found = i;
						break;
					}
				}
				
				assert.equal(found != -1, true, "List not associated with user");
				callback({list: res[found]});
			});
		},
		"Items": {
			"Add Item to List":function(param, callback) {
				beListful.post(param.list.links.items, param.objects["Item"], function(res, err) {
					assert.equal(err, undefined, "POST failed");
					
					callback()
				});
			},
			"Get Items for New List": function(param, callback){
				beListful.get(param.list.links.items, function(res, err){
					assert.equal(err, undefined, "GET failed")
					callback();
				});
			}
		}
	},
	"Clean Up":{
		"Delete List":function(param, callback) {
			beListful.del(param.list.links.self, function(res, err) {
				assert.equal(err, undefined, "DELETE failed");
				callback();
			});
		},
		"Delete Test User":function(param, callback) {
			beListful.del(param.user.links.self, function(res, err) {
				assert.equal(err, undefined, "DELETE failed");
				callback();
			});
		},
		"Delete Dev User":function(param, callback) {
			beListful.del(param.devuser.links.self, function(res, err) {
				assert.equal(err, undefined, "DELETE failed");
				callback();
			});
		}
	}
}

run(buildTestSuite(tests), {
	config:{
		userPath:"/users/test",
		devUserPath:"/users/testdev",
		appPath:"/applications/com.tiqtech.testapp",	
	},
	objects:{
		"Test User":{firstName:"Test",lastName:"User",id:"test",role:["user"],email:"test@user.com"},
		"Dev User":{firstName:"Test",lastName:"User",id:"testdev",email:"test@user.com",role:["user","developer"]},
		"Basic List":{template:"testapptemplate",name:"Basic List",description:"Basic List Description",owner:"test"},
		"Test App":{id:"com.tiqtech.testapp",owner:"testdev",vendor:"tiqtech",name:"simplyDone",description: "task management for webOS",status: "DEV",email: "simplydone-support@tiqtech.com"},
		"Template":{application:"com.tiqtech.testapp",name:"test app template",description:"test app template",schema:{type:'object',properties:{title:{type:'string'}}}},
		"Item":{title:"Test Item"}
	}
});