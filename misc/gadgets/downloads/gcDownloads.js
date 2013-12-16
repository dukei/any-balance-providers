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
var MORE_TMPL = "http://anybalance.ru/catalog.php?inapp=0";
var MONTHS = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
var ITEMS_PER_PAGE = 10;

function handleFeed(response, prefs) {
  if (!response.text) {
    $("#content_div").html("Oops, can't fetch recent changes.  Try again later!");
    adjustIFrameHeight();
    return;
  }

  var matches = response.text.match(/<table(?:[\s\S](?!<\/table))*?class="provider"[\s\S]*?<\/table>/i);
  if(!matches){
    $("#content_div").html("Could not find recent providers table!");
    adjustIFrameHeight();
    return;
  }

  var styles = response.text.match(/<style>[\s\S]*?<\/style>/i);
  if(!styles){
    $("#content_div").html("Could not find styles!");
    adjustIFrameHeight();
    return;
  }
  
  $( styles[0] ).appendTo( "head" )
  var content = '<div id="content">' + matches[0]
	.replace(/catalog.php\?/ig, MORE_TMPL + '&') 
	.replace(/(<a[^>]+)name="ab-/ig, '$1 target="_blank" name="ab-') 
	+ '</div>';

  //content = JSON.stringify(response.data);

  var projectName = escape(prefs.getString("projectName"));
  var more_downloads_link = MORE_TMPL.replace(/%PROJECT%/g, projectName);
  content += "<br><a target='_blank' href='" + more_downloads_link + "'>More &gt;</a>";
  $("#content_div").html(content);
  
  localAdjust();
  
  window.setTimeout(localAdjust, 1000);
  window.setTimeout(localAdjust, 3000);
  window.setTimeout(localAdjust, 5000);
}

function localAdjust(){
  try{
    gadgets.window.adjustHeight($("#content_div").height());
  }catch(e){}
}

function localInit() {
  var prefs = new gadgets.Prefs();
  var projectName = prefs.getString("projectName");
  var lastCount = prefs.getInt("lastCount");
  // There seems to be some disagreement between OpenSocial containers about
  // whether prefs.getString() returns an escaped string or not.  Let's be paranoid.
  var url = "http://anybalance.ru/catalog.php?key=__new&inapp=0";

  var params = {};
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT;
  gadgets.io.makeRequest(url, function(resp) { handleFeed(resp, prefs); }, params);
}

gadgets.util.registerOnLoadHandler(localInit);
