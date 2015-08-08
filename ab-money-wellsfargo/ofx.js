function OFX(){

	function ofx2xml(ofx){
        var xml = ofx.replace(/>\s+</g, '><')
            .replace(/\s+</g, '<')
            .replace(/>\s+/g, '>')
            .replace(/<([A-Z0-9_]*)+\.+([A-Z0-9_]*)>([^<]+)/g, '<\$1\$2>\$3' )
            .replace(/<(\w+?)>([^<]+)/g, '<\$1>\$2</\$1>');
		return xml;
	}

	function parseHeader(header){
        var response = {};
		
		header = ofxData[0].split(/\r|\n/);
        
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
        
		var x2js = new X2JS();
		var 

	        parser.parseString(ofxToXML(ofx), function(error, object){
          if (error) {
            return callback(error);
          }
        
          response.body = object;
          return callback(null, response);
        });
		
	}

	return {
		ofx2xml: ofx2xml,
		ofx2json: ofx2json
	}
}