/*
	AnyBalance adapter to convert result from excerpt to row
*/
function NAdapter(countersMap, shouldProcess, options){
	var availableCounters = {};
	var originalIsAvailable = AnyBalance.isAvailable;
	if(!options)
		options = {};
	
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
			return info.__id == productIds[counter];
		var should = shouldProcess(counter, info);
		if(should)
			productIds[counter] = info.__id;
		return should;
	}

	function wasProcessed(counter){
		return !!productIds[counter];
	}

	function __isAvailable1(arrOrString){
	    if(!isArray(arrOrString))
	    	arrOrString = [arrOrString];
	    
	    for(var i=0; i<arrOrString.length; ++i){
	    	if(availableCounters[arrOrString[i]])
	    		return true;
	    	//Если мы не нашли простой счетчик, то о его присутствии надо спросить у оригинала
	    	if(options.autoSimpleCounters && isSimpleName(arrOrString[i]))
	    		return originalIsAvailable.call(AnyBalance, arrOrString[i]);
	    }
	    
	    return false;
	}

	function isSimpleName(name){
		return name.indexOf('.') < 0;
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
			if(isArray(prop)){
				var counter_name = props.slice(0, i).join('.');
				if(productIds[counter_name] && prop[0] && prop[0].__id){
					//Находим entity с нужным __id
					prop = prop.reduce(function(previousValue, currentValue){
						if(!previousValue){
							if(currentValue.__id == productIds[counter_name])
								return currentValue;
						}
						return previousValue;
					}, null);
				}else{
					prop = prop[0];
				}
			}
			if(!isset(prop) || prop === null)
				 prop;
			json = prop;
		}
		return prop;
	}

	function __exec(func, args){
		AnyBalance.isAvailable = __isAvailable;
		try{
			return func.apply(null, args);
		}finally{
			AnyBalance.isAvailable = originalIsAvailable;
		}
	}

	return {
		exec: __exec,

		convert: function(json){
			if(!json.success)
				return json;

			var result = {success: true};

			if(options.autoSimpleCounters){
				//Простые поля переписываем сразу
				for(var c in json){
					if(!availableCounters[c] && !isArray(json[c]))
						result[c] = json[c];
				}
			}

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
		},

		wasProcessed: wasProcessed
	};
}
