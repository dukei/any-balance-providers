var Modules = (function(){
	var WshShell = new ActiveXObject("WScript.Shell");
	var fso = new ActiveXObject("Scripting.FileSystemObject");

	var repositories = initRepositories();
	var modulesCache = {};
	var defaultVersion = 'head';

	function backSlashes(path){
		return path.replace(/[\/\\]+/g, '\\');
	}

	function normalizeFolderPath(path){
		return path.replace(/[\/\\]*$/, '\\'); //Всегда на конце палка
	}

	//Находим репозитории в переменной %ABREPOS% в формате repo*path;repo*path
	function initRepositories(){
		var ret = {};
		var repos_str = WshShell.ExpandEnvironmentStrings( "%ABREPOS%" );
		if(!repos_str){
			WScript.Echo('WARNING: module repositories are not set. Use %ABREPOS% environment variable to set repositories in format default*path/to/modules;otherrepo*path/to/other/repo');
			return ret;
		}
		var repos = repos_str.split(/\s*;\s*/g);
		WScript.Echo('Using repositories (from %ABREPOS%)');
		for(var i=0; i<repos.length; ++i){
			if(!repos[i])
				continue;
			var parts = repos[i].split(/\*/g);
			var repo, path;
			if(parts.length > 1){
				repo = parts[0];
				path = parts[1];
			}else{
				repo = 'default';
				path = parts[0];
			}
			ret[repo] = normalizeFolderPath(path);
			WScript.Echo('    ' + repo + ': ' + ret[repo]);
		}
		
		WScript.Echo('\n');
		return ret;
	}

	function clearModulesCache() { modulesCache = {}; }

	function createModule(id, repo, version){
		var m = new Module(id, repo, version);
		if(m.isRoot())
			return m;

		var m_cached = modulesCache[m.getFullId()];
		if(!m_cached)
			m_cached = modulesCache[m.getFullId()] = m;
		else if(m_cached.version != m.version)
			throw new Error('Module ' + m.getFullId() + ' is already loaded with version ' + m_cached.version + '. Can not reload it with version ' + m.version + '!');

		return m_cached;
	}

	function guessModuleIdAndRepo(module){
		var path = module.path + 'anybalance-manifest.xml', xml;
		if(fso.FileExists(path)){
			module.type = Module.TYPE.PROVIDER; //Или конвертер. Но это, наверное, потом различим
			xml = openXMLFile(path);
		}else if(fso.FolderExists(module.path + 'source\\')){
			module.type = Module.TYPE.MODULE;
			xml = openXMLFile(path.replace(/([^\/\\]+$)/, 'source\\$1'));
		}else{
			throw new Error('Unknown module type: ' + module.path);
		}

		var idNode = xml.selectSingleNode('//provider/id');
		if(!idNode)
			throw new Error(path + ' does not contain id node!');

		var id = idNode.text.trim();
		if(!id)
			throw new Error(path + ' contains empty id node!');

		if(backSlashes(module.path.substr(module.path.length-id.length-1, id.length)).toLowerCase() != backSlashes(id).toLowerCase())
			throw new Error(path + ' != ' + id + ': id should match the path name to ' + (module.type == Module.TYPE.MODULE ? 'module' : 'provider') + '!');

		module.id = id;
		var repoPath = backSlashes(module.path.substring(0, module.path.length - id.length - 1)).toLowerCase(); //Путь до репо (без ID модуля)

		for(var repo in repositories){
			var rPath = backSlashes(repositories[repo]).toLowerCase();
			if(rPath == repoPath){
				module.repo = repo;
				break;
			}
		}
	}


	function Module(idOrPath, repo, version){
		this.repo = repo || 'default';

		if(this.isRoot()){ //Провайдер или конвертер, в общем, топ-левел
			this.path = normalizeFolderPath(idOrPath);
			this.version = 'source';
			guessModuleIdAndRepo(this);
		}else{
			this.id = idOrPath;
			this.version = version || defaultVersion;
			this.type = Module.TYPE.MODULE;
		}

		this.files = [];
		this.depends = [];
		this.isLoaded = false;
		this.errorMessage;
	}

	Module.TYPE = {
		PROVIDER: 1,
		CONVERTER: 2,
		MODULE: 3
	};

	Module.prototype.isRoot = function(){
		return this.repo == '__self';
	}

	Module.prototype.getFullId = function(){
		return this.repo + ':' + this.id;
	}

	function openXMLFile(path){
		var xml = new ActiveXObject('MSXML2.DOMDocument');
		xml.async = false;
		xml.load(path);
		if (xml.parseError.errorCode != 0) 
		   throw new Error('Could not parse ' + path + ': ' + xml.parseError.reason);
		return xml;
	}

	function getGen(xml){
		var node = xml.selectSingleNode('//provider');
		var gen = node.attributes.getNamedItem('gen');
		return +((gen && gen.text) || 1);
	}

	function getFilesList(xml){
		var node = xml.selectSingleNode('//provider/files');
		if(!node)
			throw new Error(path + ' does not contain files node!');

		var nodeList = node.childNodes;
		var files = [];
		for(var i=0; i<nodeList.length; ++i){
			node = nodeList.item(i);
			if(node.nodeType != 1) //NODE_ELEMENT
				continue;
			var file = {
				type: node.tagName,
				name: node.text.trim()
			};

			var attrs = node.attributes;
			for(var j=0; j<attrs.length; ++j){
				if(!file.attrs)
					file.attrs = {};
				file.attrs[attrs.item(j).name] = attrs.item(j).text;
			}

			files.push(file);
		}

		return files;
	}

	function getModulesList(xml){
		var node = xml.selectSingleNode('//provider/depends');
		if(!node)
			return [];

		var nodeList = node.childNodes;
		var modules = [];
		for(var i=0; i<nodeList.length; ++i){
			node = nodeList.item(i);
			if(node.nodeType != 1) //NODE_ELEMENT
				continue;

			var id = node.attributes.getNamedItem('id'),
				repo = node.attributes.getNamedItem('repo'),
				version = node.attributes.getNamedItem('version');

			if(!id)
				throw new Error('No dependency id specified!');

			var module = createModule(id && id.text, repo && repo.text, version && version.text);	

			modules.push(module);
		}

		return modules;
	}

	Module.prototype.load = function(){
		if(this.isLoaded)
			return; //Уже загружен

		try{
			var path = this.getFilePath('anybalance-manifest.xml');
			var xml = openXMLFile(path);
		    
			this.files = getFilesList(xml);
			this.modules = getModulesList(xml);
			this.gen = getGen(xml);
			this.isLoaded = true;
		}catch(e){
			this.isLoaded = false;
			this.errorMessage = e.message;
			throw new Error('Could not load module ' + this.getFullId() + ': ' + e.message);
		}
	}

	Module.prototype.getFilePath = function(name){
		name = name || ''; //Без имени на папку указывает
		var basepath = this.isRoot() ? 
			this.path : 
			repositories[this.repo] && repositories[this.repo] 
				+ backSlashes(this.id) + '\\';

		if(this.type != Module.TYPE.MODULE){ //Провайдер или конвертер
			return basepath + name;
		}else{ //Модуль
			if(!basepath)
				throw new Error('Unknown repository ' + repo + '!');
			if(!name)
				return basepath;

			if(this.version == 'source'){
				return basepath + 'source\\' + name;
			}else{
				return basepath + 'build\\' + this.version + '\\' + name;
			}
		}
	}

	function traverseDependencies(module, callback){
		module.load();
		if(typeof callback == 'function')
			callback(module);
		if(callback && typeof callback.before == 'function')
			callback.before(module);
		
		for(var i=0; i<module.modules.length; ++i){
			var m = module.modules[i];
			traverseDependencies(m, callback);
		}

		if(callback && typeof callback.after == 'function')
			callback.after(module);
	}

	var gcccmd = 'java -jar "%ABROOT%\\extra\\development\\tools\\compressors\\compiler.jar" --language_in ECMASCRIPT_NEXT --language_out $LANGUAGE_OUT --charset utf-8';

	function buildModule(basepathOrModule, version){
		var basepath, provider;

		if(typeof(basepathOrModule) == 'string'){
			basepath = basepathOrModule;
			if(!fso.FolderExists(basepath))
				throw new Error('Folder ' + basepath + ' does not exist!');
	        
			provider = Modules.createModule(basepath, '__self');
		}else{
			basepath = basepathOrModule.getFilePath();
			version = basepathOrModule.version; //Билдим модуль для той же версии
			provider = new Module(basepathOrModule.id, basepathOrModule.repo, 'source'); //В обход кеша обязательно
		}

		provider.load();
	    
		var sub_module_id = provider.id.replace(/[\\\/]+/g, '.');
	    
		if(!version) version = 'head';
	    
		var files = [];
		for(var i=0; i<provider.files.length; ++i){
			var file = provider.files[i];
			if(file.type == 'js' && !/:/.test(file.name))
				files.push(provider.getFilePath(file.name));
		}
	    
		var version_path = basepath + 'build\\' + version + '\\';
		if(!fso.FolderExists(version_path)){
			var ret = Misc.exec('cmd /c mkdir "' + version_path + '"');
			if(ret != 0)
				throw new Error('Can not create module version folder: ' + version_path);
		}
	    
	    try{
	    	fso.DeleteFile(version_path + '*.js', true); //Удаляем старые файлы
	    }catch(e){
	    	WScript.Echo("WARNING: deleting old js files: " + e.message);
	    }

	    var cmd;
	    if(provider.gen === 2)
	    	cmd = gcccmd.replace("$LANGUAGE_OUT", "ECMASCRIPT_2017");
	    else
	    	cmd = gcccmd.replace("$LANGUAGE_OUT", "ECMASCRIPT5");
	    cmd += ' --js "' + files.join('" --js "') + '" --js_output_file "' + version_path + sub_module_id + '.min.js"';
	    WScript.Echo(cmd);

		var oExec = Misc.exec(cmd);
		if(oExec != 0)
			throw new Error('Compilation failed!');

		var new_manifest = Misc.readFileToString(provider.getFilePath('anybalance-manifest.xml'));
		new_manifest = new_manifest.replace(/\s*<js[^>]*>([^<]*)<\/js>/ig, ''); //Убираем все js файлы
		Misc.writeStringToFile(version_path + 'anybalance-manifest.xml', new_manifest.replace(/(<files[^>]*>)/i, '$1\n\t\t<js>' + sub_module_id + '.min.js</js>'));
		fso.CopyFile(basepath + 'source\\history.xml', version_path + 'history.xml', true);
		
		WScript.Echo('SUCCESS: Module ' + provider.getFullId() + ' has been compiled to version ' + version);
		return provider;
	}

	function getFilesMaxTime(module, allowNotExists){
		var maxTime = 0;
		for(var i=0; i<module.files.length; ++i){
			var file = module.files[i];
			var path = module.getFilePath(file.name);
			var time;
			try{
				var f = fso.GetFile(path);
				time = new Date(f.DateLastModified).getTime();
			}catch(e){
				if(allowNotExists){
					WScript.Echo('Problem getting file ' + path + ': ' + e.message + ' -- assuming it is not built yet');
					return 0;
				}
				throw new Error('Problem getting file ' + path + ': ' + e.message);
			}
			if(time > maxTime)
				maxTime = time;
		}
		return maxTime;
	}

	function checkIfBuilt(module){
		if(module.version != 'head')
			return true; //Только для head проверям, что несбилжено
	    if(module.type != Module.TYPE.MODULE)
	    	return true;

	    var moduleSource = new Module(module.id, module.repo, 'source'); //Специально мимо кеша создаём
	    moduleSource.load();

	    var time = getFilesMaxTime(module, true);
	    var timeSrc = getFilesMaxTime(moduleSource);

	    return timeSrc <= time;
	}

	function checkIfCommitted(module){
		var options = {silent: true};
		var path = module.getFilePath().replace(/[\\\/]+$/, '');
		var cmdLine = 'git -C "' + path + '" status "' + path + '"';
		var oExec = Misc.exec(cmdLine, options);
		if(oExec != 0){
			WScript.Echo('Executing> ' + cmdLine);
			WScript.Echo(options.output);
			throw new Error('Could not commit. Git returned ' + oExec);
		}
			
		if(/nothing to commit/i.test(options.output))
			return true;

		WScript.Echo('Module is not committed: ' + module.getFullId());
		WScript.Echo(cmdLine);
		WScript.Echo(options.output);
			
		return false;
	}

	function findGitRoot(path){
		do{
			path = normalizeFolderPath(path);
			if(fso.FolderExists(path + '.git'))
			    return path;
			path = path.replace(/[^\/\\]+[\/\\]+$/, ''); //Перешли на уровень вверх
		}while(path);
	}

	function setDefaultVersion(version){
		defaultVersion = version;
	}

	return {
		createModule: createModule,
		clearModulesCache: clearModulesCache,
		loadAll: traverseDependencies,
		traverseDependencies: traverseDependencies,
		buildModule: buildModule,
		checkIfBuilt: checkIfBuilt,
		checkIfCommitted: checkIfCommitted,
		findGitRoot: findGitRoot,
		setDefaultVersion: setDefaultVersion
	};

})();

