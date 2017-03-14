/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'Connection':'keep-alive',
};

function callAPI(verb, postParams){
	var baseurl = "https://lk.cinemapark.ru/crm/";
	var url = baseurl + verb;

	var params = {
		Request: postParams
	};

	if(!postParams.Source)
		postParams.Source = {"Id":"8826A963-5A08-4629-81C0-ED5FDEEC35DD","SecretKey":"1cnMsQftmIsAxsGm5ROl"};
    if(!postParams.Contact)
    	postParams.Contact = callAPI.Contact;
			
	if(postParams)
		method = 'POST';
	else
		postParams = '';

	html = AnyBalance.requestPost(url, 
		JSON.stringify(params), 
		addHeaders({'Content-Type': 'application/json; charset=utf-8'})
	);

	var json = getJson(html);
	return json;
}

function main(){
    AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var json = callAPI('LoginUser', {"Contact":{"Password":prefs.password,"Username":prefs.login},"AuthorizationType":"Username"});
    if(!json.LoginUserResult.Contact) {
    	var error = json.LoginUserResult.Message;
    	if(error)
    		throw new AnyBalance.Error(error, null, /авториз/i.test(error));
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина и пароля!');
	}
	callAPI.Contact = {Id: json.LoginUserResult.Contact.Id, SecretKey: json.LoginUserResult.Contact.SecretKey};

	json = callAPI('GetCardList', {OnlyActiveCard: true});

	var card = json.GetCardListResult.Cards[0];
	if(!card)
		throw new AnyBalance.Error('У вас нет ни одной карты');

    var result = {success: true};
    
	getParam(card.Category, result, 'stage');
	getParam(card.Category, result, '__tariff');
	getParam(card.CategoryPercent, result, 'discount');
	getParam(card.Number, result, 'num');
	getParam(card.State, result, 'status');
	getParam(card.CurrentBalance, result, 'balance');
	
    AnyBalance.setResult(result);
}