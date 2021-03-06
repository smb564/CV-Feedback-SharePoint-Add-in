﻿// Sharepoint JSOM
var clientContext = SP.ClientContext.get_current();
var web = clientContext.get_web();
var user;

// Current userinfo
var userEmail;
var userGroups;

// For SharePoint REST calls
var appWebUrl;
var hostWebUrl;

$(document).ready(function () {
    $("#homeBtn").attr("href", "studentView.aspx?" + document.URL.split("?")[1]);
    $("#feedbackpanel").hide();
    $("#notReviewed").hide();
    $("#reviewed").hide();
    $("#notUploaded").hide();

    // Get the add-in web and host web URLs.
    appWebUrl = decodeURIComponent(getQueryStringParameter("SPAppWebUrl"));
    hostWebUrl = decodeURIComponent(getQueryStringParameter("SPHostUrl"));

    // Load user details
    user = clientContext.get_web().get_currentUser();
    clientContext.load(user);

    clientContext.executeQueryAsync(function () {
        userEmail = user.get_email();
        userGroups = user.get_groups();

        // Check and update the view accordingly
        checkUploadStatus();
    });

});

function getQueryStringParameter(paramToRetrieve) {
    var params = document.URL.split("?")[1].split("&");
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == paramToRetrieve) return singleParam[1];
    }
}

function checkUploadStatus() {
    var hostWebContext = new SP.AppContextSite(clientContext, hostWebUrl);

    cvList = hostWebContext.get_web().get_lists().getByTitle("CV List");

    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Email' /><Value Type='Text'>" + userEmail + "</Value></Eq></Where></Query></View>");

    cvItems = cvList.getItems(camlQuery);

    clientContext.load(cvItems);
    clientContext.executeQueryAsync(Function.createDelegate(this, checkUploadAccessSuccess), onFailed);
}

function checkUploadAccessSuccess() {
    var enumerator = cvItems.getEnumerator();

    while (enumerator.moveNext()) {
        var item = enumerator.get_current();
        if (item.get_item("Email") === userEmail) {
            // Check for a partially uploaded file
            if (item.get_item("Student_x0020_Name") === null) {
                notUploadedUI();
                return;
            }
            if (item.get_item("Status") === "In Process") {
                updateNotReviewedUI();
            } else {
                updateFeedbackGivenUI(item.get_item("Feedback_x0020_Given"));
            }
            return
        }
    }

    // Email is not in the uploaded list, hence no upload is done
    notUploadedUI();
}

function updateFeedbackGivenUI(feedback) {
    $("#loadingPic").hide();
    $("#notUploaded").hide();
    $("#feedbackpanel").show();
    $("#btnDownload").show();
    $("#reviewed").show();
    $("#feedbackbody").html(feedback);

    // linkify
    $("#feedbackbody").linkify({
        target: "_blank"
    }
    );

}

function updateNotReviewedUI() {
    $("#loadingPic").hide();
    $("#feedbackpanel").hide();
    $("#notUploaded").hide();
    $("#notReviewed").show();
    $("#btnDownload").show();

}

function notUploadedUI() {
    $("#loadingPic").hide();
    $("#feedbackpanel").hide();
    $("#notReviewed").hide();
    $("#btnDownload").hide();
    $("#notUploaded").show();
}

function onFailed(sender, args) {
    alert(args.get_message());

}

function downloadCV() {
    window.open(hostWebUrl + "/CV%20List/" + userEmail.split('.')[0] + userEmail.split('@')[0].split('.')[1] + ".pdf");
    return false; // To prevent refreshing the page when button press
}