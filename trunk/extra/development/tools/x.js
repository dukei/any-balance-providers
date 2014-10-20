/**
AnyBalance provider helper
*/

// Здесь версия провайдера
var g_prov_version = 1;
var g_prov_major_version = '1.0';
var g_prov_text_id = '';
var g_history_file = '';

var vbOKOnly = 0; // Constants for Popup
var vbInformation = 64;
var title = "Add history line";
var prompt = "Enter a line to history:";

// Create the WshShell object (needed for using Popup).
var WshShell = WScript.CreateObject("WScript.Shell");
// Open the input dialog box using a function in the .wsf file.
var result = WSHInputBox(prompt, title, "- ");
// Test whether the Cancel button was clicked.
if (result != null) { // Cancel wasn't clicked, so get input.
	var fso = new ActiveXObject("Scripting.FileSystemObject");
	
	var manifest = openManifest(fso);
	getManifestData(manifest);
	
	var f = fso.OpenTextFile(g_history_file, 1, true, 0);
	var originalHistory = f.ReadAll();
	f.Close();
	
	var dt = new Date();
	originalHistory = originalHistory.replace(/<history>/, '<history>\n\t<change version="' + g_prov_version + '" date="' + dt.getYear() + '-' + addZeros(dt.getMonth()+1) + '-' + addZeros(dt.getDay()) + '">\n\t' + result + '\n\t</change>');
	originalHistory = originalHistory.replace(/^\s*|\s*$/g, '');
	
	var a = fso.OpenTextFile("history.xml", 2, true, 0);
	a.WriteLine(originalHistory);
	a.Close();
	
	var intDoIt = WshShell.Popup('Provider: ' + g_prov_text_id + ' v.' + g_prov_major_version + '.' + g_prov_version + ' edited.\nAdded new history line: ' + result, 0, "Result", vbOKOnly + vbInformation);
} else { // Cancel button was clicked.
	var intDoIt = WshShell.Popup("Sorry, no input", 0, "Result", vbOKOnly + vbInformation);
}

function getManifestData(manifest) {
	g_prov_major_version = searchRegExpSafe(/<id[^>]*major_version\s*=\s*"([^"]+)"/i, manifest);
	g_prov_version = searchRegExpSafe(/<id[^>]*\sversion\s*=\s*"([^"]+)"/i, manifest);
	g_prov_text_id = searchRegExpSafe(/<id[^>]*>([^<]+)/i, manifest);
	g_history_file = searchRegExpSafe(/<history>([^<]+)<\/history>/i, manifest);
	if(!g_history_file) 
		throw new Error('No history file specified in manifest!');
}

function openManifest(fso) {
	var f = fso.OpenTextFile("anybalance-manifest.xml", 1, true, 0);
	var manifest = f.ReadAll();
	f.Close();
	return manifest;
}

function searchRegExpSafe(regExp, where) {
	var r = regExp.exec(where);
	if(r[1])
		return r[1];
	
	else
		return '';
}

function addZeros(val) {
	return val < 10 ? '0' + val : '' + val;
} 