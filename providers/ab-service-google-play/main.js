/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'X-GWT-Module-Base': 'https://play.google.com/apps/publish/gwt/',
	'User-Agent': 'Mozilla/5.0 (AnyBalance 7.0; WOW64; rv:22.0) Gecko/20100101 AnyBalance/22.0',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://play.google.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	checkEmpty(prefs.app_name, 'Enter application name!');
	
	var html = googleLogin(prefs);
	
	html = AnyBalance.requestGet(baseurl + 'apps/publish/', g_headers);
	
	var devAccJson = getParam(html, null, null, /"DeveloperConsoleAccounts":"(\{[\s\S]*?\]\})/i, [/\\"/g, '"']);
	if(!devAccJson) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти json');
	}
	
	devAccJson = getJson(devAccJson);
	
	var token = getParam(html, null, null, /"XsrfToken"[^{]+{[^:]+:\\"([\s\S]*?)\\"/i);
	
	// Если аккаунтов разработчика несколько, как у меня, нужно пройтись по всем
	
	var developerAccounts = [];
	
	for(var i = 0; i < devAccJson['1'].length; i++) {
		var curr = devAccJson['1'][i];
		
		var dev_acc = curr[1];
		var dev_acc_name = curr[2];
		
		AnyBalance.trace('Developer account: ' + dev_acc_name);
		
		var app = findAppInDevAccount(baseurl, token, dev_acc, prefs);
		if(app) {
			AnyBalance.trace('Found app: ' + JSON.stringify(app));
			break;
		}
	}
	
	if(!app) {
		throw new AnyBalance.Error('Can`t find application with name ' + prefs.app_name);
	}
	
	var appName = app.name;
	
	var result = {success: true};
	
	getParam((dev_acc_name || '') + ': ' + appName, result, '__tariff');
	// СР. ОЦЕНКА 
	getParam((app[3][3] || '0') + '', result, 'rating', null, replaceTagsAndSpaces, parseBalance);
	// ВСЕГО оценок
	getParam((app[3][2] || '0') + '', result, 'rating_total', null, replaceTagsAndSpaces, parseBalance);
	// Активные юзеры
	getParam((app[3][7] || '0') + '', result, 'active_users', null, replaceTagsAndSpaces, parseBalance);
	// Всего юзеров
	getParam((app[3][5] || '0') + '', result, 'total_users', null, replaceTagsAndSpaces, parseBalance);
	// СБОИ И ANR
	getParam((app[3][4] || '0') + '', result, 'errors_total', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function findAppInDevAccount(baseurl, token, dev_acc, prefs) {
	var p = {
		"method":"fetchIndex",
		"params":{},
		"xsrf":token
	}
	
	html = AnyBalance.requestPost(baseurl + 'apps/publish/androidapps?dev_acc=' + dev_acc, JSON.stringify(p), {
		Referer: baseurl + 'apps/publish/androidapps?dev_acc=' + dev_acc,
		'Content-Type': 'application/javascript; charset=UTF-8',
		'Accept': '*/*',
		'X-GWT-Module-Base': 'https://ssl.gstatic.com/play-apps-publisher-rapid/fox/1616e8a4cbaff4be8ee2b17dfbe1b49f/fox/gwt/',
		'X-GWT-Permutation': 'BD57F32BF4E06A7C0E6648164809C806',
	});
	
	var json = getJsonEval(html);
	
	if(!json.result) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t find result in response json!');
	}
	
	token = json.xsrf;
	
	var apps = json.result['1'], app;
	if(apps) {
		for(var i =0; i < apps.length; i++) {
			var currentApp = apps[i];
			
			var appName = currentApp[3];
			var id = currentApp[2];                                                                         
			if(new RegExp(prefs.app_name, 'i').test(appName)
			    || new RegExp(prefs.app_name, 'i').test(id)) {
				
				html = AnyBalance.requestPost(baseurl + 'apps/publish/androidapps?dev_acc=' + dev_acc, JSON.stringify({
					"method":"fetchAppListStatsData",
					"params":{},
					"xsrf":token
				}), {
					Referer: baseurl + 'apps/publish/androidapps?dev_acc=' + dev_acc,
					'Content-Type': 'application/javascript; charset=UTF-8',
					'Accept': '*/*',
					'X-GWT-Module-Base': 'https://ssl.gstatic.com/play-apps-publisher-rapid/fox/1616e8a4cbaff4be8ee2b17dfbe1b49f/fox/gwt/',
					'X-GWT-Permutation': 'BD57F32BF4E06A7C0E6648164809C806',
				});
	
				var json = getJsonEval(html);
				app = json.result[1].filter(function(a) { return a[2] == id })[0];
				if(app)
					app.name = appName;
				//AnyBalance.trace(JSON.stringify(app));
				break;
			}
		}
	}
	
	return app;
}