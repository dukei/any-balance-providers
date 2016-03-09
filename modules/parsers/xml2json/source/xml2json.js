function Xml2Json(){

	function parse(xml){
        var obj = parseXML(xml);
        return obj;
	}

	function parseXML(xml){
        var parser = new EasySAXParser();

        var resultObject = {};
        var stack = [{name: null, value: resultObject}];

        parser.on('error', function (msg) {
            AnyBalance.trace(msg);
        });
        
        parser.on('startNode', function (elem, attr, uq, tagend, getStrNode) {
            var info = {name: elem, value: null};
            stack.push(info);
        });
        
        parser.on('endNode', function (elem, uq, tagstart, str) {
        	var info = stack[stack.length-1];
        	var parent = stack[stack.length-2];

            //Если у нас в значении строка из пробелов или пусто, то сделаем объект
			if(!parent.value
                || (typeof(parent.value) == 'string' && !parent.value.trim()))
        		parent.value = {};

        	if(parent.value.hasOwnProperty(info.name)){ //У нас уже есть это свойство
        		if(typeof(parent.value[info.name]) != 'object'){ //Simple value
        			AnyBalance.trace('Overwriting text node (' + info.name + '): ' + parent.value[info.name]);
        			parent.value[info.name] = info.value;
        		}else if(!isArray(parent.value[info.name])){ //Object
        			var obj = parent.value[info.name];
        			parent.value[info.name] = [obj, info.value];
        		}else{ //Array
        			parent.value[info.name].push(info.value);
        		}
        	}else{
        		parent.value[info.name] = info.value;
        	}
        	stack.pop();
        });
        
        parser.on('textNode', function (s, uq) {
        	var info = stack[stack.length-1];
            var text = uq(s);
            //Текст сохраняем только если он непустой или ранее в значение ничего не было записано
            if(info.value && text.trim())
                AnyBalance.trace('Overwriting value of tag ' + info.name + ' with text ' + text);
            if(!info.value || text.trim())
                info.value = text;
        });
        
        parser.parse(xml);
    	return resultObject;

	}

	return {
		parse: parse
	}
}