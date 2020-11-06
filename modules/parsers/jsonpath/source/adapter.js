//Функции для удобства использования jsonpath

function jspath(obj, path, defval){
	if(path == '$')
		return [obj];
	var arr = JSONPath({json: obj, path: path});
	if(!arr.length)
		return defval;
	return arr;
}

function jspath1(obj, path, defval){
	if(path == '$')
		return obj;
	var arr = JSONPath({json: obj, path: path});
	if(!arr.length)
		return defval;
	return arr[0];
}

