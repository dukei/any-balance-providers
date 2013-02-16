/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта http://en.4px.com

Сайт оператора: http://en.4px.com
Личный кабинет: http://en.4px.com
*/

function numSize(num, size){
  var str = num + '';
  if(str.length < size){
    for(var i=str.length; i<size; ++i){
	str = '0' + str;
    }
  }
  return str;
}

function getDateString(dt){
	if(typeof dt != 'object') dt = new Date(dt);
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth()+1, 2) + '/' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

var g_headers = {
	Accept:'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        Connection:'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function getMyPosylkaResult(prefs){
	AnyBalance.trace('Connecting to 4px...');
	var id = (prefs.track_id + '').toUpperCase(); //Код отправления, введенный пользователем

	var baseurl = "http://en.4px.com/index.php?";
	var html = AnyBalance.requestPost(baseurl + 'option=com_tracking4px', {
		'trackno':id
	}, addHeaders({Referer:baseurl}));

	var result = {success: true};

        var table = getParam(html, null, null, /class="tacking4px_header"[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i, [/<!--[\s\S]*?-->/g, '']);
        if(!table){
            throw new AnyBalance.Error('Could not find trajectory detailes');
        }
                                                                                
        var detailes_table = getParam(html, null, null, /class="tacking4px_header"(?:[\s\S]*?<table[^>]*>){2}([\s\S]*?)<\/table>/i, [/<!--[\s\S]*?-->/g, '']); //Таблица с историей
        if(!detailes_table)
            throw new AnyBalance.Error('Could not find tracking history');

        var trLastInfo = getParam(detailes_table, null, null, /(?:[\s\S]*?<tr[^>]*>){3}([\s\S]*?)<\/tr>/i); //третья строка
        if(!trLastInfo){
            throw new AnyBalance.Error('This tracking number is invalid or does not have info yet');
        }
        
        var tr = getParam(table, null, null, /(?:[\s\S]*?<tr[^>]*>){2}([\s\S]*?)<\/tr>/i); //вторая строка, текущий статус
        if(!tr){
            throw new AnyBalance.Error('Could not find detailes on this tracking numbers');
        }

        getParam(tr, result, 'track', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'dest', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){if(str) return html_entity_decode(str)});
        getParam(trLastInfo, result, 'date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
        getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'pod', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){if(str) return html_entity_decode(str)});

        if(AnyBalance.isAvailable('fulltext')){
            getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            var date = getParam(trLastInfo, null, null, /(?:<td[^>]*>[\s\S]*?){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
            var status = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	    result.fulltext = '<b>' + status + '</b><br/>\n' + 
			'<small>' + getDateString(date) + '</small>';
	}

        return result;
}

function main(){
	var prefs = AnyBalance.getPreferences();

        var result = getMyPosylkaResult(prefs);

	AnyBalance.setResult(result);
}
