var express = require('express');
var bodyParser = require('body-parser');

var links = require('./uiserverlib/links');
var link = require('./scripts/update');
var logger = links.getLogger();
var app = express();

//app.use(bodyParser());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.use(function(req, res, next){
  logger.debug('%s %s', req.method, req.url);
  next();
});

app.use('/dashboard', express.static(__dirname));
app.get('/dashboard/:dashboardId/widgets', links.widgets);
app.get('/dashboard/apicall', links.apicall);
app.get('/dashboard/dashboards', links.dashboards);
app.get('/dashboard/addDashboard', links.addDashboard);
app.get('/delete/:dashboardTitle/:dashboardId',link.delete);
//app.get('/dashboard/try', links.addDashboard);
app.post('/update', link.update)
app.listen(8080);