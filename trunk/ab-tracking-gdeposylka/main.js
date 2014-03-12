/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.track_id, 'Введите номер почтового отправления!');
	
	var baseurl = "http://gdeposylka.ru/";
	var html = AnyBalance.requestGet(baseurl + prefs.track_id);
	
	var error = getParam(html, null, null, [/<div class="errorBox"[^>]*>([\s\S]*?)<\/div>/i, /<span class="error"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};
	var days = getParam(html, null, null, /"parcelin-days"(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, parseBalance);
	
	var table = getParam(html, null, null, /class="parcelin-table"([\s\S]*?)<\/table>/i);
	if(!table)
		throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте");
	
	getParam(table, result, 'geo', /class="city"[^>]*>([\s\S]*?)<\/div>/i, [/Неизвестное местоположение/i, '', replaceTagsAndSpaces]);
	
	var status = getParam(table, null, null, /parcel-info_mod"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	var date = getParam(table, null, null, /parcelin-received-date"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateW);
	
	getParam(status, result, 'status');
	getParam(date, result, 'date');
	getParam(days, result, 'days');
	
	// Фисксим <b>undefined</b><br/>\n<small>NaN/NaN/NaN NaN:NaN</small>: в пути 0 дн.
	if(AnyBalance.isAvailable('fulltext')){
		if(status && date && (days > 0)) {
			result.fulltext = '<b>' + status + '</b><br/>\n' + '<small>' + getDateString(date) + '</small> в пути ' + days + ' дн.';
		} else {
			result.fulltext = 'Информация недоступна.'
		}
	}
	
	AnyBalance.setResult(result);
}

function numSize(num, size) {
    var str = num + '';
    if (str.length < size) {
        for (var i = str.length; i < size; ++i) {
            str = '0' + str;
        }
    }
    return str;
}

function getDateString(dt) {
    if (typeof dt != 'object') 
		dt = new Date(dt);
    return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + " " + dt.getHours() + ':' + dt.getMinutes();
}

/** Парсит дату из такого вида: 27 июля 2013 без использования сторонних библиотек, результат в мс */
function parseDateW(str){
	var year = new Date().getFullYear();
	
	AnyBalance.trace('Trying to parse date from ' + str);
	return getParam(str, null, null, null, [ 
		/\D*(?:январ(?:я|ь)|янв|january|jan)\D*/i, '.01.' + year + ' ', 
		/\D*(?:феврал(?:я|ь)|фев|febrary|feb)\D*/i, '.02.' + year + ' ', 
		/\D*(?:марта|март|мар|march|mar)\D*/i, '.03.' + year + ' ', 
		/\D*(?:апрел(?:я|ь)|апр|april|apr)\D*/i, '.04.' + year + ' ', 
		/\D*(?:ма(?:я|й)|may)\D*/i, '.05.' + year + ' ', 
		/\D*(?:июн(?:я|ь)|июн|june|jun)\D*/i, '.06.' + year + ' ', 
		/\D*(?:июл(?:я|ь)|июл|july|jul)\D*/i, '.07.' + year + ' ', 
		/\D*(?:августа|август|авг|august|aug)\D*/i, '.08.' + year + ' ', 
		/\D*(?:сентябр(?:я|ь)|сен|september|sep)\D*/i, '.09.' + year + ' ', 
		/\D*(?:октябр(?:я|ь)|окт|october|oct)\D*/i, '.10.' + year + ' ', 
		/\D*(?:ноябр(?:я|ь)|ноя|november|nov)\D*/i, '.11.' + year + ' ', 
		/\D*(?:декабр(?:я|ь)|dec|december|dec)\D*/i, '.12.'], parseDate);
}