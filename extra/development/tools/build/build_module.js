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
		var ret = exec('cmd /c mkdir "' + version_path + '"');
		if(ret != 0)
			throw new Error('Can not create module version folder: ' + version_path);
	}

	writeStringToFile(version_path + 'anybalance-manifest.xml', new_manifest.replace(/(<files[^>]*>)/i, '$1\n\t\t<js>' + sub_module_id + '.min.js</js>'));
	fso.CopyFile(basepath + 'source\\history.xml', version_path + 'history.xml', true);
	
	var oExec = exec(gcccmd + ' --js "' + files.join('" --js "') + '" --js_output_file "' + version_path + sub_module_id + '.min.js"');
	if(oExec != 0)
		throw new Error('Compilation failed!');
}

function exec(cmdline){
	var oExec = WshShell.Exec(cmdline);
    
    function ReadAllFromAny(oExec)
    {
         if (!oExec.StdOut.AtEndOfStream)
              return oExec.StdOut.ReadAll();
    
         if (!oExec.StdErr.AtEndOfStream)
              return oExec.StdErr.ReadAll();
         
         return -1;
    }
    
    var allInput = "";
    var tryCount = 0;
    
    while (true)
    {
         var input = ReadAllFromAny(oExec);
         if (-1 == input)
         {
              if (tryCount++ > 10 && oExec.Status == 1)
                   break;
              WScript.Sleep(100);
         }
         else
         {
              allInput += input;
              tryCount = 0;
         }
    }

    WScript.Echo(allInput);
    
    return oExec.ExitCode;
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