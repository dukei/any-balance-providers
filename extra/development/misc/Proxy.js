//Работает только в файрфоксе пока
//Позволяет отследить обращения к объектам

var loc = {
	replace: function(str){
		console.log('replace: ' + str);
	}
}

function ProxyHandler(objectName, proxiedObject){
	return {
      "get": function (oTarget, sKey) {
      	if(sKey == '$$$proxiedObject')
      		return oTarget;

      	console.log('get ' + objectName + '.' + sKey + ': ' + oTarget[sKey]);

      	var tgt = oTarget[sKey];

      	var descriptor = Object.getOwnPropertyDescriptor(oTarget, sKey);
      	var unmodifiable = descriptor && !descriptor.configurable && !descriptor.writable;
      	//console.log('prop descriptor (' + objectName + '.' + sKey + '): ' + JSON.stringify(Object.getOwnPropertyDescriptor(oTarget, sKey)));
      	if(unmodifiable){
      		if(sKey == 'location')
      			return loc;
      		console.log(' ^-- get (unmodified) ' + objectName + '.' + sKey + ': ' + oTarget[sKey]);
      		return tgt; //proxy must report the same value for a non-writable, non-configurable property
      	}

      	if(typeof(tgt) == 'function'){
      		return function(){
      			console.log('called ' + objectName + '.' + sKey + '(' + JSON.stringify(arguments) + ')');
   				var args = arguments;

      			if(sKey == 'appendChild'){ //Have to unpack proxies
      				args = [];
      				for(var i=0; i<arguments.length; ++i){
      					var o = arguments[i];
      					if(o && typeof(o) == 'object' && o.$$$proxiedObject)
      						o = o.$$$proxiedObject;
      					args.push(o);
      				}
      			}
      			var val = tgt.apply(oTarget, args);
      			if(val && typeof(val) == 'object')
      				return new Proxy(val, new ProxyHandler(objectName + '.' + sKey + '#returnedObj'));
      			return val;
      		};
      	}else if(tgt && typeof(tgt) == 'object'){
      		return new Proxy(tgt, new ProxyHandler(objectName + '.' + sKey));
      	}else{
      		return tgt;
      	}
      },
      "set": function (oTarget, sKey, vValue) {
      	console.log('set ' + objectName + '.' + sKey + '=' + vValue);
      	oTarget[sKey] = vValue;
      },
      "deleteProperty": function (oTarget, sKey) {
      	console.log('delete ' + objectName + '.' + sKey);
      	delete oTarget[sKey];
      },
      "enumerate": function (oTarget, sKey) {
      	console.log('enumerate ' + objectName + '.' + sKey);
        return oTarget.keys();
      },
      "ownKeys": function (oTarget, sKey) {
      	console.log('ownKeys ' + objectName + '.' + sKey);
        return oTarget.getOwnPropertyNames ? oTarget.getOwnPropertyNames() : [];
      },
      "has": function (oTarget, sKey) {
      	console.log('has ' + objectName + '.' + sKey);
        return sKey in oTarget;
      },
      "defineProperty": function (oTarget, sKey, oDesc) {
      	console.log('define ' + objectName + '.' + sKey + ', ' + oDesc);
        return oTarget;
      },
      "getOwnPropertyDescriptor": function (oTarget, sKey) {
      	console.log('getOwnPropertyDescriptor ' + objectName + '.' + sKey + ', ' + oDesc);
      	return Object.getOwnPropertyDescriptor(oTarget, sKey);
      },
      "getPrototypeOf": function(oTarget){
      	console.log('getPrototypeOf');
      	return oTarget.getPrototypeOf();
      }
    }
}

var wProxy = new Proxy(window, new ProxyHandler('window'));