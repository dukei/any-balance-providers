/*
	AnyBalance adapter to convert result from excerpt to row
*/
function NAdapter(countersMap, shouldProcess){
	var availableCounters = {};
	
	for(var c in countersMap){
		if(AnyBalance.isAvailable(c)){
			var cnew = countersMap[c];
			do{
				availableCounters[cnew] = true;
				cnew = cnew.indexOf('.') >= 0 ? cnew.replace(/\.[^.]*$/, '') : null;
			}while(cnew !== null);
		}
	}

	var productIds = {};
	AnyBalance.shouldProcess = function(counter, info){
		if(productIds[counter])
			return info.__id == g_productIds[counter];
		var should = shouldProcess(counter, info);
		if(should)
			productIds[counter] = info.__id;
		return should;
	}

	function __isAvailable1(arrOrString){
	    if(!isArray(arrOrString))
	    	arrOrString = [arrOrString];
	    
	    for(var i=0; i<arrOrString.length; ++i){
	    	if(availableCounters[arrOrString[i]])
	    		return true;
	    }
	    
	    return false;
	}

	function __isAvailable(strOrArray){
	    for(var i=0; i<arguments.length; ++i)
	    	if(__isAvailable1(arguments[i]))
	    		return true;
	    
	    return false;
	}

	function traverse(json, path){
		var props = path.split(/\./g);
		var prop;
		for(var i=0; i<props.length; ++i){
			prop = json[props[i]];
			if(isArray(prop))
				prop = prop[0];
			if(!isset(prop) || prop === null)
				return prop;
			json = prop;
		}
		return prop;
	}

	function __exec(func, args){
		var oldIsAvailable = AnyBalance.isAvailable;
		AnyBalance.isAvailable = __isAvailable;
		try{
			return func.apply(null, args);
		}finally{
			AnyBalance.isAvailable = oldIsAvailable;
		}
	}

	return {
		exec: __exec,

		convert: function(json){
			if(!json.success)
				return json;

			var result = {success: true};
			for(var c in countersMap){
				if(isAvailable([c]))
					result[c] = traverse(json, countersMap[c]);
			}

			return result;
		}, 

		envelope: function(func){
			return function(){
				return __exec(func, arguments);
			}
		}
	};
}
