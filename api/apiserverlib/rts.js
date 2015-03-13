var l = require("./links.js")
exports.risktoship = function(req,res){
    var def_count = l.defectcount(req,res);
    var static_viol = l.staticviolations(req,res);
    var def_res, st_res;
    var a = 0, b = 1;
    console.log(def_count);
    if(def_count.actual < def_count.threshold) {
        def_res = 1;
    }
    if(static_viol.delta == '0'){
        st_res = 1;
    }
    if(def_res == 1 && st_res == 1)
    {
        res.send({
        actual: a,
        threshold: b

        });
    }
    else {
        res.send({
                actual: b,
                threshold: a

            }
        );
    }





};