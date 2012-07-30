/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.kyivstar.ua/";
	var headers = {
		'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
		'Accept-Language':'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
		'Connection': 'keep-alive'
	};
  
	AnyBalance.trace('Connecting to ' + baseurl);

	var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', headers);
	var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);

	if(!token){
		throw new AnyBalance.Error('Can\'t get token');
	}
	
	AnyBalance.trace('Token = ' + token[1]);

	html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
		isSubmitted: "true",
		"org.apache.struts.taglib.html.TOKEN": token[1],
		user: prefs.login,
		password: prefs.password
	}, headers);

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