var objStream = new ActiveXObject("ADODB.Stream");
var WshShell = new ActiveXObject("WScript.Shell");
var fso = new ActiveXObject("Scripting.FileSystemObject");

objStream.CharSet = "utf-8";

var gcccmd = 'java -jar "%ABROOT%\\extra\\development\\tools\\compressors\\compiler.jar" --language_in ECMASCRIPT6 --language_out ECMASCRIPT5 --charset utf-8';

function main(){
	var objArgs = WScript.Arguments;
	if(objArgs.length < 1)
		throw new Error('Please specify full path to module as an argument!');

	var basepath = objArgs(0);
	if(!fso.FolderExists(basepath))
		throw new Error('Folder ' + basepath + ' does not exist!');

	basepath = basepath.replace(/[\/\\]*$/, '\\'); //Всегда на конце палка

	var matches = /([^\/\\]+)[\/\\]?$/.exec(basepath);
	var sub_module_id = matches[1];

	var version = 'head';
	if(objArgs.length >= 2)
		version = objArgs(1);

	var manifest = readFileToString(basepath + 'source\\anybalance-manifest.xml');
	var files = [];
	var new_manifest = manifest.replace(/\s*<js[^>]*>([^<]*)<\/js>/ig, function(str, file){
		files.push(basepath + 'source\\' + file);
		return '';
	});

	var version_path = basepath + 'build\\' + version + '\\';
	if(!fso.FolderExists(version_path)){
		var ret = WshShell.Run('cmd /c mkdir "' + version_path + '"', 0, true);
		if(ret != 0)
			throw new Error('Can not create module version folder: ' + version_path);
	}

	var oExec = WshShell.Run(gcccmd + ' --js "' + files.join('" --js "') + '" --js_output_file "' + version_path + sub_module_id + '.min.js"', 0, true);
	if(oExec != 0)
		throw new Error('Compilation failed!');

	writeStringToFile(version_path + 'anybalance-manifest.xml', new_manifest.replace(/(<files[^>]*>)/i, '$1\n\t\t<js>' + sub_module_id + '.min.js</js>'));
	fso.CopyFile(basepath + 'source\\history.xml', version_path + 'history.xml', true);
}

function readFileToString(file) {
	try{
		objStream.Open();
		objStream.LoadFromFile(file);
		var text = objStream.ReadText();
		objStream.Close();
	}catch(e){
		throw new Error('Problem reading file ' + file + ': ' + e.message);
	}
	return text; 
}

function writeStringToFile(file, text){
	try{
		objStream.Open();
		objStream.WriteText(text);
		objStream.SaveToFile (file, 2);
		objStream.Close();
	}catch(e){
		throw new Error('Problem writing file ' + file + ': ' + e.message);
	}
}

try{
	main();
}catch(e){
	WScript.Echo(e.message);
	WScript.Quit(-1);
}