﻿// Sharepoint JSOM
var clientContext = SP.ClientContext.get_current();
var web = clientContext.get_web();
var user;

// Current userinfo
var userEmail;
var userGroups;
var name;

// For SharePoint REST calls
var appWebUrl;
var hostWebUrl;

var currentItem;

//CV Data
var inProgress = [];
var inProgressShown = [];
var original = []
//Feedback given list
var inProgressF = [];
var inProgressFShown = [];
var originalF = [];

var preAim = 'all';

var pdf = ["", "", "", ""];
var item = [null, null, null, null];


$(document).ready(function () {
    // Hide all the cards first
    $("#div1").hide();
    $("#div2").hide();
    $("#div3").hide();
    $("#div4").hide();
    $("#emptyMessage").hide();

    // Check for FileReader API for Reading files
    if (!window.FileReader) {
        alert('This browser does not support the FileReader API.');
    }

    // Get the add-in web and host web URLs.
    appWebUrl = decodeURIComponent(getQueryStringParameter("SPAppWebUrl"));
    hostWebUrl = decodeURIComponent(getQueryStringParameter("SPHostUrl"));

    // Load user details
    user = clientContext.get_web().get_currentUser();
    clientContext.load(user);

    clientContext.executeQueryAsync(function () {
        userEmail = user.get_email();
        userGroups = user.get_groups();
        
        // Getting user's name
        var userInfoList = clientContext.get_web().get_siteUserInfoList();
        var query = new SP.CamlQuery();
        query.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Name' /><Value Type='Text'>" + user.get_loginName() + "</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>");

        var items = userInfoList.getItems(query);
        clientContext.load(items, "Include(FirstName,ID,LastName,Name)");

        clientContext.executeQueryAsync(function () {
            var enumerator = items.getEnumerator();

            // Only one item
            enumerator.moveNext();

            name = enumerator.get_current().get_item("FirstName") + " " + enumerator.get_current().get_item("LastName");

        },
        function () {
            alert("error loading user data!");
        }
        )



        // Updating the feedback count and last date
        updateView();
    });

    // Getting the CVs
    checkUploadStatus();

    // Load CVs accordingly when Select options are changed
    $("#cvAim").change(doFilter);
    $("#selectType").change(doFilter);

});


// Get parameters from the query string.
function getQueryStringParameter(paramToRetrieve) {
    var params = document.URL.split("?")[1].split("&");
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == paramToRetrieve) return singleParam[1];
    }
}

// To obtain the number of feedbacks provided and the last date and show it
function updateView() {
    var feedbackList = clientContext.get_web().get_lists().getByTitle("FeedbackList");
    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Title' /><Value Type='Text'>" + userEmail + "</Value></Eq></Where></Query></View>");

    feedbackItems = feedbackList.getItems(camlQuery);

    clientContext.load(feedbackItems);
    
    clientContext.executeQueryAsync(function () {
        var enumerator = feedbackItems.getEnumerator();
        // Could only have one item
        if (enumerator.moveNext()) {
            // Update count
            $("#feedbackCount").html(String(enumerator.get_current().get_item("Count")));

            var date = enumerator.get_current().get_item("LastDate");
            date = new Date(date);
            date = date.toISOString();

            // Update date
            $("#lastDate").html(date.slice(0, 10));
            
        } else {
            // No records since no feedback given
            $("#feedbackCount").html("0");
            $("#lastDate").html("No CVs Reviewed");
        }
    }
    , 
    function (err) {
        console.log(err);
        alert("Error obtaining the feedback count, date from the add in web : "+ err.toString());
    }
    )
}

function checkUploadStatus() {
    var hostWebContext = new SP.AppContextSite(clientContext, hostWebUrl);

    cvList = hostWebContext.get_web().get_lists().getByTitle("CV List");

    var camlQuery = new SP.CamlQuery();

    cvItems = cvList.getItems(camlQuery);

    clientContext.load(cvItems);
    clientContext.executeQueryAsync(Function.createDelegate(this, checkUploadAccessSuccess), onFailed);
}

function checkUploadAccessSuccess() {
    var enumerator = cvItems.getEnumerator();

    while (enumerator.moveNext()) {
        var item = enumerator.get_current();

        if (item.get_item("Student_x0020_Name") === null) {
            continue;
        }

        if (item.get_item('Status') === "In Process") {
            if (~isNaN(item.get_item("Feedback_x0020_Given")) && item.get_item("Feedback_x0020_Given") !== null && item.get_item("Feedback_x0020_Given") !== "") {
                inProgressF.push(item);
            }
            inProgress.push(item);
        }
    }
    original = inProgress.slice();
    originalF = inProgressF.slice();
    showCVSet();
}

function onFailed(sender, args) {
    alert(args.get_message());

}

function saveFeedBack(num, feedBack) {
    if (feedBack != "" || feedBack != none){ 
        // Increment the count and set the date
        $("#feedbackCount").html(String(Number($("#feedbackCount").html()) + 1));
        $("#lastDate").html(new Date().toISOString().slice(0,10));
        setNotAvailable(num);
        $('#myModal').modal('hide');
        var index = $('#selectType').prop('selectedIndex');

        
        //Filterig lists to remove feedback given from all occurences
        saveFeddBackInDatabase(feedBack, this.item[num - 1]);
        original = original.filter(function (el) {
            return el !== this.item[num - 1];
        });
        originalF = originalF.filter(function (el) {
            return el !== this.item[num - 1];
        });
        inProgress = inProgress.filter(function (el) {
            return el !== this.item[num - 1];
        });
        inProgressShown = inProgressShown.filter(function (el) {
            return el !== this.item[num - 1];
        });
        inProgressF = inProgressF.filter(function (el) {
            return el !== this.item[num - 1];
        });
        inProgressFShown = inProgressFShown.filter(function (el) {
            return el !== this.item[num - 1];
        });
        if (index == 0) {
            showCVForSaved(inProgress, inProgressShown, num);
        } else {
            showCVForSaved(inProgressF, inProgressFShown, num);
        }
        //Find another cv to fill the slot


    } else {
        alert('Feedback must be filled!!');
    }
}

function showCVSet() {
    var index = $('#selectType').prop('selectedIndex');

    if (index == 0) {
        showCV(inProgress, inProgressShown);
    } else {
        showCV(inProgressF, inProgressFShown);
    }

}
function showCVForSaved(list1, list2, num) {
    var size = list1.length;
    //If not shown cv list size is greator than 1, we can get 1 from that to show
    if (size >= 1) {

        var ranInd = Math.floor((Math.random() * list1.length));
        var item = list1[ranInd];
        list2.push(item);
        list1.splice(ranInd, 1);

        setCVData(item, num);

    } else {
        //Shown list greator than 3 means there is at least one cv in shown list that is not currently shown. To Find such one

        if (list2.length > 3) {

            while (true) {
                var ranInd = Math.floor((Math.random() * list2.length));
                var item = list2[ranInd];
                for (var j = 0; j < 4; j++) {
                    if (this.item[j] == item) {
                        continue;
                    }
                }

                setCVData(item, num);
                break;
            }
        }
    }

}

function showCV(list1, list2) {
    var size = list1.length;
    var last = 0;
    if (size > 4) {
        for (var i = 0; i < 4; i++) {
            var ranInd = Math.floor((Math.random() * list1.length));

            var item = list1[ranInd];

            list2.push(item);
            list1.splice(ranInd, 1);
            last++;

            setCVData(item, i + 1);
        }
    } else {
        if (list2.length > 0) {
            var index = 4 - size;
            index = index < list2.length ? index : list2.length;
            //Keep track of selected ones. Select ones previously not selected
            var arr = [];

            for (var i = 0; i < index; i++) {
                while (true) {
                    var ranInd = Math.floor((Math.random() * list2.length));

                    if (arr.indexOf(ranInd) != -1) {
                        continue;
                    }
                    arr.push(ranInd);
                    var item = list2[ranInd];
                    last++;

                    setCVData(item, i + 1);
                    break;
                }
            }

            for (var i = index; i < index + Math.min(4 - index, list1.length) ; i++) {
                var ranInd = Math.floor((Math.random() * list1.length));
                var item = list1[ranInd];
                list2.push(item);
                list1.splice(ranInd, 1);
                last++;
                setCVData(item, i + 1);
            }

        } else {

            for (var i = 0; i < size; i++) {
                var ranInd = Math.floor((Math.random() * list1.length));

                var item = list1[ranInd];

                list2.push(item);
                list1.splice(ranInd, 1);
                last++;

                setCVData(item, i + 1);
            }
        }
    }
    for (var i = last + 1; i < 4; i++) {
        setNotAvailable(i);
    }
    updateEmptyMessage();
}


function setCVData(item, num) {
    // Hide the loading pic
    $("#loadingGif").hide();
    $("#div" + num).show();
    $('#divBatch' + num).text('Batch : ' + item.get_item('Batch'));
    $('#divName' + num).text(item.get_item('Student_x0020_Name'));

    $('#divAim' + num).text('Type : ' + item.get_item('CV_x0020_Type'));
    var filePath = item.get_item("FileRef");
    currentItem = item;
    var data = filePath.split("/");
    var urlTo = _spPageContextInfo.siteAbsoluteUrl + "/" + data[data.length - 2] + "/" + data[data.length - 1];
    urlTo = urlTo.replace(' ', '%20');
    // Set the link to urlTo button
    $("#cvLink" + num).attr("href", urlTo);
    pdf[num - 1] = urlTo;
    this.item[num - 1] = item;
    //$('#pdf' + num).html('<div style="background: transparent url(load.gif) no-repeat;width: 100%; height: 320px;background-position:center;"><object type="application/pdf" width="30%" height="50%" data="' + urlTo + '?#scrollbar=0&toolbar=0&navpanes=0&zoom=37" style="overflow:hidden; width: 100%; height: 90%;margin-top:20px;"></object></div>');
    //$('#pdf' + num).html('<object type="application/pdf" width="30%" height="200px" data="' + urlTo + '" style="overflow:hidden; width: 100%; height: 390px;"></object>');
}
function setNotAvailable(num) {
    $("#div" + num).hide();
    $('#divName' + num).text('Not Available');
    $('#divBatch' + num).text('Batch : _');
    $('#divAim' + num).text('Aim : _');
    $('#pdf' + num).html('');
    pdf[num - 1] = "";
}

function doFilter(btnClicked) {
    // Show loading pic
    $("#loadingGif").show();

    var index = $('#cvAim').prop('selectedIndex');
    var aim = $('#cvAim').val();
    if (aim.toLowerCase().trim() != preAim) {
        preAim = aim;
        inProgress = [];
        inProgressF = [];
        inProgressShown = [];
        inProgressFShown = [];
        if (aim.toLowerCase().trim() != 'all') {
            for (var i = 0; i < original.length; i++) {
                var item = original[i];

                if (item.get_item('CV_x0020_Type') != null) {
                    if (item.get_item('CV_x0020_Type').toLowerCase() == aim.toLowerCase()) {
                        if (~isNaN(item.get_item("Feedback_x0020_Given")) && item.get_item("Feedback_x0020_Given") !== null && item.get_item("Feedback_x0020_Given") !== "") {
                            inProgressF.push(item);
                        }
                        inProgress.push(item);
                    }
                }
            }
        } else {
            inProgress = original.slice();
            inProgressF = originalF.slice();
        }

    }
    if (btnClicked) {
        setNotAvailable(1);
        setNotAvailable(2);
        setNotAvailable(3);
        setNotAvailable(4);
        showCVSet();
    }
}

// Saving the feedback
function saveFeddBackInDatabase(feedBack, item) {
    // Update feedback to the host web list
    item.set_item("Feedback_x0020_Given", feedBack);
    item.set_item("Status", "Feedback Given");
    console.log(item.get_item("Email"));
    var toEmail = item.get_item("Email");
    item.update();

    clientContext.executeQueryAsync(function () {
        // success
        }
        , function () {
            // Failed
        });

    // Update feedback count for each user
    var feedbackList = clientContext.get_web().get_lists().getByTitle("FeedbackList");
    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Title' /><Value Type='Text'>" + userEmail + "</Value></Eq></Where></Query></View>");

    var entry = feedbackList.getItems(camlQuery);

    clientContext.load(entry);

    clientContext.executeQueryAsync(function () {
        var enumerator = entry.getEnumerator();
        // Can only exist one record
        if (enumerator.moveNext()) {
            // record exists, update count
            var listItem = enumerator.get_current();
            var count = listItem.get_item("Count");
            listItem.set_item("Count", count + 1);
            listItem.update();
            clientContext.executeQueryAsync(function () {
                sendEmailConfirmation(toEmail);
                $("#loadingModal").modal("hide");
                $("#popupTitle").html("Feedback Upload Success");
                $("#popupBody").html("Feedback uploaded successfully. Thank you.");
                $("#popupModal").modal();
            },
            function () {
                sendEmailConfirmation(toEmail);
                $("#loadingModal").modal("hide");
                $("#popupTitle").html("Feedback Upload Failed");
                $("#popupBody").html("Unfortunately there were some issues when uploading the CV");
                $("#popupModal").modal();
            });

        } else {
            // email not existing in the list , create the record
            // Internal name of the Name field is Name1
            // Internal name of the Email field is Title
            // If in doubt, check using SPCamlQuery Helper App
            var itemCreateInfo = new SP.ListItemCreationInformation();
            var listItem = feedbackList.addItem(itemCreateInfo);
            listItem.set_item("Title", userEmail);
            listItem.set_item("Count", 1);
            listItem.set_item("LastDate", new Date());
            listItem.set_item("Name1", name);
            listItem.update();

            clientContext.load(listItem);
            clientContext.executeQueryAsync(function () {
                sendEmailConfirmation(toEmail);
                $("#loadingModal").modal("hide");
                $("#popupTitle").html("Feedback Upload Success");
                $("#popupBody").html("Feedback uploaded successfully. Thank you.");
                $("#popupModal").modal();
            },
            function () {
                sendEmailConfirmation(toEmail);
                $("#loadingModal").modal("hide");
                $("#popupTitle").html("Feedback Upload Failed");
                $("#popupBody").html("Unfortunately there were some issues when uploading the CV");
                $("#popupModal").modal();
            }
            )

        };
    },
    function () {
        $("#loadingModal").modal("hide");
        alert("Error Occured");
    });
}

// Validation and View Functions
function doPreview(ele) {
    var id = ele.id;
    var idNum = parseInt(id.substring(id.length - 1));

    if (pdf[idNum - 1] !== '') {
        $('#infoDivName').text($('#divName' + idNum).text());
        $('#infoDivBatch').text($('#divBatch' + idNum).text());
        $('#infoDivAim').text($('#divAim' + idNum).text());
        $('#number').text('' + idNum);
        $('#feedbackTxt').val('');
        $("#modalCVLink").attr("href", pdf[idNum - 1]);

        $('#feedbackTxt').focus();
        $('#myModal').modal({
            backdrop: 'static',
            keyboard: false
        });
    } else {
        $('#myModal').modal('hide');
    }
}
function validateFeedback() {
    var feedback = $('#feedbackTxt').val().trim();
    var num = $('#number').text().trim();

    if (~isNaN(feedback) && feedback !== '') {
        $("#loadingModal").modal({
            backdrop: 'static',
            keyboard: false
        });

        saveFeedBack(num, feedback);
    } else {
        alert("You must enter valid feedback to save !!");
    }

}

function updateEmptyMessage() {
    for (var i = 1; i < 5; i++) {
        if ($("#div" + i).is(":visible")) {
            $("#emptyMessage").hide();
            return
        }
    }

    $("#emptyMessage").show();
    // Hide the loading image
    $("#loadingGif").hide();
}

function sendEmailConfirmation(to) {
    // Send email
    
    var body = "Dear " + to.split('.')[0].substr(0, 1).toUpperCase() + to.split('.')[0].substr(1) + ",<br>Your CV review is completed. Please go and check CV Status on the App. <BR><BR>Best Regards,<BR>CV Feedback APP TEAM";
    var subject = "CV Feedback";

    //Get the relative url of the site
    var siteurl = _spPageContextInfo.webServerRelativeUrl;
    var urlTemplate = siteurl + "/_api/SP.Utilities.Utility.SendEmail";
    $.ajax({
        contentType: 'application/json',
        url: urlTemplate,
        type: "POST",
        data: JSON.stringify({
            'properties': {
                '__metadata': {
                    'type': 'SP.Utilities.EmailProperties'
                },
                'To': {
                    'results': [to]
                },
                'Body': body,
                'Subject': subject
            }
        }),
        headers: {
            "Accept": "application/json;odata=verbose",
            "content-type": "application/json;odata=verbose",
            "X-RequestDigest": jQuery("#__REQUESTDIGEST").val()
        },
        success: function (data) {
            // Success
        },
        error: function (err) {
            alert('Error in sending Email: ' + JSON.stringify(err));
        }
    });
}