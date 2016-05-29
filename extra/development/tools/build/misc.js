var Misc = (function(){
	var objStream = new ActiveXObject("ADODB.Stream");
	var WshShell = new ActiveXObject("WScript.Shell");
	objStream.CharSet = "utf-8";

	function exec(cmdline, options){
		if(!options)
			options = {};

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

		options.output = allInput;
		if(!options.silent)
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

	return {
		exec: exec,
		readFileToString: readFileToString,
		writeStringToFile: writeStringToFile
	};
})();