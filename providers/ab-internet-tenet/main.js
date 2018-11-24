/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у одесского оператора интернет Tenet

Сайт оператора: http://tenet.ua
Личный кабинет: https://stats.tenet.ua/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'] //Ну конечно же. Это интернет провайдер, надо быть очень безопасным...
	});
	
    var baseurl = "https://stats.tenet.ua/";

    var html = AnyBalance.requestGet(baseurl);

    var form = getParam(html, null, null, /<form[^>]+name="wwv_flow"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form, function(params, str, name, value){
        var id = getParam(str, null, null, /\bid="([^"]*)/i, replaceHtmlEntities);
        if(/^P101_/.test(name))
            return;
        if(name == 'p_request')
            return 'LOGIN';
        return value;
    }, true);

    var json = {
      "salt": getParam(form, /<input[^>]+value="([^"]*)[^>]*id="pSalt"/, replaceHtmlEntities),
      "pageItems": {
        "itemsToSubmit": [
          {
            "n": "P101_HASH",
            "v": ""
          },
          {
            "n": "P101_IP",
            "v": getParam(form, /<input[^>]+P101_IP[^>]+value="([^"]*)/, replaceHtmlEntities),
          },
          {
            "n": "P101_USERNAME",
            "v": prefs.login
          },
          {
            "n": "P101_PASSWORD",
            "v": prefs.password
          }
        ],
        "protected": getParam(form, /<input[^>]+id="pPageItemsProtected"[^>]*value="([^"]*)/, replaceHtmlEntities),
        "rowVersion": ""
      }
    };
    params = [["p_json", JSON.stringify(json)]].concat(params);

    html = AnyBalance.requestPost(baseurl + 'portal/wwv_flow.accept', params, {'Content-Type': 'application/x-www-form-urlencoded'});

    if(!/apex_authentication.logout/i.test(html)){
        var error = getElement(html, /<div[^>]*t-Alert-body/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол|credent/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(getElements(html, [/<span[^>]+t-Button-label/ig, /ЛС/i])[0], result, 'licschet', /<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
    getParam(getElements(html, [/<span[^>]+t-Button-label/ig, /баланс/i])[0], result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<dt[^>]*>\s*Статус ЛС[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
    sumParam(html, result, '__tariff', /<td[^>]+headers="AS_PKT_NAME"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, null, aggregate_join);
    getParam(html, result, 'spent', /<dt[^>]*>\s*Оказано услуг[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
