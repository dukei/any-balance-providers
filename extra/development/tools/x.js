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
var g_js_files = [];
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
	var objStream = new ActiveXObject("ADODB.Stream");
	objStream.CharSet = "utf-8";
	
	var manifest = openManifest(objStream);
	var isConverter = /<api[^>]+flags="[^"]*\bconverter\b/i.test(manifest);
	getManifestData(manifest);
	
	// Проверим не заменены ли преференсы в файле
		
	var mainJs = g_js_files[g_js_files.length-1]; //main.js обычно последний файл
	if(g_prefs_file) {
		var msg = ' Check you main.js file for stupid errors!';
		
		var prefsName = searchRegExpSafe(/(?:var\s+)?([^\s]+)\s*=\s*AnyBalance\.getPreferences\s*\(\)/i, mainJs);
		//var prefsName = /(?:var\s+)?([^\s]+)\s*=\s*AnyBalance\.getPreferences\s*\(\)/i.exec(mainJs)[1];
		if(prefsName) {
			// Нельзя хардкодить преференсы!
	/*		var reg = new RegExp('(?:var\\s+)?' + prefsName + '\\s*=\\s*([^,;]+)', 'ig');
			var r_result;
			while((r_result = reg.exec(mainJs)) !== null) {
				if(!/AnyBalance\.getPreferences\s*\(\)/i.test(r_result[1])) {
					throw new Error('You have overrided your preferences!' + msg);
				}
			} */
		}
		//Обработать ошибку входа!
		if(mainJs.indexOf('<div[^>]+class="t-error"[^>]*>[\\s\\S]*?<ul[^>]*>([\\s\\S]*?)<\\/ul>') > 0){
				throw new Error('You have to check for login error and show appropriate message!');
		}
	}
	
	// var intDoIt = WshShell.Popup('Do you want to use new library.js?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
	// if(intDoIt == vbYes) {
		
	// }
	WScript.Echo('Checking for dependencies change...');
	var commitDirs = checkModulesIfAreCompiledAndCommitted();
	
	// Запишем манифест
	writeManifest(objStream, manifest, mainJs, WshShell);
	
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
		objStream.SaveToFile (g_history_file || g_new_history_file_name, 2);
	objStream.Close();

	var intDoIt = WshShell.Popup('Provider: ' + g_prov_text_id + ' v.' + g_prov_major_version + '.' + g_prov_version + ' edited.\nAdded new history line: ' + result + '\n\nDo you want to commit via TortoiseGit?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
	
	if(intDoIt == vbYes) {
		// Want to commit
		commitDirs.push(WshShell.CurrentDirectory);
		commit(commitDirs, result);
	}
}catch(e){
	if(e.message != cancel){
		messageBox((e.message || e.description) + (e.number ? ' (code: 0x' + decimalToHexString(e.number) + ')' : ''), vbOKOnly, e.name || 'Error');
		throw e;
	}
}

function decimalToHexString(number)
{
    if (number < 0)
    {
        number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase();
}

function dumpObj(o){
	var str = ['Object {'];
	for(var p in o){
		str.push(p, '=', o[p]);
	}
	str.push('}');
	return str.join('\n');
}

function commit(commitDirs, mesg) {
	// SVN
	// WshShell.Run('tortoiseproc /command:commit /logmsg:"' + g_prov_name + ' (' + g_prov_text_id + '):\n' + mesg + '" /path:"'+commitDirs.join('*')+'"');

	//Отдельные репозитории надо отдельными диалогами комиттить. Поэтому разделяем их
	var repos = {};
	for(var i=0; i<commitDirs.length; ++i){
		var repo = Modules.findGitRoot(commitDirs[i]) || '-';
		repo = repo.toLowerCase().replace(/\/+/g, '\\');
		var dirs = repos[repo];
		if(!dirs)
			dirs = repos[repo] = [];
		dirs.push(commitDirs[i]);
	}

	for(var repo in repos){
		WScript.Echo('Committing paths for repo ' + repo + ': ' + repos[repo].join('\n    '));
		// GIT
		var cmd = 'TortoiseGitProc /command:commit /logmsg:"' + g_prov_name + ' (' + g_prov_text_id + '):\n' + mesg + '" /path:"'+repos[repo].join('*')+'"';
		try{
			WshShell.Run(cmd);
		}catch(e){
			e.message = 'Can not launch ' + cmd + '\nCause: ' + (e.message || e.description || '');
			throw e;
		}
	}
}

function readFileToString(file) {
	try{
		objStream.Open();
		objStream.LoadFromFile(file);
		var text = objStream.ReadText();
		objStream.Close();
		
		return text; 
	}catch(e){
		WScript.Echo('Can not open file ' + file + ': ' + e.message);
		throw e;
	}
}

function getManifestData(manifest) {
	g_prov_major_version = searchRegExpSafe(/<id[^>]*major_version\s*=\s*"([^"]+)"/i, manifest);
	g_prov_version = searchRegExpSafe(/<id[^>]*\sversion\s*=\s*"([^"]+)"/i, manifest)*1;
	if(!++g_prov_version)
		throw new Error('No version specified in the manifest!');
	g_prov_text_id = searchRegExpSafe(/<id[^>]*>([^<]+)/i, manifest);
	if(!g_prov_text_id)
		throw new Error('No text_id specified in the manifest!');
	g_prov_name = searchRegExpSafe(/<name>([^<]+)/i, manifest);
	if(!g_prov_name && !isConverter)
		throw new Error('No name specified in the manifest!');
	g_prov_name = g_prov_name || 'Converter for ' + g_prov_text_id;

	g_history_file = searchRegExpSafe(/<history>([^<]+)<\/history>/i, manifest);
	if(!g_history_file){
		g_new_history_file_name = VBInputBox("No history file specified in the manifest! Would you like to create it? Enter the name of history file.", "history.xml")
		if(!g_new_history_file_name)
			throw new Error(cancel);
	}
		
	g_js_files = searchRegExpSafe(/<js[^>]*>([\s\S]*?)<\/js>/ig, manifest);

	g_prefs_file = searchRegExpSafe(/<preferences>([^<]+)<\/preferences>/i, manifest);}

function openManifest(objStream) {
	objStream.Open();
	objStream.LoadFromFile("anybalance-manifest.xml");
	var strData = objStream.ReadText();
	objStream.Close();
	return strData;
}

function writeManifest(objStream, manifest, mainJs, WshShell) {
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

	if(!/nadapter\.js|<module[^>]+id="nadapter"/i.test(manifest) && /NAdapter/.test(mainJs)){
		var intDoIt = WshShell.Popup('You seem to use NAdapter, but you have forgot to include it in manifest.\nDo you want to do this?', 0, "Result", vbYesNo + vbInformation + stayOnTop);
		if(intDoIt == vbYes) {
			if(/<depends/i.test(manifest)){
				manifest = manifest.replace(/(<depends[^>]*>)/i, '$1\n\t\t<module id="nadapter"/>');
			}else{
				manifest = manifest.replace(/(<files[^>]*>)/i, '<depends>\n\t\t<module id="nadapter"/>\n\t</depends>\n\t$1');
			}
		}	
	}

	if(!g_history_file)
		manifest = manifest.replace(/(\s*)<\/files>/i, '$1\t<history>' + g_new_history_file_name + '</history>$1</files>');
	
	objStream.Open();
	objStream.WriteText(manifest.replace(/\sversion="\d+"/i, ' version="'+g_prov_version+'"'));
	objStream.SaveToFile ("anybalance-manifest.xml", 2);
	objStream.Close();
}

function searchRegExpSafe(regExp, where) {
	if(!regExp.global){
		var r = regExp.exec(where);
		return r ? r[1] : ''; 
	}else{
		var arr = [], r;
		while ((r = regExp.exec(where)) !== null) {
			arr.push(r[1] || '');
		}
		return arr;
	}
	
}

function addZeros(val) {
	return val < 10 ? '0' + val : '' + val;
} 

function checkModulesIfAreCompiledAndCommitted(){
	var curDir = WshShell.CurrentDirectory;
	var provider = Modules.createModule(curDir, '__self');

	var modules = {}; //просто список используемых модулей
	var deps = []; //Модули, от которых зависим.
	var pathsToCommit = [];

	Modules.traverseDependencies(provider, {
		after: function(module){
			var id = module.getFullId();
			if(modules[id])
				return;
			if(module.isRoot())
				return;
			modules[id] = module;
			deps.push(module); 
		}
	});

	for(var i=0; i<deps.length; ++i){
		var module = deps[i];
		WScript.Echo('Checking ' + module.getFullId() + '...');
		if(!Modules.checkIfBuilt(module)){
			WScript.Echo('Module ' + module.getFullId() + ' source is newer than head. Building head...');
			Modules.buildModule(module);
		}

		if(!Modules.checkIfCommitted(module)){
			WScript.Echo('Module ' + module.getFullId() + ' has uncommitted changes. Adding it to commit path.');
			pathsToCommit.push(module.getFilePath().replace(/[\\\/]+$/, ''));
		}
	}

	return pathsToCommit;
}