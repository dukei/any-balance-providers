/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov & Dmitry Kochin
*/
var headers = {
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
	'Connection': 'keep-alive'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.kyivstar.ua/";

	var html = loginSite(baseurl);
	
	var result = {success: true};
	getParam(html, result, 'balance', /(?:Текущий баланс|Поточний баланс|Current balance):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /(?:Бонусный баланс|Бонусний баланс|Bonuses)[\s\S]*?>\s*(?:Баланс|Balance):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /(?:Особовий рахунок|Лицевой счет|Account):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'licschet', /(?:Статус послуги «Домашній Інтернет»|Статус услуги «Домашний Интернет»|The state of service «Home Internet»):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /(?:Тарифный пакет|Тарифний пакет|Rate package|Тарифний план|Тарифный план|Rate Plan):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}