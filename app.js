const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
	try {
		res.send('server is open');
	} catch (err) {
		console.log(err);
	}
});
app.listen(3000, () => console.log('server, 3000'));

module.exports = app;
