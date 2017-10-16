/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Отображает баланс и заработок за месяц на Appodeal.com для разработчиков.
Провайдер получает эти данные из кабинета. Для работы требуется указать в настройках логин и пароль.

Сайт партнерки: http://startapp.com/
*/

function main() {
	
	AnyBalance.setDefaultCharset("utf-8");
	
	var result={
        success: true
    };
    var prefs=AnyBalance.getPreferences();
    
  
    // AnyBalance.setAuthentication() не сработал, делаем свою аутенфикацию {
    var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}
	var headers = {
	  "Authorization": "Basic " + Base64.encode(prefs.login+":"+prefs.password)
	};
    //}
    

	
	//if(AnyBalance.setAuthentication(prefs.login, prefs.password, "")) {
		var data=AnyBalance.requestGet('http://www.appodeal.com/api/v2/stats_api',headers);
		AnyBalance.trace(data, null);
		var json=JSON.parse(data);
		if (json.status == 1) {
			data=AnyBalance.requestGet('http://www.appodeal.com/api/v2/get_balance?user_id=%5Buser_id%5D&api_key=%5Bapi_key%5D',headers);
			AnyBalance.trace(data, null);
			json=JSON.parse(data);
			if(json!=null && json.balance!=null) {
				result.balance=round(json.balance);
			} else {
				throw new AnyBalance.Error('Баланс недоступен');
			}
			
			if(AnyBalance.isAvailable('month')) {
				var date=new Date();
				data=AnyBalance.requestGet('http://www.appodeal.com/api/v2/stats_api?date_from='+date.getFullYear()+'-'+fillWithZero(date.getMonth()+1)+'-01&'+
																			'date_to='+date.getFullYear()+'-'+fillWithZero(date.getMonth()+1)+'-'+fillWithZero(date.getDate()),headers);
				AnyBalance.trace(data, null);
				json=JSON.parse(data);
				if(json!=null && json.task_id>0) {
					sleep(3000);
					data=AnyBalance.requestGet('http://www.appodeal.com/api/v2/output_result?task_id='+json.task_id,headers);
					AnyBalance.trace(data, null);
					json=JSON.parse(data);
					if(json!=null && json.data[0].revenue!=null) {
						result.month=round(json.data[0].revenue);
					} else {
						throw new AnyBalance.Error('Ошибка получения результатов задачи');
					}
				} else {
					throw new AnyBalance.Error('Ошибка создания задачи');
				}
			}
		} else {
			throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
		}
	//} else {
	//	throw new AnyBalance.Error('Ошибка авторизации: '+AnyBalance.getLastError());
	//}
	AnyBalance.setResult(result);
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}

function fillWithZero(value) {
	if(value<10) {
		value='0'+value;
	}
	return value;
}

function round(num) {
return Math.round(num * 100) / 100
}