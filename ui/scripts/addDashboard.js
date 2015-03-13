/**
 * Created by sangeshi on 3/10/2015.
 */

function validate(){
    if(document.getElementById('name').value == ""){
        alert("Don't miss your Dashboard Name!");
        return false;
    }

    if(document.getElementById('sv-url').value == ""){
        alert("Static Violations URL missing!");
        return false;
    }
    if(document.getElementById('ci-server').value == ""){
        alert("CI Build Server name missing!");
        return false;
    }
    if(document.getElementById('ci-path').value == ""){
        alert("CI Build Path missing!");
        return false;
    }
    if(document.getElementById('cc-url').value == ""){
        alert("Code Coverage URL missing!");
        return false;
    }
    if(document.getElementById('dc-url').value == ""){
        alert("Defect Count URL missing!");
        return false;
    }
    if(document.getElementById('ds-url').value == ""){
        alert("Defect Count URL missing!");
        return false;
    }
    if(document.getElementById('la-url').value == ""){
        alert("Load & Automation URL missing!");
        return false;
    }

    return true;

}
