/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.kyivstar.ua/";
	AnyBalance.trace('Connecting to ' + baseurl);

	var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do');
	var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);

	AnyBalance.trace('Token = ' + token[1]);

	html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
		isSubmitted: "true",
		"org.apache.struts.taglib.html.TOKEN": token[1],
		user: prefs.login,
		password: prefs.password
	});

	var matches = html.match(/<td class="redError">([\s\S]*?)<\/td>/i);
	if (matches) {
		throw new AnyBalance.Error(matches[1]);
	}

	AnyBalance.trace('Successfully connected');

	var result = {
		success: true
	};

	//Баланс
	if (AnyBalance.isAvailable('balance')) {
		if (matches = /Поточний баланс:[\s\S]*?<b>(.*?)</.exec(html)) {
			result.balance = parseFloat(matches[1]);
		}
	}

	//Домашний Интернет, бонусы
	if (AnyBalance.isAvailable('bonuses')) {
		if (matches = /Баланс:[\s\S]*?<b>(.*?)</.exec(html)) {
			result.bonuses = parseInt(matches[1]);
		}
	}

	AnyBalance.setResult(result);
}