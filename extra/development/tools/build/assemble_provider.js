function main(){
	var WshShell = WScript.CreateObject("WScript.Shell");
	var fso = new ActiveXObject("Scripting.FileSystemObject");

	var objArgs = WScript.Arguments, defaultVersion='head', pathTo7z='7z';
	if(objArgs.length >= 1)
		pathTo7z = objArgs(0);
	if(objArgs.length >= 2)
		defaultVersion = objArgs(1);

	Modules.setDefaultVersion(defaultVersion);
	var provider = Modules.createModule(WshShell.CurrentDirectory, '__self');

	var modules = {}; //просто список используемых модулей
	var deps = []; //Модули, от которых зависим.

	WScript.Echo('Traversing dependencies...');
	var modulesFound = [];

	Modules.traverseDependencies(provider, {
		after: function(module){
			var id = module.getFullId();
			if(modules[id])
				return;
			modules[id] = module;
			deps.push(module); 
			modulesFound.push(module.getFullId());
		}
	});

	var files = [];
	var fileNames = {};

	WScript.Echo('Found total ' + deps.length + ' modules: ' + modulesFound.join(', '));
	WScript.Echo('Listing files...');
	for(var i=0; i<deps.length; ++i){
		var module = deps[i];
		for(var j=0; j<module.files.length; ++j){
			var file = module.files[j];
			var root = module === provider;
			if(root || file.type=='js'){
				var name = file.name, k=0;
				while(fileNames[name]){
					name = 'f' + (++k) + '_' + file.name;
				}
				fileNames[file.name] = name;
					
				files.push({path: module.getFilePath(file.name), name: name, type: file.type, attrs: file.attrs});
			}
		}
	}

	WScript.Echo('Copying files...');

	var temp_folder = WshShell.CurrentDirectory + '\\tmp_build';

	if(!fso.FolderExists(temp_folder))
		fso.CreateFolder(temp_folder);

	var filesList = [];

	for(var i=0; i<files.length; ++i){
		var file = files[i];
		if(file.type != 'manifest')
			fso.CopyFile(file.path, temp_folder + '\\' + file.name);

		var attrs = [];
		for(var a in (file.attrs || {})){
			attrs.push(a + '="' + file.attrs[a] + '"');
		}
		filesList.push('<' + file.type + (attrs.length ? ' ' + attrs.join(' ') : '') + '>' + file.name + '</' +file.type+'>');
	}

	var manifest = Misc.readFileToString(provider.getFilePath('anybalance-manifest.xml'));
	manifest = manifest.replace(/<files[^>]*>[\s\S]*?<\/files>/i, '<files>\n\t\t' + filesList.join('\n\t\t') + '\n\t</files>');
	Misc.writeStringToFile(temp_folder + '\\' + 'anybalance-manifest.xml', manifest);

	var cmdline = '"' + pathTo7z + '" a -tzip -mx=9 "' + provider.getFilePath() + 'provider.zip" "' + temp_folder + '\\*.*"';
	WScript.Echo('Compressing files with cmdline:');
	WScript.Echo('> ' + cmdline);

	Misc.exec(cmdline); 

	WScript.Echo('Cleaning up...');
	fso.DeleteFile(temp_folder + '\\*.*');
	fso.DeleteFolder(temp_folder);
}

try{
	main();
}catch(e){
	WScript.Echo(e.message);
	throw e;
}