var http = require('http');
var fs = require('fs');
var def_res, static_viol;
var async = require('async');
var cassandra = require('cassandra-driver');

exports.getLogger = function() {
	var log4js = require('log4js');
	log4js.configure("log4js-api-conf.json", {});

	var logger = log4js.getLogger("apiserver");
	logger.setLevel('DEBUG');

	return logger;
};

var logger = exports.getLogger();

var uccx_threshold=3000, cvp_threshold=3000, cuic_threshold=3000, vb_threshold=3000,sm_threshold = 3000;

var DeltaRecordUtil = function(green, value, file, precision) {
	var response;
	var delta = 0;
	var better = false;
	var precision = precision ? precision : 0;

	var success = function() {
		response.send({
			value: Number(value).toFixed(precision),
			delta: Number(delta).toFixed(precision),
			better: better
		});
	};

	var error = function() {
		response.status(500).send({
			error: "Internal Server Error!"
		});
	};

	var getLine = function(prev, curr) {
		return prev + "," + curr;
	};

	var getValues = function(line) {
		var values = line.split(",");
		return {
			prev: parseFloat(values[0]),
			curr: parseFloat(values[1])
		};
	}

	return {
		recordAndRespond: function(res) {
			response = res;

			if(isNaN(value)) {
				error();
				return;
			}

			if(fs.existsSync(file)) {
				fs.readFile(file, function(err, data) {
					if(err) {
						error();
						return;
					} else {
						var prevResults = getValues(data + "");

						var prevDelta = prevResults.curr - prevResults.prev;
						var wasBetter = (green == "up") ? (prevDelta > 0) : (prevDelta < 0);

						if(value != prevResults.curr) {
							delta = wasBetter ? (value - prevResults.curr) : (value - prevResults.prev);
						} else {
							delta = value - prevResults.prev;
						}

						better = (green == "up") ? (delta > 0) : (delta < 0);

						if(value != prevResults.curr) {
							var updatedRecord = wasBetter ? getLine(prevResults.curr, value) : getLine(prevResults.prev, value);
							fs.writeFile(file, updatedRecord, success);
							return;
						} else {
							success();
							return;
						}
					}
				});
			} else {
				fs.writeFile(file, getLine(value, value), success);
				return;
			}
		}
	};
};



exports.cibuild = function(req, res) {


	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select cibuild_server,cibuild_path from products where product_name='" + req.query.product + "';", function (err, result) {
		if (!err) {
			var conf = result.rows[0];

			var request = http.request({
				host: conf.cibuild_server,
				path: conf.cibuild_path,
				method: 'GET'
			}, function (response) {
				var output = '';

				response.on('data', function (chunk) {
					output += chunk;
				});

				response.on('end', function () {
					try {
						var json = JSON.parse(output);
					} catch (e) {
						res.status(500).send({
							error: "CI build data is not parseable."
						});

						return;
					}
					fs.writeFile(req.query.product+"-cibuild.txt",json.failCount,function(err){
						if(err){
							console.log(err);
						}
					});

					var durations = [];
					var longestRunning = 0;
					for (var i in json.childReports) {
						var suites = json.childReports[i].result.suites;
						for (var j in suites) {
							var cases = suites[j].cases;
							for (var k in cases) {
								durations.push(parseFloat(cases[k].duration));
								if (longestRunning < cases[k].duration) {
									longestRunning = cases[k].duration;
								}
							}
						}
					}

					durations.sort(function (a, b) {
						return (b - a);
					});

					var toptests = 0.0;
					for (var i = 0; i < 10; i++) {
						toptests += durations[i];
					}

					var format = function (val) {
						var hrs = parseInt(val / 3600);
						hrs = hrs < 10 ? "0" + hrs : hrs;

						var mins = parseInt((val - (hrs * 3600)) / 60);
						mins = mins < 10 ? "0" + mins : mins;

						var secs = val - (hrs * 3600) - (mins * 60);
						secs = secs < 10 ? "0" + secs : secs;

						return (hrs == "00" ? "" : hrs + ":") + mins + ":" + secs;
					};

					res.send({
						values: [{
							label: "Passed Tests",
							value: json.totalCount - json.failCount,
							style: 'success'
						}, {
							label: "Failed Tests",
							value: json.failCount,
							style: json.failCount > 0 ? 'error' : ''
						}, {
							label: "Longest Running Test",
							value: format(Number(longestRunning).toFixed(0))
						}, {
							label: "Top 10 Tests",
							value: format(Number(toptests).toFixed(0))
						}]
					});
				});
			});
		}
		else
			console.log("No result found.")

		request.end();
	});
};

exports.teststatistics=function(req,res){
	var final_result=[];
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select teststatistics from products where product_name='" + req.query.product + "';", function (err, result) {
		if (!err) {
			var conf = result.rows[0];

			var phantom = require('phantom');
			phantom.create(function (ph) {
					logger.debug("opening enotify9-1");
					return ph.createPage(function (page) {
						return page.open(conf.teststatistics, function (status) {
							logger.debug("opened enotify9-1? ", status);
							page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");
							page.evaluate(function () {
								var result = [], act,status;
								$("table#projectstatus tr").each(function () {
									if($(this).attr('id')!=null)
									{
										id = "[id='" + $(this).attr('id') + "']";
										act = $(id).find("> td:nth-child(2)").text();
										status = $(this).find("> td:nth-child(1) img").attr("alt");
										result.push({
											name: act,
											status: status
										});
									}
								});
								return {
									values: result
								}
							}, function (result) {
								console.log("printing result");
								console.log(result);
								var i =0;
								next_page();
								function handle_page(file){
									page.open(file,function(){
										page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");
										page.evaluate(function(){
											var failures,tests,fail_percent,status;
											failures = $("table#main-table tbody tr td:nth-child(2) div:nth-child(3) div:nth-child(1)").text().trim();
											tests=$("table#main-table tbody tr td:nth-child(2) div:nth-child(3) div:nth-child(3)").text().trim();
											var nf=[],nt=[];
											nf=failures.split(" ");
											nt=tests.split(" ");
											nf[1]=nf[1].replace( /,/g, "" );
											nt[1]=nt[1].replace( /,/g, "" );
											fail_percent=parseFloat(nf[1])/parseFloat(nt[1])*100;
											if(fail_percent<2)
												status='Success'
											else
												status='Unstable'
											//console.log(parseFloat(nf[1]));

											return(
											{
												failures: parseFloat(nf[1]),
												tests: parseFloat(nt[1]),
												status: status
											}
											);
										},function(data){
											console.log(data);
											console.log(i);
											final_result.push(
												{
													name: result.values[i].name,
													failed: data.failures,
													total: data.tests,
													status: data.status
												}
											)
											console.log(final_result);
											i++;
										});
										setTimeout(next_page,100);
									});
								}
								function next_page(){
									var fail = 0, total = 0;
									if(i<result.values.length-1) {

											if(result.values[i].status != "In progress" && result.values[i].status != "Aborted" && result.values[i].status != "Failed" && result.values[i].status != 'Pending') {
												var file = conf.teststatistics + "job/" + result.values[i].name + "/lastCompletedBuild/testReport/";
												if (!file) {
													phantom.exit(0);
												}
												handle_page(file);
											}
											else
											{
												final_result.push({
													name: result.values[i].name,
													failed: fail,
													total: total,
													status: result.values[i].status
												});
												i++;
												next_page();

											}


									}
									else if(i==result.values.length-1)
										send();
								}
								function send()
								{
									var file_data="";
									for(var i=0;i<final_result.length;i++) {
										if(i==final_result.length-1)
											file_data = file_data + final_result[i].status;
										else
											file_data = file_data + final_result[i].status + ",";
									}
									fs.writeFile(req.query.product+"-teststatistics.txt",file_data,function(err){
										if(err){
											console.log(err);
										}
									});
									console.log(final_result);
									res.send({values: final_result});
								}
							});
						});
					});
				},
				{
					dnodeOpts: {
						weak: false
					}
				});
			//console.log(final_result);
		}
		else
			console.log("Result not found");

	});
}




exports.defectcount = function(req, res) {
	var phantom = require('phantom');
	var conf;
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select defectcount from products where product_name='" + req.query.product + "';", function (err, result) {
		if(!err)
		{
			conf = result.rows[0];
			//	console.log(conf.defectcount);
			phantom.create(function (ph) {
					logger.debug("opening enotify9-1");
					return ph.createPage(function (page) {
						return page.open("http://enotify9-1.cisco.com/enotify-v8/sites/ccbu/output/website/index.html", function (status) {
							logger.debug("opened enotify9-1? ", status);
							page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

							page.evaluate(function (conf) {
								var outstanding = parseInt($("a[href='" + conf.defectcount + "']").text());
								var threshold = parseInt($("a[href='" + conf.defectcount + "']")
									.parent().parent().parent().parent()
									.children(":nth-child(5)")
									.children("font").text());

								return {
									actual: outstanding,
									threshold: threshold

								};
							}, function (result) {
								if (isNaN(result.actual) || isNaN(result.threshold)) {
									res.status(500).send({
										error: "Internal Server Error!"
									});
								} else {
									def_res = result;
									res.send(result);
								}
								ph.exit();
							}, conf);
						});
					})
				}, {
					dnodeOpts: {
						weak: false
					}
				}
			);
		}
		else
			console.log("No result found.")

	});
};

exports.linecoverage = function(req, res) {

	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select linecoverage from products where product_name='" + req.query.product + "';", function (err, result) {
			if(!err) {
				var conf=result.rows[0];
				var phantom = require('phantom');
				phantom.create(function (ph) {
						logger.debug("opening sonar");
						return ph.createPage(function (page) {
							return page.open(conf.linecoverage, function (status) {
								logger.debug("opened sonar? ", status);
								page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

								page.evaluate(function () {
									var linecoverage = parseFloat($("th > span#m_line_coverage").text().replace("%", ""));

									return {
										value: linecoverage
									};
								}, function (result) {
									var util = new DeltaRecordUtil("up", result.value, req.query.product + "-linecoverage.txt", 2);
									util.recordAndRespond(res);

									ph.exit();
								});
							});
						});
					},
					{
						dnodeOpts: {
							weak: false
						}
					}
				);
			}
			else
				console.log("Resultnot found.");
		}
	);
};

exports.branchcoverage = function(req, res) {
	var prodManagement = new ProductManagement(req.query.product);
	var conf = prodManagement.getConf("branchcoverage");

	var phantom = require('phantom');
	phantom.create(function(ph) {
			logger.debug("opening sonar");
			return ph.createPage(function(page) {
				return page.open(conf.url, function(status) {
					logger.debug("opened sonar? ", status);
					page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

					page.evaluate(function() {
						var branchcoverage = parseFloat($("th > span#m_branch_coverage").text().replace("%", ""));

						return {
							value: branchcoverage
						};
					}, function(result) {
						var util = new DeltaRecordUtil("up", result.value, conf.product + "-branchcoverage.txt", 2);
						util.recordAndRespond(res);

						ph.exit();
					});
				});
			});
		},
		{
			dnodeOpts: {
				weak: false
			}
		});
};



exports.staticviolations = function(req, res) {
	var phantom = require('phantom');

	//var conf = prodManagement.getConf("staticviolations");
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select static_violations from products where product_name='" + req.query.product + "';", function (err, result) {
			if (!err) {
				var conf = result.rows[0];
				phantom.create(function (ph) {
						logger.debug("opening sonar");
						return ph.createPage(function (page) {
							return page.open(conf.static_violations, function (status) {
								logger.debug("opened sonar? ", status);
								page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

								page.evaluate(function () {
									var total = 0;
									var spanIds = ["m_blocker_violations", "m_critical_violations", "m_major_violations", "m_minor_violations", "m_info_violations"];

									for (var i = 0; i < spanIds.length; i++) {
										var val = parseInt($("span#" + spanIds[i]).text().replace(",", ""));
										if (isNaN(val)) {
											return {
												value: "Internal Server Error"
											};
										} else {
											total += val;
										}
									}
									return {
										value: total
									};
								}, function (result) {
									var util = new DeltaRecordUtil("down", result.value, req.query.product + "-staticviolations.txt");
									util.recordAndRespond(res);
									static_viol = Number(result.value).toFixed(0),
										ph.exit();
								});
							});
						});
					},
					{
						dnodeOpts: {
							weak: false
						}
					});
			}
			else
				console.log("Result not found");
		}
	);
};

exports.defectstatistics = function(req, res) {
	var write_value;

	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select defectstatistics from products where product_name='" + req.query.product + "';", function (err, result) {
		if (!err) {
			var conf = result.rows[0];
			var phantom = require('phantom');
			phantom.create(function (ph) {
					logger.debug("opening enotify9-1");
					return ph.createPage(function (page) {
						return page.open(conf.defectstatistics, function (status) {
							logger.debug("opened enotify9-1? ", status);
							page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

							page.evaluate(function () {
								var cfdcount = 0;
								$("table#Severity table.solid_blue_border_full tr td:nth-child(17)").each(function () {
									var value = $(this).text().trim();
									if (value == "customer-use") {
										cfdcount++;
									}
								});

								var olddefectcount = 0;
								$("table#Severity table.solid_blue_border_full tr td:nth-child(11)").each(function () {
									var value = parseInt($(this).text().trim());
									if (value > 28) {
										olddefectcount++;
									}
								});

								var s1s2defectcount = 0;
								$("table#Severity table.solid_blue_border_full tr td:nth-child(7)").each(function () {
									var value = parseInt($(this).text().trim());
									if (value < 3) {
										s1s2defectcount++;
									}
								});
								write_value = cfdcount + "," + olddefectcount + "," + s1s2defectcount;

								return {
									values: [{
										label: "Customer Found Defects",
										value: cfdcount,
										style: cfdcount > 0 ? 'error' : 'success'
									}, {
										label: "> 28 Days Defects",
										value: olddefectcount,
										style: olddefectcount > 0 ? 'error' : 'success'
									}, {
										label: "S1-S2 Defects",
										value: s1s2defectcount,
										style: s1s2defectcount > 0 ? 'error' : 'success'
									}]
								};
							}, function (result) {
								//console.log(result);
								write_value="";
								for(var i=0;i<result.values.length;i++)
								{
									write_value+=result.values[i].value+",";
								}
								fs.writeFile(req.query.product+"-defectstatistics.txt",write_value,function(err){
									if(err){
										console.log("errror writing defect statistics into file");
									}
								});
								res.send(result);
								ph.exit();
							});
						});
					});
				},
				{
					dnodeOpts: {
						weak: false
					}
				});
		}
		else
			console.log("Result not found");
	});
};

exports.defectdistribution = function(req, res) {

	var conf_href;
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select defectdistribution from products where product_name='" + req.query.product + "';", function (err, result) {
		if (!err) {
			var conf_href = result.rows[0];
			var DefectDistributionCalc = function () {

				//var teams = conf.teams;
				var series = [];
				return {

					updateSeries: function (owner) {
						/*console.log("print owner");
						 console.log(owner);*/
						var res = owner.split(' ');
						//console.log(res);
						if(res.length != 1)
						{
							//console.log("i am in here");
							owner = 'blank';
						}
						var team, flag = 0;
						//var team = findTeam(owner);
						client.execute("select team_name from teams where team_member = '"+ owner +"';", function (err,result) {
							if(!err) {

								//console.log(result);
								if (owner === 'unassigned') {
									team = "Unassigned";
								} else if (owner === 'resolved') {
									team = "Resolved";
								}
								else if (result.rows.length != 0 && owner != 'blank') {
									flag = 1;
									//	console.log("inside flag 1");
									//	console.log(result.rows[0].team_name);
									//team = result.rows[0].team_name;
									var stat;

									for (var i in series) {
										if (series[i].label == result.rows[0].team_name) {
											stat = series[i];
											break;
										}
									}

									if (stat) {
										stat.value++;
									} else {
										series.push({
											label: result.rows[0].team_name,
											value: 1
										});
									}
									//console.log(team);
								}
								else
									team = "Others";
								/*	console.log("priniting team name");
								 console.log(team);
								 console.log("print owner");
								 console.log(owner);*/
								if (flag == 0) {
									//	console.log("inside flag 0");
									//	console.log(team);
									var stat;

									for (var i in series) {
										if (series[i].label == team) {
											stat = series[i];
											break;
										}
									}

									if (stat) {
										stat.value++;
									} else {
										series.push({
											label: team,
											value: 1
										});
									}
								}
							}
						});
					},

					getGoogleChartSeries: function () {
						console.log("i am in google charts");
						var googleChartSeries = [];
						for (var i in series) {
							if (series[i].label === 'Unassigned') {
								googleChartSeries.push({
									name: series[i].label,
									y: series[i].value,
									sliced: true,
									selected: true
								});
							} else {

								googleChartSeries.push([series[i].label, series[i].value]);
							}
						}

						return googleChartSeries;
					}
				};
			};

			var phantom = require('phantom');
			phantom.create(function (ph) {
					logger.debug("opening enotify9-1");
					return ph.createPage(function (page) {
						return page.open(conf_href.defectdistribution, function (status) {
							logger.debug("opened enotify9-1? ", status);
							page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

							page.evaluate(function () {
								var result = [];
								$("table[style!='display: none'] table.solid_blue_border_full tr td:nth-child(3)").each(function () {
									var status = $(this).parent().find("td:nth-child(13)").text().trim();
									var owner = $(this).text().trim();

									result.push({
										owner: owner,
										status: status
									});
								});
								return result;
							}, function (result) {
								var calculator = new DefectDistributionCalc();

								for (var i in result) {
									//	console.log("calling update series");
									if (result[i].status == 'N') {
										calculator.updateSeries('unassigned');
									} else if (result[i].status == 'R') {
										calculator.updateSeries('resolved');
									} else {
										calculator.updateSeries(result[i].owner);
									}
								}
								setTimeout(function(){
									var ret = "hello";
									res.send({

										values: calculator.getGoogleChartSeries()
									});

									ph.exit();
								},1000);
							});
						});
					});
				},
				{
					dnodeOpts: {
						weak: false
					}
				});
		}
		else
			console.log("Result not found");

	});
};




/*var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
 client.execute("select teststatistics from products where product_name='" + req.query.product + "';", function (err, result) {
 if (!err) {
 var conf = result.rows[0];
 var getStats = function (str) {
 var stats = {
 values: []
 };

 if (!str) {
 return stats;
 }

 var lines = str.split("\n");
 for (var i = 0; i < lines.length; i++) {
 if (lines[i] && lines[i].trim().length > 0) {
 var parts = lines[i].split(",");
 var value = {};
 var threshold, unit;
 for (var j = 0; j < parts.length; j++) {
 if (j == 0) {
 value.label = parts[j].trim().length == 0 ? "No Title" : parts[j].trim();
 } else if (j == 1) {
 threshold = parseFloat(parts[j].trim());
 } else if (j == 2) {
 unit = parts[j].trim();
 value.unit = unit;
 } else if (j == 3 && !isNaN(parseFloat(parts[j].replace("%")))) {
 value.value = Number(parseFloat(parts[j].replace("%"))).toFixed(2);
 value.style = value.value < threshold ? 'error' : 'success';
 }
 }
 if (value.label.length > 0) {
 stats.values.push(value);
 }
 }
 }

 return stats;
 }

 if (fs.existsSync(conf.teststatistics)) {
 fs.readFile(conf.teststatistics, function (err, data) {
 var stats = getStats(data + "");
 res.send(stats);
 });
 } else {
 res.status(500).send({
 error: "Internal Server Error!"
 });
 }
 }
 else
 console.log("Result not found");
 });
 };*/

exports.risktoship = function(req,res) {
	setTimeout(function(){

	var phantom = require('phantom');
	var product = req.query.product;

	var defcount_actual, defcount_threshold;
	var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
	client.execute("select defectcount,static_violations from products where product_name='" + req.query.product + "';", function (err, result) {
		if (!err) {
			var conf = result.rows[0];
			phantom.create(function (ph) {
					logger.debug("opening enotify9-1");
					return ph.createPage(function (page) {
						return page.open("http://enotify9-1.cisco.com/enotify-v8/sites/ccbu/output/website/index.html", function (status) {
							logger.debug("opened enotify9-1? ", status);
							page.injectJs("scripts/thirdparty/jquery/jquery-1.11.0.min.js");

							page.evaluate(function (conf) {
								var outstanding = parseInt($("a[href='" + conf.defectcount + "']").text());
								var threshold = parseInt($("a[href='" + conf.defectcount + "']")
									.parent().parent().parent().parent()
									.children(":nth-child(5)")
									.children("font").text());
								return {
									actual: outstanding,
									threshold: threshold
								};
							}, function (result) {
								if (isNaN(result.actual) || isNaN(result.threshold)) {
									res.status(500).send({
										error: "Internal Server Error!"
									});
								} else {
									defcount_actual = result.actual;
									defcount_threshold = result.threshold;

									fs.readFile(req.query.product + "-staticviolations.txt", function (err, result) {
										staticviolations_value = result + "";
										staticviolations_values = staticviolations_value.split(",");
										if (staticviolations_values[0] >= staticviolations_values[1]) {
											//console.log("inside static violations");
											if (defcount_actual < defcount_threshold) {
											//	console.log("inside 1");
												fs.readFile(product + "-linecoverage.txt", function (err, result) {
											//		console.log("inside 2");
													var value = result + "";
													var values = value.split(",");
													if (values[0] <= values[1]) {
											//			console.log("inside 3");
														fs.readFile(product + "-cibuild.txt", function (err, result) {
											//				console.log("inside 4");
															var failCount = result + "";
											//				console.log(parseInt(failCount));
															if (parseInt(failCount) == 0) {
											//					console.log("Inside cibuild check");
																fs.readFile(product + "-defectstatistics.txt", function(err, result){
																	var defstat_value = result + "";
																	var defstat_values = defstat_value.split(",");
																	if(defstat_values[0]==0 && defstat_values[1]==0 && defstat_values[2]==0)
																	{
											//							console.log("inside def stat true");
																		if(product == 'sm'){
																		fs.readFile(product + "-teststatistics.txt", function(err, result){
																			var teststat_val = result + "";
																			var teststat_vals = teststat_val.split(",");
																			var flag = 1;
																			for(var i=0;i<teststat_vals.length;i++)
																			{
																				if(teststat_vals[i] == 'Unstable')
																				{
																					flag = 0;
																					break;
																				}
																			}
																			if(flag == 1)
																			{
																				res.send({value: 'good'});
																			}
																			else
																			{

																			}


																		});
																		}
																		else {
																			res.send({value: 'good'});
																		}


																	}
																	else
																	{
											//							console.log("inside def stat false");
																		res.send({value: 'bad'});
																	}
																});




															}
															else {
											//					console.log("inside 5");
																res.send({value: 'bad'});
															}

														});

													}
													else {
											//			console.log("inside 6");
														res.send({value: 'bad'});
													}


												});


											}
											else {
											//	console.log("inside 7");
												res.send({value: 'bad'});

											}
										}
										else {
											res.send({value: 'bad'});
										}

									});
								}
								ph.exit();
							}, conf);
						});
					});
				},
				{
					dnodeOpts: {
						weak: false
					}
				});
		}


		else
			console.log("Result not found");

	});


	},10000);
};
