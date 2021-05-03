
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection': 'keep-alive',
	clientType: 'WEB',
	operatorType: 'TELE2',
	'content-type': 'application/json'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.password, 'Введите пароль!');
	prefs.login='7'+prefs.login.replace(/([^\d]*)/g,'').substr(-9);
	if (!/\d{10}/i.test(prefs.login)) throw new AnyBalance.Error(
		'Номер телефона должен быть без пробелов и разделителей, в формате 707XXXXXXX или 747XXXXXXX!');

	var baseurl = "https://beta.tele2.kz/graphql";
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestPost('https://tele2.kz/apigw/v1/auth/oauth/token', JSON.stringify({
		username: prefs.login,
		password: prefs.password,
		grant_type: "msisdn_password"
		}), addHeaders({
		Authorization:'Basic SU9TOg==',
		}));
	var json=getJson(html);
	token=json.access_token;
	if (!json.access_token)
		throw new AnyBalance.Error('Ошибка авторизции',null,true);


	html = AnyBalance.requestPost('https://beta.tele2.kz/graphql', JSON.stringify({"operationName": "TariffQuery","variables": {"tariffNamespace": "tele.profile.mainPage","mainActionNamespace": "tele.profile.mainPage.myTariff.blocks.actions","titleActionNamespace": "tele.profile.mainPage.myTariff.blocks.title","platform": "web"},"query": "fragment LocalizableComponentFragment on component_localizables {\n id\n code\n type {\n type\n __typename\n }\n string\n image {\n key: slug\n imageUrl: image\n alt: name\n __typename\n }\n __typename\n}\n\nfragment LocalizableActionFragment on localizable_namespaces {\n id\n namespace\n props: _localizables_namespaces_list(platforms: {type: \"in:web,all\"}) {\n code\n type {\n type\n __typename\n }\n string\n image {\n key: slug\n imageUrl: image\n alt: name\n __typename\n }\n link {\n route {\n route\n __typename\n }\n params {\n value\n param: param_link {\n key: param\n __typename\n }\n __typename\n }\n __typename\n }\n boolean\n __typename\n }\n __typename\n}\n\nfragment MainResourceFragment on limits_and_prices {\n id\n billingId: billing_id\n price: balance_price\n balancePrice: balance_price\n currentValue: current_value\n resource {\n billingType: type_billing {\n type\n __typename\n }\n __typename\n }\n unit {\n unit\n name\n nameMain: name_main\n code\n __typename\n }\n originAmount: origin_amount\n origin_type\n originUnitPrice: origin_unit_price\n exchange_price\n origin_amount\n nextWriteOff: origin_expiration_date\n resource {\n id\n shortName: short_name\n typeBilling: type_billing {\n type\n __typename\n }\n shortName: short_name\n __typename\n }\n __typename\n}\n\nquery TariffQuery($tariffNamespace: String!, $mainActionNamespace: String!, $titleActionNamespace: String!, $platform: String!) {\n profile: Profile {\n id: msisdn\n balance\n tariff {\n id\n name\n price\n nextWriteOff: next_write_off\n periodicity {\n id\n name\n __typename\n }\n exchangeable\n actions(namespace: $mainActionNamespace, platform: $platform) {\n ...LocalizableActionFragment\n __typename\n }\n titleActions: actions(namespace: $titleActionNamespace, platform: $platform) {\n ...LocalizableActionFragment\n __typename\n }\n displayTemplates: display_template(namespace: $tariffNamespace) {\n ...LocalizableComponentFragment\n __typename\n }\n mainResources: balances_and_prices(\n main_resource: \"true\"\n _sort: \"display_priority\"\n _size: 3\n ) {\n ...MainResourceFragment\n displayTemplates: display_template(namespace: $tariffNamespace) {\n ...LocalizableComponentFragment\n __typename\n }\n __typename\n }\n __typename\n }\n __typename\n }\n}\n"}), 
	addHeaders({
		Referer: baseurl + 'login',
                Authorization: 'Bearer '+token
	}));
	AnyBalance.trace(html);
	var json=getJson(html);
        json=json.data.profile;

	// Получаем данные о балансе
	var result = {
		success: true
	};

	getParam(json.balance, result, 'balance');
	getParam(json.id, result, 'phone');
        json=json.tariff;
	getParam(json.name, result, '__tariff');
	getParam(json.price, result, 'price');
	if (prefs.show_amount) result.periodicityname='/'+json.periodicity.name, 
	getParam(json.nextWriteOff, result, 'nextWriteOff',null,null,parseDate);

	json=json.mainResources;
	var origin_amount={sms:0,mms:0,minute:0,internet_trafic:0,internet_trafic_night:0};
	json.map(bonus=>sumDiscount(result,bonus.resource.shortName,bonus.unit.name,bonus.currentValue,bonus.exchange_price*bonus.origin_amount,origin_amount));
	if (prefs.show_amount){
		result.internet_trafic_left_units=(origin_amount.internet_trafic?'/'+origin_amount.internet_trafic:'');
		result.internet_trafic_night_left_units=(origin_amount.internet_trafic_night?'/'+origin_amount.internet_trafic_night:'');
		result.sms_left_units=(origin_amount.sms?'/'+origin_amount.sms:'');
		result.mms_left_units=(origin_amount.mms?'/'+origin_amount.mms:'');
		result.min_left_units=(origin_amount.minute?'/'+origin_amount.minute:'');
	}
	AnyBalance.setResult(result);
}

function sumDiscount(result, name, units, value, value_max,origin_amount) {
	var bigname = name + units;

	AnyBalance.trace('Найдено ' + name + ' ' + value + ' ' + units);
	if (/шт|sms|смс/i.test(bigname)) {
		sumParam(value + '', result, 'sms_left', null, null, parseBalance, aggregate_sum);
		origin_amount.sms+=value_max;
	} else if (/mms|ммс/i.test(bigname)) {
		sumParam(value + '', result, 'mms_left', null, null, parseBalance, aggregate_sum);
                origin_amount.mms+=value_max;
	} else if (/минут|min/i.test(bigname)) {
		sumParam(value + '', result, 'min_left', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
                origin_amount.minute+=value_max;
	} else if (/[гкмgkm][бb]/i.test(bigname) || /интернет/i.test(name)) {
		var night = /ноч/i.test(bigname) ? '_night' : '';
		sumParam(value + units, result, 'internet_trafic' + night, null, null, parseTraffic, aggregate_sum);
                origin_amount['internet_trafic' + night]+=parseTraffic(value_max+units);
	} else {
		AnyBalance.trace('Неизвестная опция: ' + name);
	}
}
