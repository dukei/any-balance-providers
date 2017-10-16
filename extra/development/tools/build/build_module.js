function main(){
	var objArgs = WScript.Arguments;
	if(objArgs.length < 1)
		throw new Error('Please specify full path to module as an argument!');

	Modules.buildModule(objArgs(0), objArgs.length > 1 ? objArgs(1) : undefined);
}

try{
	main();
}catch(e){
	WScript.Echo(e.message);
	throw e;
}