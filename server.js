const express = require('express');
const models = require('./database/models');


const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => res.send('Hello World'));

app.get('/requests', (req, res) => {
	console.log(models);
	models.Request.findAll().then(requests => {
		res.json(requests);
	});	
});

app.listen(3000, () => console.log('Listening on port 3000'));
