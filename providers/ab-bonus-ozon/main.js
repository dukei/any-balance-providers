/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	Pragma: 'no-cache',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/3.2+442',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://api.ozon.ru/";
	var baseurlPartner = "https://ows.ozon.ru/";

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'OAuth/v1/auth/token', {
		grant_type:	'anonymous',
		client_id:	'androidapp',
		client_secret:	'MaiNNqA859bnMqw'
	}, g_headers);
	var json = getJson(html);

	g_headers.Authorization = json.token_type + ' ' + json.access_token;

	html = AnyBalance.requestGet(baseurl + 'user/v5/reg/check?login=' + encodeURIComponent(prefs.login), g_headers);
	json = getJson(html);

	if(json.status != 'found'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Логин не найден.', null, true);
	}

	html = AnyBalance.requestPost(baseurl + 'OAuth/v1/auth/token', {
		grant_type:	'password',
		client_id:	'androidapp',
		client_secret:	'MaiNNqA859bnMqw',
		userName:	prefs.login,
		password:	prefs.password,
	}, g_headers);
	var json = getJson(html);

	if(!json.access_token){
		if(json.error === 'access_denied')
			throw new AnyBalance.Error('Неправильный пароль', null, true);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var access_token = json.access_token;
	g_headers.Authorization = json.token_type + ' ' + access_token;

	var result = {success: true};
	
	if (isAvailable(['balance', 'blocked', 'available', 'bonus'])) {
		html = AnyBalance.requestGet(baseurlPartner + 'PartnerService/ClientService/GetClientAccountEntryInformation/?' + createUrlEncodedParams({
			login: 'androidapp',
			password: 'MaiNNqA859bnMqw',
			partnerClientId: access_token
		}), g_headers);

		json = getJson(html);
		
		getParam(json.ClientAccountEntryInformationForWeb.Current, result, 'balance');
		getParam(json.ClientAccountEntryInformationForWeb.Blocked, result, 'blocked');
		getParam(json.ClientAccountEntryInformationForWeb.Accessible, result, 'available');
		getParam(json.ClientAccountEntryInformationForWeb.Score, result, 'bonus');
	}
	
	var orders = 0;
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		html = AnyBalance.requestGet(baseurlPartner + 'PartnerService/OrderService/OrdersGet/?' + createUrlEncodedParams({
			login: 'androidapp',
			password: 'MaiNNqA859bnMqw',
			partnerClientId: access_token
		}), g_headers);

		json = getJson(html);

		if(json.OrderDetails && json.OrderDetails.length){
			var order = json.OrderDetails[0];

			getParam(order.Summ, result, 'order_sum');
			getParam(order.State, result, 'state');
			getParam(order.Number, result, 'ticket');

			if(AnyBalance.isAvailable('weight')){
				html = AnyBalance.requestGet(baseurl + 'order/v1/order/' + encodeURIComponent(order.Number), g_headers);
				json = getJson(html);

				for(var i=0; i<json.postings.length; ++i){
					sumParam(json.postings[i].weight, result, 'weight');
				}
			}
		}
	}

	result.__tariff = prefs.login;
	
	AnyBalance.setResult(result);
}
