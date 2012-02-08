/**
 * Copyright 2008 Google Inc.
 * Copyright 2012 Dmitry Kochin.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ROW_TMPL = "<tr><td valign='top' style='white-space: nowrap;'>%DATE%</td><td valign='center'><img width='20' src='%IMAGE%'/></td><td valign='top'><a href='%LINK%' target='_blank'>%FILENAME%</a></td></tr>";
var MORE_TMPL = "http://code.google.com/p/%PROJECT%/downloads/list";
var MONTHS = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
var ITEMS_PER_PAGE = 10;

function handleFeed(response, prefs) {
  if (!response.data) {
    $("#content_div").html("Oops, can't fetch downloads.  Try again later!");
    adjustIFrameHeight();
    return;
  }

  var num_entries = response.data.Entry.length;
  if (num_entries == 0) {
    $("#content_div").html("This project does not have any downloads.");
    adjustIFrameHeight();
    return;
  }

  var prefs = new gadgets.Prefs();
  var lastCount = prefs.getInt("lastCount");

  var content = "<center><table cellspacing='0' cellpadding='0'>";
  for (var i = 0; i < Math.min(num_entries, lastCount || ITEMS_PER_PAGE); i++) {
    var entry = response.data.Entry[i];
    var when = new Date(entry.Date);
    var formatted_when = MONTHS[when.getMonth()] + " " + when.getDate();
    var matches = entry.Title.match(/(ab-[\w\-]+)_(\d+)\.zip/);
    var provname, provrev;
    if(matches){ //If the filename doesn't match, then it is not a provider file
        provname = matches[1];
        provrev = matches[2];
    }else{
        continue;
    }
    var title = entry.Summary.replace(/<pre>\s*([^\n]*)\n[\s\S]*/, '$1');
    var html = ROW_TMPL.replace(/%DATE%/g, formatted_when)
                       .replace(/%LINK%/g, entry.Link)
		       .replace(/%IMAGE%/g, 'http://any-balance-providers.googlecode.com/svn-history/r%REVISION%/trunk/%PROVNAME%/icon.png')
                       .replace(/%REVISION%/g, provrev)
                       .replace(/%PROVNAME%/g, provname)
                       .replace(/%FILENAME%/g, title);
    content += html;
  }
  content += "</table>";

  //content = JSON.stringify(response.data);

  if (num_entries > ITEMS_PER_PAGE) {
    var projectName = escape(prefs.getString("projectName"));
    var more_downloads_link = MORE_TMPL.replace(/%PROJECT%/g, projectName);
    content += "<br><a target='_blank' href='" + more_downloads_link + "'>More &gt;</a>";
  }
  content += "</center>";
  $("#content_div").html(content);
  adjustIFrameHeight();
  window.setTimeout(1000, adjustIFrameHeight); //try to adjust in some time, when images are loaded
  window.setTimeout(2000, adjustIFrameHeight); //try to adjust in some time, when images are loaded
  window.setTimeout(5000, adjustIFrameHeight); //try to adjust in some time, when images are loaded
}

function localInit() {
  var prefs = new gadgets.Prefs();
  var projectName = prefs.getString("projectName");
  var lastCount = prefs.getInt("lastCount");
  // There seems to be some disagreement between OpenSocial containers about
  // whether prefs.getString() returns an escaped string or not.  Let's be paranoid.
  var url = "http://code.google.com/feeds/p/" + escape(projectName) + "/downloads/basic";

  var params = {};
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.FEED;
  params[gadgets.io.RequestParameters.NUM_ENTRIES] = lastCount || (ITEMS_PER_PAGE + 1);
  params[gadgets.io.RequestParameters.GET_SUMMARIES] = true;
  gadgets.io.makeRequest(url, function(resp) { handleFeed(resp, prefs); }, params);
}

gadgets.util.registerOnLoadHandler(localInit);
