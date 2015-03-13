var http = require('http');
var cassandra = require('cassandra-driver');
var fs=require('fs');

exports.getLogger = function() {
	var log4js = require('log4js');
	log4js.configure("log4js-ui-conf.json", {});

	var logger = log4js.getLogger("uiserver");
	logger.setLevel('DEBUG');

	return logger;
};

var logger = exports.getLogger();
var addDash = "Hello";
/*var dashboards = [{
	id: "dashboard-0",
	title: "UCCX"
},{
	id: "dashboard-1",
	title: "CUIC"
},{
	id: "dashboard-2",
	title: "CVP"
},{
	id: "dashboard-3",
	title: "Voice Browser"
},{
	id: "dashboard-4",
	title: "Social Miner"
}
];

var dashboardwidgets = {
		"dashboard-0": [{
			id: 'uccx-widget-id-0',
			title: 'UCCX S1-S5 DEFECTS',
			type: 'CHART',

			dataUrl: 'http://localhost:8082/metrics/defectdistribution?product=uccx'
		}, {
			id: 'uccx-widget-id-1',
			title: 'DEFECT STATISTICS',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/defectstatistics?product=uccx'
		}, {
			id: 'uccx-widget-id-2',
			title: 'STATIC VIOLATIONS',
			type: 'DELTA',
			dataUrl: 'http://localhost:8082/metrics/staticviolations?product=uccx'
		}, {
			id: 'uccx-widget-id-3',
			title: 'CI BUILD',
			type: 'MULTISTAT',

			dataUrl: 'http://localhost:8082/metrics/cibuild?product=uccx'
		}, {
			id: 'uccx-widget-id-4',
			title: 'CODE COVERAGE',
			type: 'DELTA',
			options: {unit: "%", green: "up"},
			dataUrl: 'http://localhost:8082/metrics/linecoverage?product=uccx'
		}, {
			id: 'uccx-widget-id-5',
			title: 'RISK TO SHIP',
			type: 'RTS',
			dataUrl: 'http://localhost:8082/metrics/risktoship?product=uccx'

		}, {
			id: 'uccx-widget-id-6',
			title: 'DEFECTS COUNT',
			type: 'ABSOLUTE',
			dataUrl: 'http://localhost:8082/metrics/defectcount?product=uccx'


		}],
		"dashboard-1": [{
			id: 'cuic-widget-id-0',
			title: 'CUIC S1-S5 DEFECTS',
			type: 'CHART',
			dataUrl: 'http://localhost:8082/metrics/defectdistribution?product=cuic'
		}, {
			id: 'cuic-widget-id-1',
			title: 'DEFECT STATISTICS',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/defectstatistics?product=cuic'
		}, {
			id: 'cuic-widget-id-2',
			title: 'STATIC VIOLATIONS',
			type: 'DELTA',
			options: {green: "down"},
			dataUrl: 'http://localhost:8082/metrics/staticviolations?product=cuic'
		}, {
			id: 'cuic-widget-id-3',
			title: 'CI BUILD',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/cibuild?product=cuic'
		}, {
			id: 'cuic-widget-id-4',
			title: 'CODE COVERAGE',
			type: 'DELTA',
			options: {unit: "%", green: "up"},
			dataUrl: 'http://localhost:8082/metrics/linecoverage?product=cuic'
		}, {
			id: 'cuic-widget-id-5',
			title: 'RISK TO SHIP',
			type: 'RTS',
			dataUrl: 'http://localhost:8082/metrics/risktoship?product=cuic'

		},{
			id: 'cuic-widget-id-6',
			title: 'DEFECTS COUNT',
			type: 'ABSOLUTE',
			dataUrl: 'http://localhost:8082/metrics/defectcount?product=cuic'

		}],
		"dashboard-2": [{
			id: 'cvp-widget-id-0',
			title: 'CVP S1-S5 DEFECTS',
			type: 'CHART',
			dataUrl: 'http://localhost:8082/metrics/defectdistribution?product=cvp'
		}, {
			id: 'cvp-widget-id-1',
			title: 'DEFECT STATISTICS',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/defectstatistics?product=cvp'
		}, {
			id: 'cvp-widget-id-2',
			title: 'STATIC VIOLATIONS',
			type: 'DELTA',
			options: {green: "down"},
			dataUrl: 'http://localhost:8082/metrics/staticviolations?product=cvp'
		}, {
			id: 'cvp-widget-id-3',
			title: 'CI BUILD',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/cibuild?product=cvp'
		}, {
			id: 'cvp-widget-id-4',
			title: 'CODE COVERAGE',
			type: 'DELTA',
			options: {unit: "%", green: "up"},
			dataUrl: 'http://localhost:8082/metrics/linecoverage?product=cvp'
		},{
			id: 'cvp-widget-id-5',
			title: 'RISK TO SHIP',
			type: 'RTS',
			dataUrl: 'http://localhost:8082/metrics/risktoship?product=cvp'

		}, {
			id: 'cvp-widget-id-6',
			title: 'DEFECTS COUNT',
			type: 'ABSOLUTE',
			dataUrl: 'http://localhost:8082/metrics/defectcount?product=cvp'


		}],
		"dashboard-3": [{
			id: 'vb-widget-id-0',
			title: 'VB S1-S5 DEFECTS',
			type: 'CHART',
			dataUrl: 'http://localhost:8082/metrics/defectdistribution?product=vb'
		},  {
			id: 'vb-widget-id-1',
			title: 'DEFECT STATISTICS',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/defectstatistics?product=vb'
		}, {
			id: 'vb-widget-id-2',
			title: 'STATIC VIOLATIONS',
			type: 'DELTA',
			options: {green: "down"},
			dataUrl: 'http://localhost:8082/metrics/staticviolations?product=vb'
		}, {
			id: 'vb-widget-id-3',
			title: 'CI BUILD',
			type: 'MULTISTAT',
			dataUrl: 'http://localhost:8082/metrics/cibuild?product=vb'
		}, {
			id: 'vb-widget-id-4',
			title: 'CODE COVERAGE',
			type: 'DELTA',
			options: {unit: "%", green: "up"},
			dataUrl: 'http://localhost:8082/metrics/linecoverage?product=vb'
		},{
			id: 'vb-widget-id-5',
			title: 'RISK TO SHIP',
			type: 'RTS',
			dataUrl: 'http://localhost:8082/metrics/risktoship?product=vb'

		}, {
			id: 'vb-widget-id-6',
			title: 'DEFECTS COUNT',
			type: 'ABSOLUTE',
			dataUrl: 'http://localhost:8082/metrics/defectcount?product=vb'


		}],
	"dashboard-4": [{
		id: 'sm-widget-id-0',
		title: 'LOAD & AUTOMATION ',
		type: 'LandA',
		dataUrl: 'http://localhost:8082/metrics/teststatistics?product=sm'
	}, {
		id: 'sm-widget-id-1',
		title: 'RISK TO SHIP',
		type: 'RTS',
		dataUrl: 'http://localhost:8082/metrics/risktoship?product=sm'

	}, {
		id: 'sm-widget-id-2',
		title: 'STATIC VIOLATIONS',
		type: 'DELTA',
		options: {green: "down"},
		dataUrl: 'http://localhost:8082/metrics/staticviolations?product=sm'
	}, {
		id: 'sm-widget-id-3',
		title: 'CI BUILD',
		type: 'MULTISTAT',
		dataUrl: 'http://localhost:8082/metrics/cibuild?product=sm'
	}, {
		id: 'sm-widget-id-4',
		title: 'CODE COVERAGE',
		type: 'DELTA',
		options: {unit: "%", green: "up"},
		dataUrl: 'http://localhost:8082/metrics/linecoverage?product=sm'
	}, {
		id: 'sm-widget-id-5',
		title: 'DEFECTS COUNT',
		type: 'ABSOLUTE',
		dataUrl: 'http://localhost:8082/metrics/defectcount?product=sm'


	}, {
		id: 'sm-widget-id-6',
		title: 'DEFECT STATISTICS',
		type: 'MULTISTAT',
		dataUrl: 'http://localhost:8082/metrics/defectstatistics?product=sm'
	}]
	};
*/
exports.dashboards = function(req, res) {
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select id,product_name from products;", function (err, result) {
		var dashboards = [];
		if(!err) {
			for(var i=0;i<result.rows.length;i++){
				var a = result.rows[i];
				dashboards.push({
					id: a.id,
					title: a.product_name
				});
			}
			//console.log(dashboards);
			res.send(dashboards);

		}

	});

};

exports.widgets = function(req, res) {
	fs.readFile("widgets.json", function (err, result_data) {
		var dashboardwidgets = JSON.parse(result_data+"");
		var responseData = dashboardwidgets[req.params.dashboardId];
		if (responseData && responseData.length > 0) {
			for (var counter = 1; counter < responseData.length; counter++) {
				var swapIndex = Math.floor((Math.random() * (responseData.length - 1)) + 1);
				var temp = responseData[swapIndex];
				responseData[swapIndex] = responseData[counter];
				responseData[counter] = temp;
			}
		}
		res.send(responseData ? responseData : []);
	});


};

exports.addDashboard = function(req, res){
	res.send(addDash);
}

exports.apicall = function(req, res) {
	var url = req.query.url;
	var output = "";

	http.get(url, function(apiresponse) {
		if(apiresponse.statusCode != 200) {
			logger.debug("Error: " + url + ": " + apiresponse.statusCode);
			res.status(500).send({
				apiStatus: apiresponse.statusCode,
				error: "Internal Server Error!"
			});
		} else {
			apiresponse.on('data', function(chunk) {
				output += chunk;
			}).on('end', function() {
				var json = JSON.parse(output);
				res.send(json);
			});
		}
	}).on('error', function(e) {
		logger.debug("Error: " + url);
		res.status(500).send({
			apiStatus: -1,
			error: "Internal Server Error!"
		});		
	});
};