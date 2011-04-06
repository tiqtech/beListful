Schema = require("schema");

schemas = {
    user: Schema.create({
        type: 'object',
        properties: {
            firstName: {
                type: 'string'
            },
			lastName: {
				type: 'string'
			},
			id: {
				type: 'string',
			},
			email: {
				type: 'string'
			},
			role: {
				type: 'array',
				items: {
					type:'string',
					'enum': ['admin', 'user', 'developer']
				},
				'default':['user']
			}
        }
    }),
    application: Schema.create({
		type:'object',
		properties:{
			id:{
				type: 'string'
			},
			owner:{
				type: 'string'
			},
			vendor:{
				type: 'string'
			},
			name: {
				type: 'string'
			},
			description: {
				type: 'string'
			},
			status: {
				type: 'string',
				'enum': ['DEV', 'BETA', 'PROD'],
				'default': 'DEV'
			},
			email: {
				type: 'string'
			}
		}
	}),
	list: Schema.create({
		type: 'object',
		properties:{
			template:{
				type:'string'
			},
			name:{
				type:'string'
			},
			description:{
				type:'string'
			},
			owner:{
				type:'string'
			}
		}
	}),
	template: Schema.create({
		type:'object',
		properties:{
			application:{
				type:'string'
			},
			name: {
				type: 'string'
			},
			description:{
				type: 'string'
			},
			schema:{
				type: 'object'
			}
		}
	})
}
