/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для уфимского интернет-провайдера Ufanet

Сайт оператора: http://ufanet.ru/
Личный кабинет: https://my.ufanet.ru/

Отлаживается отладчиком параметры:
__dbg:true, - без этого будет падать
__dbgCab:'old' - определяем кабинет
*/
var g_headers ={}
function encodeURIComponent1251 (str) {
	var transAnsiAjaxSys = [];
	for (var i = 0x410; i <= 0x44F; i++)
		transAnsiAjaxSys[i] = i - 0x350; // А-Яа-я
		
	transAnsiAjaxSys[0x401] = 0xA8;    // Ё
	transAnsiAjaxSys[0x451] = 0xB8;    // ё

	var ret = [];
	// Составляем массив кодов символов, попутно переводим кириллицу
	for (var i = 0; i < str.length; i++) {
		var n = str.charCodeAt(i);
		if (typeof transAnsiAjaxSys[n] != 'undefined')
			n = transAnsiAjaxSys[n];
		if (n <= 0xFF)
			ret.push(n);
	}
	return escape(String.fromCharCode.apply(null, ret));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(prefs.licschet && !/^\d{5,}$/.test(prefs.licschet))
        throw new AnyBalance.Error('Укажите цифры номера лицевого счета, по которому вы хотите получить информацию, или не указывайте ничего, чтобы получить информацию по первому лицевому счету.');

    var baseurl = 'https://my.ufanet.ru/';
    var oldbaseurl = 'https://oldlk.ufanet.ru/';
    //https://bill.ufanet.ru/client/index.html старница статистики
	if(prefs.cab == 'old') {
		AnyBalance.trace('Запросим старый кабинет');
		var html = AnyBalance.requestPost(oldbaseurl + 'login', {
			city: (prefs.city ? prefs.city : 'ufa'),
			contract:encodeURIComponent1251(prefs.login),
			password:prefs.password,
                        authType: 'login_password'
		});
		AnyBalance.setDefaultCharset('windows-1251');
		
		AnyBalance.trace('Попали в старый кабинет, обратите внимание, в старом кабинете игнорируется настройка № договора');
		if(!/Выход/i.test(html)){
			var error = getParam(html, null, null, /<h2>ОШИБКА:([\s\S]*?)<\/li/, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
		}
		// http://stat1.ufanet.ru/bgbilling/webexecuter?action=ShowBalance&mid=contract&contractId=488711
		var result = {success: true};
		getParam(html, result, 'balance', /Баланс:<\/span>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'licschet', /Лицевой счет:<\/span>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'adress', /Адрес:<\/span>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'fio', /panel-body[\s\S]*?<h5[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		var table=getParam(html, null, null, /<table[\s\S]*?Услуга[\s\S]*?(<tbody[\s\S]*?<\/table>)/i, null, html_entity_decode);
		var servise=table.match(/<tr>[\s\S]*?<td>([\s\S]*?)<\/td>/ig).join(',').replace(/\r?\n/g,'');
		var dates=table.match(/\((\d{1,2}\s[а-я]+\s\d{4}\s\d\d:\d\d)\)/g).toString().match(/\d{1,2}\s[а-я]+\s\d{4}/g);
		getParam(parseDateWord(dates.sort(function(a,b) { return parseDateWord(a)-parseDateWord(b)})[0]),result,'daysleft');
		servise=getParam(servise, null, null, null, replaceTagsAndSpaces, html_entity_decode).replace(/\s,/g,',');
		result.__tariff=servise;
	} else {
		function html_to_json(func){
			var html=func();
			if (AnyBalance.getLastStatusCode()==401){
                          AnyBalance.trace('Доступ запрещен');
			  if (resfresh_token && refreshtoken()){
			  	var html=func();
			  }else{
			  	if (loginNew()) var html=func();
			  }
			}
			if(!/"error_message":null/i.test(html)||!/"status":"ok"/i.test(html)){
				AnyBalance.trace(html);			
				var error = getJson(html).error_message;
				if(error)
					throw new AnyBalance.Error(error);
				throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
			}
        		return getJson(html);
		}

		var AppKey='VHCOMpfkso3Ke2YQNOT7';
		AnyBalance.trace('Запросим новый кабинет');
		var token=AnyBalance.getData('token');
		var resfresh_token=AnyBalance.getData('resfresh_token');
		function loginNew(){
			AnyBalance.trace('Логинимся');
			var html = AnyBalance.requestPost(baseurl + 'api/v0/token/', {
				login:prefs.login,
				password:prefs.password
			},{AppKey: AppKey});
			json=getJson(html);
			if (!json.detail.access) return false;
			AnyBalance.trace('Ищем токен авторизации');
			token=json.detail.access;
			resfresh_token=json.detail.refresh;
			return true;
		}
		function refreshtoken(){
			AnyBalance.trace('Попытка восстановть доступ');
			var html = AnyBalance.requestPost(baseurl + 'api/v0/token/refresh/', 
				{refresh:resfresh_token},{AppKey: AppKey});
			json=getJson(html);
			if (!json.detail.access) return false;
			AnyBalance.trace('Ищем токен авторизации');
			token=json.detail.access;
			resfresh_token=json.detail.refresh;
			return true;
		}
		var json = html_to_json(function (){return AnyBalance.requestGet(baseurl + 'api/v0/contract_info/get_all_contract/', 
			{AppKey: AppKey,
			Authorization: 'JWT '+token
		})});
		AnyBalance.trace('Ищем список лицевых счетов');
                if (json.status!="ok") throw new AnyBalance.Error('Не удалось получить список лицевых счетов.');
		if(prefs.licschet){
			var availableContracts = json.detail.contracts;
			if(!availableContracts)
				throw new AnyBalance.Error('Не удалось найти лицевой счет ' + prefs.licschet);
                        var contract = availableContracts.filter(function(s) { return prefs.licschet==s.title})[0]
			if(!contract){
				AnyBalance.trace('В кабинете не нашлось лицевого счета ' + prefs.licschet + ' среди ' + availableContracts.map(function(s) { return s.title }).join(', '));
				throw new AnyBalance.Error('Не удалось найти лицевой счет ' + prefs.licschet); 
			}
		}else{
			var contract = json.detail.contracts[0];
		}
		AnyBalance.trace('Выбран лицевой счет '+contract.title);
		var json = html_to_json(function (){return AnyBalance.requestPost(baseurl + 'api/v0/contract_info/get_contract_info/',
			JSON.stringify({contracts: [{contract_id: contract.contract_id, billing_id: contract.billing_id}]}),
			{AppKey: AppKey, Authorization: 'JWT '+token,Connection: 'keep-alive',Accept: 'application/json, text/plain, */*','Content-Type': 'application/json'})});


		var result = {success: true};
		result.balance=json.detail[0].balance.output_saldo;
		result.pay=json.detail[0].balance.recommended;
		result.licschet=json.detail[0].contract_title;
		if (json.detail[0].balance.expiry_date) result.daysleft=json.detail[0].balance.expiry_date*1000;
		result.status=json.detail[0].contract_status;
		result.fio=json.detail[0].customer_name;
		var tarif=json.detail[0].services;
		function onlyUnique(value, index, self) {return self.indexOf(value) === index}
		if (tarif) result.__tariff=tarif.filter(function(s) { return s.service_status=='Активен'}).map(function(s) { return s.tariff.title}).filter(onlyUnique).join(',');
                result.autopayment=json.detail[0].autopayment.title;
		json=json.detail[0].contract_address;
		result.adress=json.city+', '+json.street+', '+json.house+(json.flat>0?'/'+json.flat:'')
		AnyBalance.setData('token',token);
		AnyBalance.setData('resfresh_token',resfresh_token);
                AnyBalance.saveData();
	}

    AnyBalance.setResult(result);
}