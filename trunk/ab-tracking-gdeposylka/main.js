/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта gdeposylka.ru

Сайт оператора: http://gdeposylka.ru
Личный кабинет: http://gdeposylka.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

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
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth()+1, 2) + '/' + dt.getFullYear() + " " + dt.getHours() + ':' + dt.getMinutes();
}

function parseDate(str){
	AnyBalance.trace('Parsing date: ' + str);
  var matches = /(\d+)[^\d](\d+)[^\d](\d+)\s+(?:(\d+):(\d+))?/.exec(str);
  var time = 0;
  if(matches){
	time = (new Date(+matches[3], matches[2]-1, +matches[1], +matches[4], +matches[5])).getTime();
  }
  return time;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
	AnyBalance.trace('Connecting to gdeposylka...');
	
	var prefs = AnyBalance.getPreferences();
	var id = prefs.track_id; //Код отправления, введенный пользователем
	var origin = prefs.track_origin; //Тип отправления

	var baseurl = "http://gdeposylka.ru/";
	var html = AnyBalance.requestPost(baseurl);
	var token = getParam(html, null, null, /name="token" value="([^"]*)"/i);
	
	var html = AnyBalance.requestPost(baseurl, {
		token: token,
		track_origin: origin,
		track_id: id
	});
	
	var error = getParam(html, null, null, /<div class="errorBox"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	error = getParam(html, null, null, /<span class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};
	
	AnyBalance.trace('trying to find status');
	var table = getParam(html, null, null, /<td\s+class="infopane"([\s\S]*?)<\/td>/i);
	if(!table)
		throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте");

	var status = getParam(table, null, null, /Статус:.*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	var date = getParam(table, null, null, /Дата:.*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	var days = getParam(table, null, null, /Время в пути:\s*(\d+)/i, null, parseFloat);

	if(AnyBalance.isAvailable('status'))
		result.status = status;
	if(AnyBalance.isAvailable('date'))
		result.date = date;
	if(AnyBalance.isAvailable('days'))
		result.days = days;

	if(AnyBalance.isAvailable('fulltext')){
		result.fulltext = '<b>' + status + '</b><br/>\n' + 
			'<small>' + getDateString(date) + '</small>: в пути ' + days + ' дн.';
	}

	AnyBalance.setResult(result);
}
