function main(){
	AnyBalance.trace('Connecting to service guide...');
	
	var session = AnyBalance.requestPost('https://moscowsg.megafon.ru/ps/scc/php/check.php?CHANNEL=WWW',
			{LOGIN: g_preferences.login, PASSWORD: g_preferences.password});
	
	AnyBalance.trace('Got result from service guide: ' + session);
	
	var result = {success: true};
	
	var matches;
	if(matches = session.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
		AnyBalance.trace('Got error from sg: ' + matches[1]);
		//Случилась ошибка, может быть мы можем даже увидеть её описание
		if(matches = session.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
			AnyBalance.trace('Got error message from sg: ' + matches[1]);
			throw new AnyBalance.Error(matches[1]);
		}
		AnyBalance.trace('Got unknown error from sg');
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
	if(!(matches = session.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
		throw new AnyBalance.Error('Не удалось получить сессию', true); //Странный ответ, может, можно переконнектиться потом
	}
	
	var sessionid = matches[1];
	var text = AnyBalance.requestPost('https://moscowsg.megafon.ru/SCWWW/ACCOUNT_INFO',
			{CHANNEL: 'WWW', SESSION_ID: sessionid});
	
	if(AnyBalance.isAvailable('balance')){
		if(matches = text.match(/<div class="balance_[\w_]*good td_def">([-\d\.]+)[^<]*<\/div>/i)){
			var balance = parseFloat(matches[1]);
			result.balance = balance;
		}
	}
	
	
	//Текущий тарифный план
	if(matches = text.match(/&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:[\s\S]*?<nobr>(.*?)<\/nobr>/i)){
    		var tariff = html_entity_decode(matches[1]);
    		result.__tariff = tariff; //Special variable, not counter
	}
	
	
	//Бонус 1 - полчаса бесплатно
	if(AnyBalance.isAvailable(['mins_total','mins_left'])){
		if(matches = text.match(
				/&#1041;&#1086;&#1085;&#1091;&#1089; 1 \- &#1087;&#1086;&#1083;&#1095;&#1072;&#1089;&#1072; &#1074; &#1087;&#1086;&#1076;&#1072;&#1088;&#1086;&#1082;[\s\S]*?<tr[\s\S]*?<div class="td_def">(\d+):(\d+)&nbsp;[\s\S]*?<div class="td_def">(\d+):(\d+)&nbsp;/i)){
			var mins_total = parseInt(matches[1])*60 + parseInt(matches[2]);
			var mins_left = parseInt(matches[3])*60 + parseInt(matches[4]);
			
			if(AnyBalance.isAvailable('mins_total'))
				result.mins_total = mins_total;
			if(AnyBalance.isAvailable('mins_left'))
				result.mins_left = mins_left;
		}
	}
	
	if(AnyBalance.isAvailable(['internet_total','internet_cur', 'internet_left'])){
		text = AnyBalance.requestGet('https://moscowsg.megafon.ru/SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=3.');
		if(matches = text.match(/<a class="gupLink" href="EXT_SYSTEM_PROXY_FORM\?([^"]*)"/i)){
			text = AnyBalance.requestGet('https://moscowsg.megafon.ru/SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?' + matches[1].replace(/&amp;/g, '&'));
			
			if(AnyBalance.isAvailable('internet_total'))
				if(matches = text.match(/title="ALL_VOLUME">([\d\.\-]+)</i))
					result.internet_total = parseFloat(matches[1]);
			if(AnyBalance.isAvailable('internet_cur'))
				if(matches = text.match(/title="CUR_VOLUME">([\d\.\-]+)</i))
					result.internet_cur = parseFloat(matches[1]);
			if(AnyBalance.isAvailable('internet_left'))
				if(matches = text.match(/title="LAST_VOLUME">([\d\.\-]+)</i))
					result.internet_left = parseFloat(matches[1]);
		}
	}
	
	AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
