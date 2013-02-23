/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статистика прохождения международных почтовых отправлений с сайтов ГдеПосылка.ру и sms-track.ru.

*/

function getParam(html, result, param, regexp, replaces, parser) {
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

function getValue(result,counter,url) {
	if(AnyBalance.isAvailable(counter)) {
		var html = AnyBalance.requestGet(url);
		
		var regexp;
		if(counter.substr(0,2)=='gp') regexp=new RegExp('<tr>\\s+<th class="">Среднее:</th>\\s+<th class="days" title="">\\d+</th>\\s+<th class="">&nbsp;</th>\\s+<th class="days" title="">(\\d+)</th>\\s+<th class="">&nbsp;</th>\\s+<th class="days" title="">\\d+</th>\\s+<th class="">&nbsp;</th>\\s+<th class="days" title="">\\d+</th>\\s+<th>&nbsp;</th>\\s+<th class="days">\\d+</th>\\s+</tr>');
		
		else regexp=new RegExp('<div id="line1"[^>]+>(?:<div[^>]+>.+?</div>){5}(?:<div[^>]+>(.+?)</div>).+</div>');
		
		getParam(html, result, counter, regexp, null, parseInt);
	}
}

function main() {
	var result = {success: true};

	getValue(result,'gp_hkru_export_import','http://gdeposylka.ru/stat/hk/ru?sm=EXPORT&vm=a');
	getValue(result,'gp_cnru_export_import','http://gdeposylka.ru/stat/cn/ru?sm=EXPORT&vm=a');
	getValue(result,'gp_usru_export_import','http://gdeposylka.ru/stat/us/ru?sm=EXPORT&vm=a');
	getValue(result,'gp_gbru_export_import','http://gdeposylka.ru/stat/gb/ru?sm=EXPORT&vm=a');

	getValue(result,'st_hkru_export_import','http://sms-track.ru/stat/HK-RU');
	getValue(result,'st_cnru_export_import','http://sms-track.ru/stat/CN-RU');
	getValue(result,'st_usru_export_import','http://sms-track.ru/stat/US-RU');
	getValue(result,'st_gbru_export_import','http://sms-track.ru/stat/GB-RU');

	AnyBalance.setResult(result);
}
