/**
Тест для library.js
*/

function main() {
	var result = {success: true};
	// Тестируем декод
	getParam('<title>&#1057;&#1080;&#1089;&#1090;&#1077;&#1084;&#1072; &#1089;&#1072;&#1084;&#1086;&#1086;&#1073;&#1089;&#1083;&#1091;&#1078;&#1080;&#1074;&#1072;&#1085;&#1080;&#1103;</title>', result, 'title', /<title>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.trace(result.title == 'Система самообслуживания' ? 'Проверяем функцию декода... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.title);
	// Тестируем парсинг баланса
	getParam('Текущий баланс: <b>1,000,555,48</b>', result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	AnyBalance.trace(result.balance == 1000555.48 ? 'Проверяем функцию parseBalance... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance);
	getParam('Текущий баланс: <b>.48</b>', result, 'balance_bad', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	AnyBalance.trace(result.balance_bad == 0.48 ? 'Проверяем функцию parseBalance с противными значениями типа (.48)... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance_bad);
	// Суммируем
	sumParam('Текущий баланс: <b>1,000,000,00</b>Текущий баланс: <b>1,000,000,00</b>Текущий баланс: <b>1,000,000,00</b>', result, 'balance_sum', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	AnyBalance.trace(result.balance_sum == 3000000.00 ? 'Проверяем функцию sumParam и aggregate_sum... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance_sum);
	// Выбираем минимальное
	sumParam('Текущий баланс: <b>1,00</b>Текущий баланс: <b>2,00</b>Текущий баланс: <b>3,00</b>', result, 'balance_min', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
	AnyBalance.trace(result.balance_min == 1.00 ? 'Проверяем функцию sumParam и aggregate_min... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance_min);
	// Тестируем трафик
	getParam('Остаток трафика: <b>24 гб</b>', result, 'traf_gb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_gb == 24*1024 ? 'Проверяем функцию parseTraffic в гигабайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_gb);
	getParam('Остаток трафика: <b>1 024 мб</b>', result, 'traf_mb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_mb == 1024 ? 'Проверяем функцию parseTraffic в мегабайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_mb);
	getParam('Остаток трафика: <b>2 048 кб</b>', result, 'traf_kb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_kb == 2 ? 'Проверяем функцию parseTraffic в килобайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_kb);
	// Тестируем parseDateWord
	AnyBalance.trace('Проверяем функцию parseDateWord... проверьте правильность парсинга дат!');
	var months = ['янв', 'jan', 'январь', 'января', 'февраль', 'февраля','март', 'марта','апрель', 'апреля','май', 'мая','июнь', 'июня','июль', 'июля','август', 'августа','сентября', 'сентябрь','октября', 'октябрь','ноября', 'ноябрь','декабря', 'декабрь'];
	for (i = 0; i < months.length; i++) {
		var date = parseDateWord('11 ' + months[i] + ' 2013');
	}
	var prefs = AnyBalance.getPreferences();
	
	
	
	
	
	AnyBalance.trace('Проверяем функцию createFormParams...');
	
	var params = createFormParams(formParamsHtml, function(params, str, name, value) {
		if (name == 'ULOGIN') 
			return 'TEST_LOGIN';

		return value;
	});	
	
	if(params.CHANNEL == 'WWW' && params.CHANNELTYPE == 'COMMON' && params.PREFIX == '' && params.P_ISOC_ID == '' && params.SESSION_ID == '' && params.ULOGIN == 'TEST_LOGIN')
		AnyBalance.trace('createFormParams все сделала правильно, она молодец :)');
	else 
		AnyBalance.trace('createFormParams что-то не правильно разобрала, проверьте код! ' + JSON.stringify(params));

	//checkEmpty(prefs.s, 'checkEmpty работает нормально!');

	/*getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);*/

	AnyBalance.setResult(result);
}

var formParamsHtml = '<table class="block" border="0" cellspacing="0" cellpadding="0" align="center">\
<tr>\
<td>\
<div id="divInfo" class="group-info">&#1044;&#1083;&#1103; &#1086;&#1087;&#1088;&#1077;&#1076;&#1077;&#1083;&#1077;&#1085;&#1080;&#1103; &#1088;&#1077;&#1075;&#1080;&#1086;&#1085;&#1072; &#1074;&#1074;&#1077;&#1076;&#1080;&#1090;&#1077; &#1042;&#1072;&#1096; &#1085;&#1086;&#1084;&#1077;&#1088; &#1090;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085;&#1072;.</div>\
</td>\
</tr>\
<tr>\
<td align="center" valign="middle">\
<noscript>\
<div class="group-info">\
<div class="attention">\
<strong>&#1044;&#1083;&#1103; &#1074;&#1093;&#1086;&#1076;&#1072; &#1074; &#1089;&#1080;&#1089;&#1090;&#1077;&#1084;&#1091; &#1074;&#1082;&#1083;&#1102;&#1095;&#1080;&#1090;&#1077; JavaScript.</strong>\
</div>\
</div>\
</noscript>\
<div id="divMessage" style="display: none;"></div>\
</td>\
</tr>\
<tr>\
<td valign="middle">\
<div id="main_container" style="display: none; width:auto!important;">\
<form id="LOGIN_FORM" name="LOGIN_FORM" method="POST" onsubmit="return uapLoginFormCheck(this);">\
<input id="SESSION_ID" type="hidden" name="SESSION_ID" value=""><input id="CHANNEL" type="hidden" name="CHANNEL" value="WWW"><input type="hidden" name="P_ISOC_ID" value=""><input id="CHANNELTYPE" type="hidden" name="CHANNELTYPE" value="COMMON"><input id="pathId" type="hidden" value="/ps/scc/php/"><input id="PREFIX" type="hidden" name="PREFIX"><input type="hidden" id="MAIN_FORM_NAME" value="LOGIN_FORM"><input type="hidden" id="P_USER_LANG_ID" value="1"><input type="hidden" id="P_FLAG_MULTYLANG" value="0">\
<div class="group-input">\
<table border="0" cellpadding="3" cellspacing="0">\
<colgroup>\
<col width="180">\
<col width="150">\
<col width="170">\
</colgroup>\
<tbody>\
<tr>\
<td height="5" colspan="3"></td>\
</tr>\
<tr class="grid-row">\
<td align="right">\
<div>\
<strong>&#1053;&#1086;&#1084;&#1077;&#1088; &#1090;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085;&#1072;:</strong>\
</div>\
</td><td><input type="text" id="LOGIN" name="ULOGIN" class="input_text" value="" autocomplete="on"></td><td>\
<div xmlns:xalan="http://xml.apache.org/xalan" class="field-error-message" id="LOGIN-ErrorMessage" field_id="LOGIN">&nbsp;\
  </div>\
</td>\
</tr>\
<tr>\
<td></td><td colspan="2">\
<div style="margin-top: -5px;">\
<div>\
<strong class="login_example">&#1053;&#1072;&#1087;&#1088;&#1080;&#1084;&#1077;&#1088;, 9261110505</strong>\
</div>\
</div>\
</td>\
</tr>\
</tbody>\
</table>\
</div>\
<table cellpadding="0" cellspacing="0" border="0" width="100%">\
<tr>\
<td align="right"><input xmlns:xalan="http://xml.apache.org/xalan" class="button_forward" onmouseover="$(this).addClass("button_forward-hover")" onmouseout="$(this).removeClass("button_forward-hover")" value="&#1042;&#1086;&#1081;&#1090;&#1080;" type="submit" id="submitBtnId" style=""></td>\
</tr>\
</table>\
</form>\
</div>\
</td>\
</tr>\
</table>';