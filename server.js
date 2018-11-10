//dependencies
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


//initialize Express app
const express = require('express');
const app = express();


app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(express.static(`${process.cwd()}/public`));

const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

//connect to MongoDB
const databaseUri = 'mongodb://localhost/scraped_news';

if (process.env.MONGODB_URI) {

  mongoose.connect(process.env.MONGODB_URI);

} else {

mongoose.connect(databaseUri);

}

const db = mongoose.connection;
db.on('error', (err) => {
  console.log('Mongoose Error: ', err);
});
db.once('open', () => {
  console.log('Connected to Mongoose!');
});

const routes = require('./controllers/controller');
app.use('/', routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on PORT ${port}`);
});