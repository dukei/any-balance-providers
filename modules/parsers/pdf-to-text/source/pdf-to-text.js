function PdfToText(){
	var baseurl = 'https://pdftotext.com/';

	function randomString() {
    	for (var t = "0123456789abcdefghiklmnopqrstuvwxyz", e = 16, i = "", n = 0; e > n; n++) {
        	var a = Math.floor(Math.random() * t.length);
        	i += t.substring(a, a + 1)
    	}
    	return i
	}

	var guid = function() {
        var e = 0;
        return function(t) {
            var n = (new Date).getTime().toString(32), i;
            for (i = 0; 5 > i; i++)
                n += Math.floor(65535 * Math.random()).toString(32);
            return (t || "o_") + n + (e++).toString(32)
        }
    }();

    function uploadFile(sessionID, base64pdf, filename){
    	if(!filename) filename = 'doc.pdf';
	    var html = requestPostMultipart(baseurl + 'upload/' + sessionID, {
	    	name: filename,
	    	id: guid(),
	    	file: {
	    		attributes: [
	    			['name', 'file'],
	    			['filename', filename]
	    	    ],
	    	    subheaders: {'Content-Type': 'application/pdf'},
	    	    value: '%PDF_FILE_CONTENTS%'
	        }
	    },  addHeaders({Referer: baseurl}), function(url, body, headers){
	    	var parts = body.split('%PDF_FILE_CONTENTS%');

	    	//Формируем из шаблона бинарное тело
	        var words = new CryptoJS.lib.WordArray.init();
    		var part1 = CryptoJS.enc.Utf8.parse(parts[0]);
		    var part2 = CryptoJS.enc.Utf8.parse(parts[1]);
		    var file = CryptoJS.enc.Base64.parse(base64pdf);
		    words.concat(part1).concat(file).concat(part2);

		    return AnyBalance.requestPost(url, CryptoJS.enc.Base64.stringify(words), headers, { options: { REQUEST_CHARSET: 'base64' } });
	    });
	    	    	
		var json = getJson(html);
		if(!json.data){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not upload PDF!');
		}
			
		return json;
    }

    function callApiSimple(verb, sessionID, id){
    	var html = AnyBalance.requestGet(baseurl + verb + '/' + sessionID + '/' + id + '?rnd=' + Math.random(), {
    		Referer: baseurl,
    		'X-Requested-With': 'XMLHttpRequest'
    	});

    	var json = getJson(html);
    	if(json.status == 'error')
    		throw new AnyBalance.Error(json.details);
    	if(!json.status){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Unknown error on ' + verb);
    	}

    	return json;
    }

    function doConvert(sessionID, id){
    	return callApiSimple('convert', sessionID, id);
    }

    function getStatus(sessionID, id){
    	return callApiSimple('status', sessionID, id);
    }

    function download(sessionID, id, filename){
    	var html = AnyBalance.requestGet(baseurl + 'download/' + sessionID + '/' + id + '/' + filename, addHeaders({Referer: baseurl}));
    	return html;
    }

	function convert(base64pdf){
	    var sessionID = randomString();

	    var json = uploadFile(sessionID, base64pdf);
	    var id = json.id;
	    doConvert(sessionID, id);

	    var max_tries = 25;
	    for(var i=0; i<max_tries; ++i){
	    	AnyBalance.sleep(2000);
	    	json = getStatus(sessionID, id);
	    	AnyBalance.trace('Try #' + (i+1) + ': ' + JSON.stringify(json));
	    	if(json.status == 'success'){
	    		return download(sessionID, id, json.convert_result);
	    	}
	    }

	    throw new AnyBalance.Error('Timeout waiting for PDF conversion');
	}

	return {
		convert: convert
	}
}