﻿'use strict';

var dataArray = [];
var batchArray = []; // Use custom hash function to map years to indeces;
var feedbackData = [];

// Initiate Data tables
var batchTable;

$(document).ready(function () {
    loadGUI();
    initDataArray();
    
    batchTable = $("#batchTable").DataTable();

    // load the table with values
    // Overview table
    var appWebUrl = decodeURIComponent(getQueryStringParameter("SPAppWebUrl"));
    var hostWebUrl = decodeURIComponent(getQueryStringParameter("SPHostUrl"));

    var clientContext = SP.ClientContext.get_current();
    var hostContext = new SP.AppContextSite(clientContext, hostWebUrl);
    
    var cvList = hostContext.get_web().get_lists().getByTitle("CV List");
    var camlQuerry = new SP.CamlQuery();
    var cvItems = cvList.getItems(camlQuerry);
    
    clientContext.load(
        cvItems,
        'Include(Batch, CV_x0020_Type,Status,Student_x0020_Name,Email)'
        );

    clientContext.executeQueryAsync(function () {
        var enumerator = cvItems.getEnumerator();
        var current, batch, type, status, name, email;

        while (enumerator.moveNext()) {
            current = enumerator.get_current();
            batch = current.get_item("Batch");
            type = current.get_item("CV_x0020_Type");
            status = current.get_item("Status");
            name = current.get_item("Student_x0020_Name");
            email = current.get_item("Email");

            // To detect partially uploaded files. ("Student_x0020_Name" field will be null)
            if (name === null || batch ===null) {
                continue;
            }

            switch (type + " " + status) {
                case "Internship Feedback Given":
                    dataArray[0][0]++;
                    break;

                case "Internship In Process":
                    dataArray[0][1]++;
                    break;

                case "Career Feedback Given":
                    dataArray[1][0]++;
                    break;

                case "Career In Process":
                    dataArray[1][1]++;
                    break;

                case "CS 3953 Feedback Given":
                    dataArray[2][0]++;
                    break;

                case "CS 3953 In Process":
                    dataArray[2][1]++;
                    break;

                default:
                    console.log("There is a problem in the switch statement!! : " + type + " " + status);
                    break;
            }
            batchArray[Number(batch) - 2013].push([name, email, type, status]);
        }

        updateTableView();
    }
    , onError);


    // Get data from the FeedbackList
    var feedbackList = clientContext.get_web().get_lists().getByTitle("FeedbackList");
    var feedbackItems = feedbackList.getItems(new SP.CamlQuery());
    clientContext.load(feedbackItems);

    clientContext.executeQueryAsync(function () {
        var enumerator = feedbackItems.getEnumerator();
        var current, date;
        while (enumerator.moveNext()) {
            current = enumerator.get_current();

            // Make date string
            date = new Date(current.get_item("LastDate"));
            date = date.toISOString().slice(0,10);
            feedbackData.push([
                current.get_item("Name1"),
                current.get_item("Title"),
                date,
                current.get_item("Count")
            ]);
        }

        updateVolunteerTable();
    }
        , onError);

    $("#batchSelect").change(updateBatchTable);

    // Settings page
    var appConstants = clientContext.get_web().get_lists().getByTitle("AppConstants");
    var conItems = appConstants.getItems(new SP.CamlQuery());
    clientContext.load(conItems);

    clientContext.executeQueryAsync(function () {
        var enumerator = conItems.getEnumerator();

        while (enumerator.moveNext()) {
            if (enumerator.get_current().get_item("Title") === "UploadLimit") {
                // this is  the maximum upload count
                $("#uploadLimit").val(enumerator.get_current().get_item("Count"));
            }
        }
    },
        onError);

    $("#settingsConfirm").click(function () {
        // Check negative
        if (parseInt($("#uploadLimit").val()) < 0) {
            alert("Upload limit cannot be a negative value");
            return
        }

        // Check for floats
        if (parseFloat($("#uploadLimit").val())%1!=0) {
            alert("Upload limit cannot be a floating point number");
            return
        }

        $("#settingsModal").modal("hide");
        appConstants = clientContext.get_web().get_lists().getByTitle("AppConstants");
        conItems = appConstants.getItems(new SP.CamlQuery());
        clientContext.load(conItems);

        clientContext.executeQueryAsync(function () {
            var enumerator = conItems.getEnumerator();

            // Since only one is possible in the list
            if (enumerator.moveNext()) {
                if (enumerator.get_current().get_item("Title") === "UploadLimit") {
                    enumerator.get_current().set_item("Count", parseInt($("#uploadLimit").val()));
                    enumerator.get_current().update();

                    clientContext.executeQueryAsync(function () {
                        $("#successModal").modal();
                    }, onError);
                }
            } else {
                // Then that constant doesn't exist
                var itemCreateInfo = new SP.ListCreationInformation();
                var item = appConstants.addItem(itemCreateInfo);
                item.set_item("Title", "UploadLimit");
                item.set_item("Count", parseInt($("#uploadLimit").val()));
                item.update();

                clientContext.executeQueryAsync(function () {
                    $("#successModal").modal();
                },onError)
            }
        }
            , onError)
    })
});

function loadGUI() {
    // Load batch years according to the current year;
    // Assume latest batch is current year and oldest is 2013

    var current = new Date().getFullYear();
    var innerHTML = "";

    for (var i = 2013; i <= current; i++) {
        innerHTML += "<option>" + i + "</option>";
    }

    $("#batchSelect").html(innerHTML);

}

function initDataArray() {
    // 2d array
    // 0 - Internship, 1-Career, 2-CS 3953
    // 2nd: 0 - Feedback Given; 1 = Not Given
    for (var i = 0 ; i < 3; i++) {
        dataArray.push([0, 0]);
    }

    // Initiate batchArray
    // Assume start year 2013 (Index 0) and current year, last year
    var current = new Date().getFullYear();
    for (var i = 2013; i <= current; i++) {
        batchArray.push([]);
    }
}

// Get parameters from the query string.
function getQueryStringParameter(paramToRetrieve) {
    var params = document.URL.split("?")[1].split("&");
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == paramToRetrieve) return singleParam[1];
    }
}

function onError() {
    alert("Operation Failed!");
}


function updateTableView() {
    $("#internship-nr").html(String(dataArray[0][0]));
    $("#internship-nl").html(String(dataArray[0][1]));
    $("#internship-t").html(String(dataArray[0][1] + dataArray[0][0]));
    $("#internship-p").html(String(
        (100 * dataArray[0][0] / (dataArray[0][1] + dataArray[0][0])).toFixed(2)
        ));

    $("#career-nr").html(String(dataArray[1][0]));
    $("#career-nl").html(String(dataArray[1][1]));
    $("#career-t").html(String(dataArray[1][1] + dataArray[1][0]));
    $("#career-p").html(String(
        (100 * dataArray[1][0] / (dataArray[1][1] + dataArray[1][0])).toFixed(2)
        ));

    $("#masters-nr").html(String(dataArray[2][0]));
    $("#masters-nl").html(String(dataArray[2][1]));
    $("#masters-t").html(String(dataArray[2][1] + dataArray[2][0]));
    $("#masters-p").html(String(
        (100 * dataArray[2][0] / (dataArray[2][1] + dataArray[2][0])).toFixed(2)
        ));

    $("#cvCount").html(String(dataArray[0][1] + dataArray[0][0] + dataArray[1][1] + dataArray[1][0] + dataArray[2][1] + dataArray[2][0]));
    $("#feedbackCount").html(String(dataArray[0][0] + dataArray[1][0] + dataArray[2][0]));
    var value = ((dataArray[0][0] + dataArray[1][0] + dataArray[2][0]) / (dataArray[0][1] + dataArray[0][0] + dataArray[1][1] + dataArray[1][0] + dataArray[2][1] + dataArray[2][0])).toFixed(2);

    if (isNaN(value)) {
        value = 1;
    }
    createProgressBar(value);
    batchTable.rows.add(batchArray[0]).draw();
}

function updateVolunteerTable(){
    $("#volunteerTable").DataTable({
        data: feedbackData
    });

}

function updateBatchTable() {
    var year = Number($("#batchSelect :selected").text());
    var data = batchArray[year - 2013];
    batchTable.clear();
    batchTable.rows.add(data).draw();
}

function createProgressBar(value) {
    var bar = new ProgressBar.Circle(progress, {
        color: '#000000',
        // This has to be the same size as the maximum width to
        // prevent clipping
        strokeWidth: 18,
        trailWidth: 18,
        easing: 'easeInOut',
        duration: 1400,
        text: {
            autoStyleContainer: false
        },
        from: { color: '#a5110e', width: 14 },
        to: { color: '#9dff7a', width: 14 },
        // Set default step function for all animate calls
        step: function (state, circle) {
            circle.path.setAttribute('stroke', state.color);
            circle.path.setAttribute('stroke-width', state.width);
            var value = Math.round(circle.value() * 100);
            circle.setText(value + "%");

        }
    });
    bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    bar.text.style.fontSize = '2rem';

    bar.animate(value);
}