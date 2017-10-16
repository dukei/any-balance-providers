/*
	AnyBalance adapter to convert result from excerpt to row
*/

/*
	Setting traverse callback example:

	//Возвращаем транзакцию, находящуюся в середине, например.
	adapter.setTraverseCallbacks({"cards.transactions": function(prop, path){ return prop[Math.floor(prop.length/2)] }});

	options: {
		//Вызывать shouldProcess для каждого ID, даже если предыдущий уже вернул true
		shouldProcessMultipleCalls: true|{counter: true}
	}
*/

function NAdapter(countersMap, shouldProcess, options){
	var availableCounters = {};
	var originalIsAvailable = AnyBalance.isAvailable;
	if(!options)
		options = {};
	var traverseCallbacks = {};

	function isRequired(c){
		return /^!/.test(c);
	}

	function strip(c){
		return c.replace(/^[^\w]+/g, '');
	}

	for(var c in countersMap){
		if(isRequired(c) || isAvailable(c)){
			var cnew = countersMap[c];
			if(!isArray(cnew))
				cnew = [cnew];
			//Если у нас массив задан счетчиков, то все надо сделать требуемыми
			for(var i=0; i<cnew.length; ++i){
				var cnew1 = cnew[i];
				do{
					availableCounters[cnew1] = true;
					cnew1 = cnew1.indexOf('.') >= 0 ? cnew1.replace(/\.[^.]*$/, '') : null;
				}while(cnew1 !== null);
			}
		}
	}

	var productIds = {};
	AnyBalance.shouldProcess = function(counter, info){
		var multipleCalls = options.shouldProcessMultipleCalls;
		multipleCalls = typeof(multipleCalls) == 'object' ? multipleCalls[counter] : multipleCalls;
		if(!multipleCalls && productIds[counter])
			return info.__id == productIds[counter];
		var should = shouldProcess(counter, info);
		if(should)
			productIds[counter] = info.__id;
		return should;
	}

	function wasProcessed(counter){
		return productIds[counter];
	}

	function setTraverseCallbacks(callbacks){
		for(var path in callbacks){
			traverseCallbacks[path] = callbacks[path];
		}
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

	function traverseProperty(prop, path){
		if(traverseCallbacks[path])
			return traverseCallbacks[path](prop, path);

		if(isArray(prop)){
			prop = traverseArray(prop, path);
		}
		return prop;
	}

	function findEntityById(arr, id){
		//Находим entity с нужным __id
		return arr.reduce(function(previousValue, currentValue){
			if(!previousValue){
				if(currentValue.__id == id)
					return currentValue;
			}
			return previousValue;
		}, null);
	}

	function traverseArray(prop, path){
		if(productIds[path] && prop[0] && prop[0].__id){
			//Находим entity с нужным __id
			return findEntityById(prop, productIds[path]);
		}else{
			return prop[0];
		}
	}

	function traverse(json, path){
		var props = path.split(/\./g);
		var prop;
		for(var i=0; i<props.length; ++i){
			prop = json[props[i]];
			path = props.slice(0, i+1).join('.');
			prop = traverseProperty(prop, path);
			if(!isset(prop) || prop === null)
				 break;
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
				if(c != '__forceAvailable' && (isRequired(c) || isAvailable(c))){
					var cnew = countersMap[c];
					if(!isArray(cnew))
						cnew = [cnew];
					//Если у нас массив задан, то ищем первое дефайнед значение
					for(var i=0; i<cnew.length; ++i){
						var val = traverse(json, cnew[i]);
						if(isset(val)){
							result[strip(c)] = val;
							break;
						}
					}
				}
			}

			return result;
		}, 

		envelope: function(func){
			return function(){
				return __exec(func, arguments);
			}
		},

		traverse: traverse,

		wasProcessed: wasProcessed,
		setTraverseCallbacks: setTraverseCallbacks,
		findEntityById: findEntityById
	};
}
