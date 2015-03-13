/**
 * Created by sangeshi on 3/10/2015.
 */
var cassandra = require('cassandra-driver');
var fs = require('fs');
var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});
exports.update = function (req, res){
    var id;
    var product_name = req.body.name;
    console.log(product_name);

    var cibuild_path = req.body.cipath;
    console.log(cibuild_path);

    var cibuild_server = req.body.ciserver;
    var defectcount = req.body.dcurl;
    var defectstatistics = req.body.dsurl;
    var linecoverage = req.body.ccurl;
    var static_violations = req.body.svurl;
    var teststatistics = req.body.laurl;
    console.log("Inside update");
    //console.log(product_name);
    //console.log(req);
    console.log("Record inserted succesfully!");
    client.execute("select count(*) from products;", function(err,result){
        var count = result.rows[0].count.low;
        id = "dashboard-" + count;
               //console.log(id);
        if(!err){
            client.execute("INSERT INTO products (id,product_name, cibuild_server, cibuild_path, defectcount, static_violations, teststatistics, defectstatistics, linecoverage)" +
            " VALUES ('"+id+"','"+product_name+"','"+cibuild_server+"','"+cibuild_path+"','"+defectcount+"','"+static_violations+"','"+teststatistics+"','"+defectstatistics+"','"+linecoverage+"');", function (err, result) {
                if(!err){
                    var json;
                    console.log("Record Successfully inserted");
                    fs.readFile("widgets.json", function (err, result_data) {
                               //console.log(result_data + "");
                        json = JSON.parse(result_data+"");
                               //console.log(json["dashboard-4"]);
                        var data=json["dashboard-4"];
                        data = JSON.stringify(data);
                        var new_data = data;
                                //console.log(data);
                                //console.log(new_data);
                               new_data = JSON.parse(new_data);
                                for(i=0;i<new_data.length;i++)
                                {
                                 //   console.log(new_data[i]);
                                    new_data[i].id=new_data[i].id.replace('sm',product_name);
                                    new_data[i].dataUrl=new_data[i].dataUrl.replace('sm',product_name);
                                }
                                //console.log(new_data);
                                //console.log(data);
                                //var new_data_2 = JSON.parse(new_data);
                                json[id]=new_data;
                                //console.log(id);
                                //console.log(json);
                                var new_json = JSON.stringify(json);
                                console.log(new_json);

                                fs.writeFile("widgets.json", new_json, function(err) {
                                    if(err) {
                                        console.log(err);
                                    } else {
                                        console.log("The file was saved!");
                                    }
                                });




                            });


                        }
                    })
                }
            });



    res.redirect("http://localhost:8080/dashboard/#/");


}

exports.delete=function(req,res){
    console.log("Entered delete");
    console.log(req.params.dashboardId);
    client.execute("DELETE FROM products WHERE product_name='"+req.params.dashboardTitle+"';", function (err, result) {
        var json;
        fs.readFile("widgets.json", function (err, result_data) {
            json = JSON.parse(result_data + "");
            console.log(json[req.params.dashboardId]);
            delete json[req.params.dashboardId];
            console.log("Deleted")
            console.log(json[req.params.dashboardId]);
            var new_json = JSON.stringify(json);
            fs.writeFile("widgets.json", new_json, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        })
    });
    res.redirect("http://localhost:8080/dashboard/#/");

}