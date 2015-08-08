function OFX(){

	function validateOfxXML(ofx){
        var xml = ofx.replace(/>\s+</g, '><')
            .replace(/\s+</g, '<')
            .replace(/>\s+/g, '>')
            .replace(/<([A-Z0-9_]*)+\.+([A-Z0-9_]*)>([^<]+)/g, '<\$1\$2>\$3' )
            .replace(/<(\w+?)>([^<]+)/g, '<\$1>\$2</\$1>');
		return xml;
	}

	function parseHeader(header){
        var response = {};
		
		header = header.split(/\r|\n/);
        
        for (var i=0; i<header.length; ++i) {
            var attributes = header[i].split(/:/,2);
            
            if (attributes[0]) {
            	response[attributes[0]] = attributes[1];
            }
        }

		return response;
	}

	function ofx2json(ofx){
        if (ofx.indexOf('<OFX>') < 0) {
        	throw new AnyBalance.Error('Not a valid OFX document.');
        }
        
        var ofxData = ofx.split('<OFX>', 2);
        var ofx = '<OFX>' + ofxData[1];
        var response = {};
        
        response.header = parseHeader(ofxData[0]);
        var xml = validateOfxXML(ofx);

        response.body = parseOfxXML(xml);
        return response;
	}

	function parseOfxXML(xml){
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
        	if(!parent.value)
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
            info.value = uq(s);
        });
        
        parser.parse(xml);
    	return resultObject.OFX;

	}

	return {
		ofx2json: ofx2json
	}
}