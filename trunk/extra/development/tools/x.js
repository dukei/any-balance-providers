/**
AnyBalance provider helper
*/

// Здесь описание провайдера
var g_prov_version = 1;
var g_prov_major_version = '';
var g_prov_text_id = '';
var g_prov_name = '';
var g_history_file = '';
var g_new_history_file_name = ''; //Имя файла истории, если его раньше не было в манифесте
var g_prefs_file = '';
var g_defaultHistoryLine = '- Поддержка изменений на сайте.';

var vbOKOnly = 0; // Constants for Popup
var vbYesNo = 4;

var stayOnTop = 4096;
var vbInformation = 64;
var vbCancel = 2;
var vbYes = 6;
var vbNo = 7;

var title = "Add history line";
var prompt = "Enter a line to history:";
var cancel = "User asked to terminate";

try{

	var result = createInput("wnd.html","Adding history",(5 * 60) * 1000);
	if(!result)
		throw new Error(cancel);

	// Create the WshShell object (needed for using Popup).
	var WshShell = WScript.CreateObject("WScript.Shell");
	// Open the input dialog box using a function in the .wsf file.
	// Test whether the Cancel button was clicked.
	if (result) {
		var objStream = new ActiveXObject("ADODB.Stream");
		objStream.CharSet = "utf-8";
		
		var manifest = openManifest(objStream);
		getManifestData(manifest);
		
		// Проверим не заменены ли преференсы в файле
		var mainJs = readFileToString('main.js');
		if(g_prefs_file) {
			var msg = ' Check you main.js file for stupid errors!';
			
			var prefsName = searchRegExpSafe(/(?:var\s+)?([^\s]+)\s*=\s*AnyBalance\.getPreferences\s*\(\)/i, mainJs);
			//var prefsName = /(?:var\s+)?([^\s]+)\s*=\s*AnyBalance\.getPreferences\s*\(\)/i.exec(mainJs)[1];
			if(!prefsName) {
				throw new Error('We don`t found AnyBalance.getPreferences()!' + msg);
			}
			
			// Нельзя хардкодить преференсы!
			var reg = new RegExp('(?:var\\s+)?' + prefsName + '\\s*=\\s*([^,;]+)', 'ig');
			var r_result;
			while((r_result = reg.exec(mainJs)) !== null) {
				if(!/AnyBalance\.getPreferences\s*\(\)/i.test(r_result[1])) {
					throw new Error('You have overrided your preferences!' + msg);
				}
			}
		}
		
		// var intDoIt = WshShell.Popup('Do you want to use new library.js?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
		// if(intDoIt == vbYes) {
			
		// }
		
		// Запишем манифест
		writeManifest(objStream, manifest, WshShell);
		
		// История 
		var originalHistory = '<?xml version="1.0" encoding="utf-8"?>\n\
<history>\n\
</history>';

		if(g_history_file)
			originalHistory = readFileToString(g_history_file);
			
		var dt = new Date();
		
		var major_version_str = (g_prov_major_version ? 'major_version="' + g_prov_major_version + '" ' : '');
		
		originalHistory = originalHistory.replace(/<history>/, '<history>\n\t<change ' + major_version_str + 'version="' + g_prov_version + '" date="' + dt.getYear() + '-' + addZeros(dt.getMonth()+1) + '-' + addZeros(dt.getDate()) + '">\n\t' + result.replace(/\n/g, '\n\t') + '\n\t</change>');
		originalHistory = originalHistory.replace(/^\s*|\s*$/g, '');
		
		objStream.Open();
		objStream.WriteText(originalHistory);
		if(g_history_file)
			objStream.SaveToFile (g_history_file, 2);
		else
			objStream.SaveToFile (g_history_file || g_new_history_file_name, 1);
		objStream.Close();
		
		var intDoIt = WshShell.Popup('Provider: ' + g_prov_text_id + ' v.' + g_prov_major_version + '.' + g_prov_version + ' edited.\nAdded new history line: ' + result + '\n\nDo you want to commit via SVN?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
		
		if(intDoIt == vbYes) {
			// Want to commit
			commit(WshShell, result);
		}
	} else { // Cancel button was clicked.
		//var intDoIt = WshShell.Popup("Sorry, no input", 0, "Result", vbOKOnly + vbInformation + stayOnTop);
	}
}catch(e){
	if(e.message != cancel)
		throw e;		
}

function commit(WshShell, mesg) {
	WshShell.Run('tortoiseproc /command:commit /logmsg:"' + g_prov_name + ' (' + g_prov_text_id + '):\n' + mesg + '" /path:"'+WshShell.CurrentDirectory+'"');
}

function readFileToString(file) {
	objStream.Open();
	objStream.LoadFromFile(file);
	var text = objStream.ReadText();
	objStream.Close();
	return text; 
}

function getManifestData(manifest) {
	g_prov_major_version = searchRegExpSafe(/<id[^>]*major_version\s*=\s*"([^"]+)"/i, manifest);
	g_prov_version = searchRegExpSafe(/<id[^>]*\sversion\s*=\s*"([^"]+)"/i, manifest)*1;
	if(!g_prov_version++)
		throw new Error('No version specified in the manifest!');
	g_prov_text_id = searchRegExpSafe(/<id[^>]*>([^<]+)/i, manifest);
	if(!g_prov_text_id)
		throw new Error('No text_id specified in the manifest!');
	g_prov_name = searchRegExpSafe(/<name>([^<]+)/i, manifest);
	if(!g_prov_name)
		throw new Error('No name specified in the manifest!');		
	g_history_file = searchRegExpSafe(/<history>([^<]+)<\/history>/i, manifest);
	if(!g_history_file){
		g_new_history_file_name = VBInputBox("No history file specified in the manifest! Would you like to create it? Enter the name of history file.", "history.xml")
		if(!g_new_history_file_name)
			throw new Error(cancel);
	}
		
	g_prefs_file = searchRegExpSafe(/<preferences>([^<]+)<\/preferences>/i, manifest);	
}

function openManifest(objStream) {
	objStream.Open();
	objStream.LoadFromFile("anybalance-manifest.xml");
	var strData = objStream.ReadText();
	objStream.Close();
	return strData;
}

function writeManifest(objStream, manifest, WshShell) {
	if(!/jquery/i.test(manifest) && !/no_browser/.test(manifest)) {
		var intDoIt = WshShell.Popup('You do not use jquery in your provider!\nTo improve compability you must add "no_browser" flag \nDo you want to do this?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
		if(intDoIt == vbYes) {
			var apiFlags = searchRegExpSafe(/<api[^>]*flags\s*=\s*"([^"]+)/i, manifest);
			// already has some flags
			if(apiFlags) {
				manifest = manifest.replace(/flags\s*=\s*"([^"]+)"/, 'flags="no_browser|$1"');
			} else {
				manifest = manifest.replace(/<provider>/, '<provider>\n\t<api flags="no_browser"/>');
			}
		}
	}

	if(/<type[^>]*>[^<]*money/i.test(manifest) && !/<type[^>]*>[^<]*(bank|wallet)/i.test(manifest)){
		var result = createInput("type.html","Исправление типа",(5 * 60) * 1000);
		if(!result)
			throw new Error(cancel);

		manifest = manifest.replace(/<\/type>/, ', ' + result + '</type>');
	}
	
	if(!g_history_file)
		manifest = manifest.replace(/(\s*)<\/files>/i, '$1\t<history>' + g_new_history_file_name + '</history>$1</files>');
	
	objStream.Open();
	objStream.WriteText(manifest.replace(/\sversion="\d+"/i, ' version="'+g_prov_version+'"'));
	objStream.SaveToFile ("anybalance-manifest.xml", 2);
	objStream.Close();
}

function searchRegExpSafe(regExp, where) {
	var r = regExp.exec(where);
	
	return r ? r[1] : ''; 
}

function addZeros(val) {
	return val < 10 ? '0' + val : '' + val;
} 