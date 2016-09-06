
/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov & Dmitry Kochin
*/
var headers = {
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
	'Connection': 'keep-alive'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.kyivstar.ua/";

	var html = loginSite(baseurl);

	var result = {
		success: true
	};

	if(isLoggedInNew(html)){
		return processNew(result);
	}

	getParam(html, result, 'name',
		/(?:Фамилия|Прізвище|First\s+name)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	getParam(html, result, 'balance',
		/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
		parseBalance);

	getParam(html, result, ['currency', 'balance'],
		/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseCurrency);

	getParam(html, result, 'licschet',
		/(?:Лицевой\s+сч[её]т|Особовий\s+рахунок|Account:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, '__tariff',
		/(?:Тарифный\s+план|Тарифний\s+план|Rate\s+Plan)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, 'status',
		/(?:Статус\s+услуги|Статус\s+послуги|state\s+of\s+service)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, 'bonusValue',
		/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'bonusDate',
		/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, 'date_start',
		/(?:Дата\s+подключения|Дата\s+підключення|Connection\s+date):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate);

	getParam(html, result, 'phone',
		/(?:Номер\s+мобильного\s+телефона|Номер\s+мобільного\s+телефону|Mobile\s+phone\s+number):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function processNew(result){
	var baseurl = 'https://new.kyivstar.ua/ecare/';
	var html = AnyBalance.requestGet(baseurl, g_headers);

	var pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);

	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.balance"), result, 'balance', null, null, parseBalance);
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currencyName"), result, ['currency', 'balance']);
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.accountNumber"), result, 'licschet');

	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.servicePlan"), result, '__tariff');
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.subscriptionStatus"), result, 'status');
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currentSubscription.bonusBalance"), result, 'bonusValue', null, null, parseBalance);

//	getParam(html, result, 'bonusDate',
//		/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
//		replaceTagsAndSpaces);

//	getParam(html, result, 'date_start',
//		/(?:Дата\s+подключения|Дата\s+підключення|Connection\s+date):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
//		replaceTagsAndSpaces, parseDate);

	if(AnyBalance.isAvailable('name', 'phone')){
		html = AnyBalance.requestGet(baseurl + 'profileSettings', g_headers);
		pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	
	    var joinspace = create_aggregate_join(' ');

		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.firstName.value"), result, 'name', null, null, null, joinspace);
		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.middleName.value"), result, 'name', null, null, null, joinspace);
		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.lastName.value"), result, 'name', null, null, null, joinspace);

		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.contactPhone.value"), result, 'phone');
	}

	AnyBalance.setResult(result);
}
