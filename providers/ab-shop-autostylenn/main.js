/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://autostylenn.ru/';
//	AnyBalance.setDefaultCharset('koi8-r');
	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl)

	AnyBalance.trace("searching for loginform")
	var loginform = getParam(info, null, null, /<form [^>]*name="login"[^>]*>[\s\S]*<input [^>]* value="login"([^>]*)>/i, replaceTagsAndSpaces, null);
	AnyBalance.trace("parse: " + loginform)
	if ( loginform ) {
		AnyBalance.trace("login form found")
		var tocken = getParam(info, null, null, /<form [^>]*name="login"[^>]*>[\s\S]*<input [^>]*com_user[^>]*>\s*<input [^>]*login[^>]*>\s*<input [^>]*return[^>]*>\s*<input [^>]*name=\"([^>]*?)\"[^>]*>/i, replaceTagsAndSpaces, null);

		var params = {
			path:'/index.php',
			URL:'http://autostylenn.ru/index.php',
			username:prefs.userv,
			passwd:prefs.passv,
			remember:'no',
			option:'com_user',
			task:'login',
			'return':'Lw==',
		}
		params[tocken] = 1

		info = AnyBalance.requestPost(baseurl, params);
	}
	// Проверяем успешный ли вход

	AnyBalance.trace("searching for loginform")
	loginform = getParam(info, null, null, /<form [^>]*name="login"[^>]*>[\s\S]*<input [^>]* value="logout"([^>]*)>/i, replaceTagsAndSpaces, null);
	AnyBalance.trace("parse: " + loginform)
	if ( loginform )
		AnyBalance.trace("logged in")
	else
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

	var result = {success: true};
	var strArea = getParam(info, null, null, /<table [^>]*class='balance_tbl'[^>]*>[^>]*>[^>]*>[^>]*>([\s\S]*?)<\/table>/i, null, null);
	AnyBalance.trace(strArea)


	getParam(strArea, result, 'owner', /^([\s\S]*?)<\/a/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(strArea, result, 'active', /<tr>[^>]*>Активные заказы:[^>]*><td [^>]*class ='m_cell'[^>]*>([^<.]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(strArea, result, 'balance', /<tr>[^>]*>На счету:[^>]*><td [^>]*class ='m_cell'[^>]*>([^<.]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(strArea, result, 'debt', /<tr>[^>]*>Долг по заказам:[^>]*><td [^>]*class ='m_cell'[^>]*>([^<.]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.trace("order num to search: " + prefs.order_num)
	if (prefs.order_num ){
		AnyBalance.trace("order number is set, searching")
		info = AnyBalance.requestPost(baseurl + 'index.php?option=com_ordhist&Itemid=5',
		{
			period:'100500',
			quantity:'3'
		})
		
		strArea = getParam(info, null, null, /<table [^>]*class="macrotable"[^>]*>([\s\S]*?)<\/table>/i, null, null);
                var matches = strArea.match(/<tr>(.*?)<\/tr>/ig)
		AnyBalance.trace("count of orders table: " + matches.length)
		if ( matches.length > 1 ){
        		for (var i = 0; i < matches.length; ++i) {
//				AnyBalance.trace("order " + i + ": " + matches[i])
				var num = getParam(matches[i], null, null, /Заказ № (\d*)/i, null, null);
				if ( num == prefs.order_num ) {
					getParam(matches[i], result, 'order_summary', /<tr>(.*)<\/tr>/i, null, null);
					getParam(matches[i], result, 'order_data', /<br>от (.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
					getParam(matches[i], result, 'order_datearrive', /<\/div>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
					getParam(matches[i], result, 'order_status', /<\/div>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
					break
				}
			}
		}
	}


	AnyBalance.setResult(result);
};